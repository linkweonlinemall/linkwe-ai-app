import { Prisma, type StoreStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { RecordValidationError } from "@/lib/admin/record-validation";
import { importFields } from "./fields";
import { IMPORT_OPERATIONS, mapRow, rowTitle, type ImportBatchView, type ImportCommand, type ImportKind, type ImportResult, type Values } from "./model";
import { deleteImportRecord, findImportDuplicate, fingerprint, json, persistImportRecord, publicationErrors, readImportRecord, setImportLifecycle, validateDraft, type RecordSnapshot } from "./records";

export async function requireImportAdmin() {
  const session = await getSession();
  if (session?.role !== "ADMIN") throw new Error("Administrator access required.");
  return session;
}
export async function loadImportBatch(id: string): Promise<ImportBatchView> {
  await requireImportAdmin();
  const batch = await prisma.importBatch.findUnique({ where: { id }, include: { rows: { orderBy: { number: "asc" } }, assets: { orderBy: { createdAt: "asc" } }, changes: { orderBy: { createdAt: "desc" }, take: 200 } } });
  if (!batch) throw new Error("Import batch not found.");
  return JSON.parse(JSON.stringify(batch));
}
export function validateCommand(command: ImportCommand) {
  if (!command || !IMPORT_OPERATIONS.includes(command.operation)) throw new Error("Choose an available import action.");
  if (command.rowIds && (!Array.isArray(command.rowIds) || command.rowIds.length > 500 || command.rowIds.some(id => typeof id !== "string"))) throw new Error("Choose up to 500 rows.");
  if (command.patch && (typeof command.patch !== "object" || Array.isArray(command.patch) || JSON.stringify(command.patch).length > 150000)) throw new Error("This edit is too large.");
}
function friendlyError(e: unknown) {
  if (e instanceof Prisma.PrismaClientValidationError) return "The record could not be saved. Check the field values and try again.";
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return "A matching account, store or URL already exists. Refresh and retry; no records from this row were partly created.";
    if (e.code === "P2034") return "Another change happened at the same time. Refresh and retry this row.";
    if (e.code === "P2003") return "This record has linked activity and cannot be removed.";
    return "The row could not be saved. Check its fields and try again.";
  }
  return e instanceof Error ? e.message : "This row could not be saved.";
}
export async function executeImportCommand(batchId: string, command: ImportCommand): Promise<ImportResult[]> {
  const actor = await requireImportAdmin();
  validateCommand(command);
  const batch = await prisma.importBatch.findUniqueOrThrow({ where: { id: batchId } });
  const kind = batch.kind as ImportKind;
  if (command.operation === "invite") throw new Error("Invitations use the confirmed delivery action.");
  if (command.operation === "map") {
    const mapping = command.mapping || {};
    const fields = importFields(kind), headers = batch.headers as string[];
    if (Object.keys(mapping).some(h => !headers.includes(h)) || Object.values(mapping).some(t => typeof t !== "string" || (t && !fields.some(f => f.name === t)))) throw new Error("Choose valid columns and destination fields.");
    const used = Object.values(mapping).filter(Boolean);
    if (new Set(used).size !== used.length) throw new Error("Match each destination field once.");
    if (command.storeId && !(await prisma.store.findUnique({ where: { id: command.storeId } }))) throw new Error("Choose an existing store.");
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "ImportBatch" WHERE id = ${batchId} FOR UPDATE`;
      if (await tx.importRow.count({ where: { batchId, recordId: { not: null } } })) throw new Error("This batch already has linked records. Edit individual rows or start a new upload to change column matching.");
      const rows = await tx.importRow.findMany({ where: { batchId } });
      for (const row of rows) {
        if (command.versions?.[row.id] !== row.version) throw new Error("The batch changed. Refresh before matching columns again.");
        const mapped = mapRow(row.raw as Values, mapping, fields);
        await tx.importRow.update({ where: { id: row.id }, data: { values: json(mapped.values), errors: mapped.errors, state: Object.keys(mapped.errors).length ? "failed" : "ready", note: null, version: { increment: 1 } } });
      }
      await tx.importBatch.update({ where: { id: batchId }, data: { mapping, ...(command.storeId !== undefined ? { storeId: command.storeId } : {}) } });
      await tx.importChange.create({ data: { batchId, actorId: actor.userId, action: "map", summary: "Matched spreadsheet columns; all rows remain drafts." } });
    }, { timeout: 30000 });
    return [{ rowId: "", ok: true, message: "Column matching saved." }];
  }
  if (command.operation === "undo") {
    const change = await prisma.importChange.findFirst({ where: { id: command.changeId, batchId, undone: false } });
    if (!change?.rowId || !change.before || !change.after || ["delete", "invite", "undo"].includes(change.action)) throw new Error("This change cannot be undone. Deleted records and delivered invitations are retained in history.");
    const after = change.after as Values;
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "ImportRow" WHERE id = ${change.rowId!} FOR UPDATE`;
      const row = await tx.importRow.findUniqueOrThrow({ where: { id: change.rowId! } });
      const sameState = after.values && fingerprint(row.values) === fingerprint(after.values) && row.state === after.state && row.recordId === after.recordId;
      if (row.version !== after.version && !sameState) throw new Error("Undo newer changes first. This row has changed since that action.");
      const before = change.before as Values;
      const current = row.recordId ? await readImportRecord(tx, kind, row.recordId) : null;
      if (current && fingerprint(current) !== row.recordVersion) throw new Error("The live record changed elsewhere. Refresh and review it before editing.");
      let restored: RecordSnapshot | null = null;
      if (current && !before.recordId && row.createdRecord) await deleteImportRecord(tx, kind, row.recordId!, row.createdUserId);
      else if (current && before.snapshot) {
        const snapshot = before.snapshot as RecordSnapshot;
        await persistImportRecord(tx, kind, snapshot.values, batch.storeId, row.recordId!);
        if (kind === "vendor") await tx.store.update({ where: { id: row.recordId! }, data: { status: snapshot.status as StoreStatus } });
        else if (kind === "event") await tx.event.update({ where: { id: row.recordId! }, data: { isPublished: snapshot.isPublished, status: snapshot.status as "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED" } });
        else await tx.product.update({ where: { id: row.recordId! }, data: { isPublished: snapshot.isPublished, isArchived: snapshot.isArchived } });
        restored = await readImportRecord(tx, kind, row.recordId!);
      }
      await tx.importRow.update({ where: { id: row.id }, data: { values: json(before.values), state: String(before.state), recordId: before.recordId ? String(before.recordId) : null, createdRecord: before.createdRecord === true, recordVersion: restored ? fingerprint(restored) : before.recordVersion ? String(before.recordVersion) : null, errors: {}, note: "Change undone.", version: { increment: 1 } } });
      await tx.importChange.update({ where: { id: change.id }, data: { undone: true } });
      await tx.importChange.create({ data: { batchId, rowId: row.id, actorId: actor.userId, action: "undo", summary: `Undid ${change.action}: ${rowTitle(kind, row.values as Values)}` } });
    }, { isolationLevel: "Serializable", timeout: 20000 });
    return [{ rowId: change.rowId, ok: true, message: "Change undone." }];
  }
  const ids = [...new Set(command.rowIds || [])];
  if (!ids.length) throw new Error("Select at least one row.");
  const results: ImportResult[] = [];
  for (const rowId of ids) {
    try {
      const result = await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "ImportBatch" WHERE id = ${batchId} FOR SHARE`;
        await tx.$queryRaw`SELECT id FROM "ImportRow" WHERE id = ${rowId} FOR UPDATE`;
        const row = await tx.importRow.findFirst({ where: { id: rowId, batchId } });
        if (!row) throw new Error("This row is not in the selected batch.");
        if (command.versions?.[row.id] !== row.version) throw new Error("This row changed. Refresh before applying the action.");
        if (row.state === "removed") throw new Error("This row was removed. Start a new batch to create another record.");
        let values = row.values as Values, recordId = row.recordId, createdRecord = row.createdRecord, createdUserId = row.createdUserId, state = row.state, note = "";
        let draftErrors: Record<string, string> = {};
        let snapshot = recordId ? await readImportRecord(tx, kind, recordId) : null;
        const before = { values, recordId, createdRecord, state, recordVersion: row.recordVersion, snapshot };
        if (recordId && command.operation !== "refresh" && (!snapshot || fingerprint(snapshot) !== row.recordVersion)) throw new Error("This record changed outside the import workspace. Refresh this row to review its current details.");
        if (command.operation === "check") {
          values = validateDraft(kind, values);
          if (snapshot) note = "Checked the linked record. Missing publication details are listed below.";
          else {
            const required = kind === "vendor" ? ["name", ...(values.vendorId ? [] : ["email"])] : kind === "event" ? ["title", "startDate"] : ["name"];
            const missing = required.filter(key => !values[key]);
            if (missing.length) throw new RecordValidationError(Object.fromEntries(missing.map(key => [key, "Complete this field before importing. The row is saved in this batch."])));
            const duplicate = await findImportDuplicate(tx, kind, values, batch.storeId);
            note = duplicate ? "Existing record found. Import will skip it; no existing values will be overwritten." : "Ready to create as a draft. Publication details can be completed afterward.";
            state = "ready";
          }
        } else if (command.operation === "refresh") {
          if (!snapshot) throw new Error("There is no linked record to refresh.");
          values = snapshot.values; note = "Loaded the current saved record.";
        } else if (command.operation === "edit") {
          const patch = command.patch || {};
          if (Object.keys(patch).some(key => !importFields(kind).some(field => field.name === key))) throw new Error("This edit includes fields that cannot be changed in the import workspace.");
          const merged = { ...values, ...patch };
          if (!recordId || state === "skipped") {
            try { values = validateDraft(kind, merged); }
            catch (e) { if (!(e instanceof RecordValidationError)) throw e; values = merged; draftErrors = e.fields; }
          } else values = validateDraft(kind, merged);
          if (recordId && state !== "skipped") {
            const saved = await persistImportRecord(tx, kind, values, batch.storeId, recordId);
            snapshot = saved.snapshot; values = snapshot.values;
          }
          note = recordId && state !== "skipped" ? "Saved changes." : "Saved draft changes. Import or update the existing record when ready.";
          if (!recordId) state = "ready";
        } else if (command.operation === "import" || command.operation === "update_existing") {
          if (command.operation === "import" && recordId) return { rowId, ok: true, message: state === "skipped" ? "Existing record skipped." : "Already imported; nothing duplicated." };
          values = validateDraft(kind, values);
          const duplicate = recordId || await findImportDuplicate(tx, kind, values, batch.storeId);
          if (duplicate && command.operation === "import") {
            recordId = duplicate; snapshot = await readImportRecord(tx, kind, duplicate); state = "skipped"; note = "Existing record found and skipped. Select Update existing to apply your spreadsheet values.";
          } else {
            if (command.operation === "update_existing" && !duplicate) throw new Error("No existing record is linked. Import this row as a draft first.");
            if (duplicate && !recordId) throw new Error("Import first to link the matching record, then review its update.");
            const existingSnapshot = duplicate ? await readImportRecord(tx, kind, duplicate) : null;
            const merged = existingSnapshot ? { ...existingSnapshot.values, ...values } : values;
            const saved = await persistImportRecord(tx, kind, merged, batch.storeId, duplicate || undefined);
            recordId = saved.id; snapshot = saved.snapshot; values = snapshot.values; createdUserId ||= saved.createdUserId; createdRecord ||= !duplicate;
            state = duplicate ? "updated" : "created"; note = duplicate ? "Updated existing record." : "Created as a draft. No invitation was sent.";
          }
        } else if (command.operation === "delete") {
          if (recordId && !createdRecord) throw new Error("Batch cleanup only removes records created by this import. Existing records are protected.");
          if (recordId) await deleteImportRecord(tx, kind, recordId, createdUserId);
          recordId = null; snapshot = null; state = "removed"; note = "Removed this draft. Vendor accounts and import history are retained.";
        } else {
          if (!recordId) throw new Error("Import this row before changing publication.");
          if (state === "skipped") throw new Error("This existing record was skipped. Review and explicitly update it before changing publication here.");
          if (!["publish", "draft", "archive"].includes(command.operation)) throw new Error("Unsupported action.");
          await setImportLifecycle(tx, kind, recordId, command.operation as "publish" | "draft" | "archive");
          snapshot = await readImportRecord(tx, kind, recordId);
          state = command.operation === "publish" ? "published" : command.operation === "archive" ? "archived" : createdRecord ? "created" : "updated";
          note = command.operation === "publish" ? "Published." : command.operation === "archive" ? "Archived in this batch and hidden from the site." : "Saved as a draft.";
        }
        const readyErrors = snapshot && state !== "skipped" ? publicationErrors(kind, snapshot) : draftErrors;
        const saved = await tx.importRow.update({ where: { id: row.id }, data: { values: json(values), recordId, recordVersion: snapshot ? fingerprint(snapshot) : null, createdRecord, createdUserId, state, note, errors: json(readyErrors), version: { increment: 1 } } });
        await tx.importChange.create({ data: { batchId, rowId, actorId: actor.userId, action: command.operation, summary: `${command.operation}: ${rowTitle(kind, values)}`, before: json(before), after: json({ version: saved.version, values, recordId, state, createdRecord }) } });
        return { rowId, ok: true, message: note };
      }, { isolationLevel: "Serializable", timeout: 25000 });
      results.push(result);
    } catch (e) {
      const message = friendlyError(e);
      const fields = e instanceof RecordValidationError ? e.fields : { _row: message };
      // A stale client must never overwrite another editor's successful result.
      if (command.versions?.[rowId] != null) await prisma.importRow.updateMany({ where: { id: rowId, batchId, version: command.versions[rowId] }, data: { errors: fields, note: message, ...(command.operation === "import" ? { state: "failed" } : {}) } });
      results.push({ rowId, ok: false, message });
    }
  }
  return results;
}
