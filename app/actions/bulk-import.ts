"use server";
import { randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/uploads/upload";
import { importFields } from "@/lib/imports/fields";
import { parseImportFile, type ParsedSheet } from "@/lib/imports/parser";
import { executeImportCommand, loadImportBatch, requireImportAdmin, validateCommand } from "@/lib/imports/workspace";
import { IMPORT_KINDS, REVIEW_OPERATIONS, guessMapping, mapRow, rowTitle, type ImportCommand, type ImportKind, type ImportResult } from "@/lib/imports/model";
import { fingerprint, json, readImportRecord } from "@/lib/imports/records";

export async function getImportWorkspace() {
  await requireImportAdmin();
  const [batches, stores, vendors] = await Promise.all([
    prisma.importBatch.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, filename: true, kind: true, createdAt: true, _count: { select: { rows: true } } } }),
    prisma.store.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    prisma.user.findMany({ where: { role: "VENDOR", isActive: true, suspended: false }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, email: true } }),
  ]);
  return { vendors, batches: batches.map(b => ({ ...b, createdAt: b.createdAt.toISOString() })), stores, fields: Object.fromEntries(IMPORT_KINDS.map(kind => [kind, importFields(kind)])) };
}
export async function previewImportFile(data: FormData) {
  await requireImportAdmin();
  const file = data.get("file");
  if (!(file instanceof File)) throw new Error("Choose a spreadsheet to import.");
  return parseImportFile(file);
}
export async function createImportBatch(kind: ImportKind, filename: string, sheet: ParsedSheet, storeId: string | null) {
  const actor = await requireImportAdmin();
  if (!IMPORT_KINDS.includes(kind) || typeof filename !== "string" || !filename || filename.length > 250) throw new Error("Choose an import type and file.");
  if (!sheet || !Array.isArray(sheet.headers) || !Array.isArray(sheet.rows) || !sheet.rows.length || sheet.rows.length > 500 || sheet.headers.length > 120 || new Set(sheet.headers).size !== sheet.headers.length || sheet.headers.some(h => typeof h !== "string" || h.length > 200 || ["__proto__", "constructor", "prototype"].includes(h)) || JSON.stringify(sheet).length > 3000000) throw new Error("Use 1–500 rows and up to 120 uniquely named columns.");
  if (sheet.rows.some(row => !row || typeof row !== "object" || Array.isArray(row) || Object.keys(row).some(key => !sheet.headers.includes(key)))) throw new Error("The spreadsheet rows do not match its headings.");
  if (storeId && !(await prisma.store.findUnique({ where: { id: storeId } }))) throw new Error("Choose an existing store.");
  const fields = importFields(kind), mapping = guessMapping(sheet.headers, fields);
  const batch = await prisma.importBatch.create({ data: {
    actorId: actor.userId, kind, filename, sheet: String(sheet.name).slice(0, 200), headers: sheet.headers, mapping, storeId: kind === "vendor" ? null : storeId,
    rows: { create: sheet.rows.map((raw, index) => { const result = mapRow(raw, mapping, fields); return { number: index + 2, raw: json(raw), values: json(result.values), errors: result.errors, state: Object.keys(result.errors).length ? "failed" : "ready" }; }) },
    changes: { create: { actorId: actor.userId, action: "upload", summary: `${sheet.rows.length} spreadsheet rows saved for review. Nothing published or sent.` } },
  } });
  return loadImportBatch(batch.id);
}
export async function getImportBatch(id: string) { return loadImportBatch(id); }

