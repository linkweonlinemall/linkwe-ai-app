"use server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { cleanAnswers, guideJourney, GUIDE_VERSION, type GuidePlan } from "@/lib/vendor/guided-creation/model";
import type { GuidedCreationPlan } from "@prisma/client";

async function vendorStore() {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") throw Error("Sign in to your vendor account.");
  const store = await prisma.store.findUnique({ where: { ownerId: session.userId }, select: { id: true } });
  if (!store) throw Error("Set up your store first.");
  return store.id;
}
function serialize(row: GuidedCreationPlan): GuidePlan {
  const answers = cleanAnswers(row.answers);
  const steps = guideJourney(answers).result?.steps ?? [];
  return { id: row.id, title: row.title, answers, checked: row.guideVersion === GUIDE_VERSION ? row.checked.filter(id => steps.some(s => s.id === id)) : [], version: row.version, guideVersion: row.guideVersion, updatedAt: row.updatedAt.toISOString() };
}
function validId(id: unknown): asserts id is string {
  if (typeof id !== "string" || !/^[a-z0-9-]{1,64}$/i.test(id)) throw Error("Choose a saved guide.");
}
export async function listCreationGuides(cursor?: string) {
  const storeId = await vendorStore();
  if (cursor) {
    validId(cursor);
    if (!await prisma.guidedCreationPlan.findFirst({ where: { id: cursor, storeId }, select: { id: true } })) throw Error("Reload your saved guides.");
  }
  const rows = await prisma.guidedCreationPlan.findMany({ where: { storeId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 21, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
  const visible = rows.slice(0, 20);
  return { plans: visible.map(serialize), nextCursor: rows.length > 20 ? visible.at(-1)!.id : null };
}
export async function getCreationGuide(id: string) {
  validId(id);
  const storeId = await vendorStore();
  const row = await prisma.guidedCreationPlan.findFirst({ where: { id, storeId } });
  if (!row) throw Error("This guide was not found in your store.");
  return serialize(row);
}
export async function startCreationGuide(title: string) {
  const storeId = await vendorStore();
  if (typeof title !== "string" || !title.trim() || title.trim().length > 100) throw Error("Give this guide a name of 1–100 characters.");
  const row = await prisma.guidedCreationPlan.create({ data: { storeId, title: title.trim(), answers: {}, guideVersion: GUIDE_VERSION } });
  return serialize(row);
}
export async function saveCreationGuide(input: { id: string; version: number; title: string; answers: unknown; checked: string[] }) {
  if (!input) throw Error("Choose a saved guide.");
  validId(input.id);
  const storeId = await vendorStore();
  if (!Number.isSafeInteger(input.version) || input.version < 1) throw Error("Reopen the guide before saving.");
  if (typeof input.title !== "string" || !input.title.trim() || input.title.trim().length > 100) throw Error("Give this guide a name of 1–100 characters.");
  const answers = cleanAnswers(input.answers);
  if (!Array.isArray(input.checked) || input.checked.length > 30 || input.checked.some(id => typeof id !== "string")) throw Error("Invalid checklist.");
  const steps = guideJourney(answers).result?.steps ?? [];
  if (input.checked.some(id => !steps.some(s => s.id === id))) throw Error("The checklist changed. Reopen the guide.");
  return prisma.$transaction(async tx => {
    const row = await tx.guidedCreationPlan.findFirst({ where: { id: input.id, storeId } });
    if (!row) throw Error("This guide was not found in your store.");
    const changed = JSON.stringify(cleanAnswers(row.answers)) !== JSON.stringify(answers) || row.guideVersion !== GUIDE_VERSION;
    const updated = await tx.guidedCreationPlan.updateMany({ where: { id: input.id, storeId, version: input.version }, data: { title: input.title.trim(), answers, checked: changed ? [] : [...new Set(input.checked)], version: { increment: 1 }, guideVersion: GUIDE_VERSION } });
    if (!updated.count) throw Error("This guide changed in another tab. Reopen it to keep the latest changes.");
    return serialize(await tx.guidedCreationPlan.findUniqueOrThrow({ where: { id: input.id } }));
  });
}