export async function runImportCommand(batchId: string, command: ImportCommand) {
  await requireImportAdmin();
  validateCommand(command);
  if (REVIEW_OPERATIONS.includes(command.operation)) throw new Error("Review the affected records before applying this action.");
  const results = await executeImportCommand(batchId, command);
  revalidatePath("/dashboard/admin", "layout");
  revalidatePath("/dashboard/vendor/creation", "layout");
  revalidatePath("/", "layout");
  return results;
}
function signingKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("Action confirmation is unavailable until the server session secret is configured.");
  return new TextEncoder().encode(secret);
}
export async function prepareImportReview(batchId: string, command: ImportCommand) {
  const actor = await requireImportAdmin();
  validateCommand(command);
  if (!REVIEW_OPERATIONS.includes(command.operation)) throw new Error("This action does not need a review card.");
  const batch = await loadImportBatch(batchId);
  const rows = batch.rows.filter(row => command.rowIds?.includes(row.id));
  if (!rows.length || rows.length !== new Set(command.rowIds).size) throw new Error("Choose rows from this batch.");
  if (rows.some(row => command.versions?.[row.id] !== row.version)) throw new Error("The selected rows changed. Refresh and review again.");
  const token = await new SignJWT({ batchId, command }).setProtectedHeader({ alg: "HS256" }).setSubject(actor.userId).setAudience("linkwe-import-action").setIssuedAt().setExpirationTime("10m").sign(signingKey());
  return { token, operation: command.operation, rows: rows.map(row => ({ id: row.id, number: row.number, name: rowTitle(batch.kind, row.values), email: batch.kind === "vendor" ? String(row.values.email || "") : undefined })) };
}
async function deliverInvitations(batchId: string, command: ImportCommand): Promise<ImportResult[]> {
  const actor = await requireImportAdmin();
  const batch = await loadImportBatch(batchId);
  if (batch.kind !== "vendor") throw new Error("Invitations are for vendor accounts only.");
  const { resend, FROM_EMAIL, BASE_URL } = await import("@/lib/email/resend");
  const results: ImportResult[] = [];
  for (const id of [...new Set(command.rowIds || [])]) {
    try {
      const row = await prisma.importRow.findFirst({ where: { id, batchId } });
      if (!row || row.version !== command.versions?.[id]) throw new Error("The row changed. Review the invitation again.");
      if (row.invitationSentAt) { results.push({ rowId: id, ok: true, message: "Invitation already sent for this row." }); continue; }
      if (!row.recordId) throw new Error("Create the vendor and store before sending an invitation.");
      const snapshot = await readImportRecord(prisma, "vendor", row.recordId);
      if (!snapshot || fingerprint(snapshot) !== row.recordVersion) throw new Error("The vendor details changed. Refresh before sending an invitation.");
      const user = await prisma.user.findUniqueOrThrow({ where: { id: String(snapshot.values.vendorId) } });
      if (!user.isActive || user.suspended || user.role !== "VENDOR") throw new Error("Review the vendor’s account access first.");
      const token = randomBytes(32).toString("hex");
      // Claim a delivery before contacting the provider; concurrent confirmations cannot send twice.
      const claim = await prisma.importRow.updateMany({ where: { id, version: row.version, invitationSentAt: null }, data: { version: { increment: 1 }, note: "Sending account invitation…" } });
      if (!claim.count) throw new Error("Another invitation is already in progress. Refresh this row.");
      await prisma.user.update({ where: { id: user.id }, data: { resetToken: token, resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) } });
      const response = await resend.emails.send({ from: `LinkWe <${FROM_EMAIL}>`, to: user.email, subject: "Your LinkWe vendor account is ready", html: `<p>Your LinkWe vendor account is ready.</p><p><a href="${BASE_URL}/reset-password?token=${token}">Set your private password</a></p><p>This link expires in one hour. Your store remains a draft until it is published.</p>` });
      if (response.error) throw new Error(`Invitation was not delivered: ${response.error.message}`);
      await prisma.$transaction([
        prisma.importRow.update({ where: { id }, data: { invitationSentAt: new Date(), note: "Account invitation sent.", errors: {} } }),
        prisma.importChange.create({ data: { batchId, rowId: id, actorId: actor.userId, action: "invite", summary: `Sent account invitation to ${user.email}.` } }),
      ]);
      results.push({ rowId: id, ok: true, message: "Invitation sent." });
    } catch (e) { results.push({ rowId: id, ok: false, message: e instanceof Error ? e.message : "Invitation failed." }); }
  }
  return results;
}
export async function confirmImportReview(token: string, offset = 0) {
  const actor = await requireImportAdmin();
  const { payload } = await jwtVerify(token, signingKey(), { audience: "linkwe-import-action", algorithms: ["HS256"] });
  if (payload.sub !== actor.userId || typeof payload.batchId !== "string" || !payload.command) throw new Error("This confirmation expired or belongs to another session.");
  const command = payload.command as ImportCommand;
  validateCommand(command);
  if (!REVIEW_OPERATIONS.includes(command.operation)) throw new Error("Invalid confirmation action.");
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= (command.rowIds?.length || 0)) throw new Error("Invalid review page.");
  command.rowIds = command.rowIds!.slice(offset, offset + 10);
  const results = command.operation === "invite" ? await deliverInvitations(payload.batchId, command) : await executeImportCommand(payload.batchId, command);
  revalidatePath("/", "layout");
  return results;
}
export async function uploadImportPhoto(batchId: string, data: FormData) {
  await requireImportAdmin();
  if (!(await prisma.importBatch.findUnique({ where: { id: batchId } }))) throw new Error("Choose an import batch first.");
  const file = data.get("images");
  if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4 * 1024 * 1024 || !file.size) return { ok: false, error: "Choose JPG, PNG or WebP photos up to 4 MB after compression." };
  if (await prisma.importAsset.count({ where: { batchId } }) >= 1000) return { ok: false, error: "This batch already has 1,000 uploaded photos." };
  const url = await uploadFile(file, "gallery");
  const asset = await prisma.importAsset.create({ data: { batchId, name: file.name.slice(0, 250), url } });
  return { ok: true, url, asset };
}
