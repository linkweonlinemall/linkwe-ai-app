"use server";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export type CreationKind = "user" | "store" | "product" | "service" | "listing";

async function admin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    throw new Error("Administrator access required.");
}

export async function getCreationStudioOptions() {
  await admin();
  const [users, stores, products, listings] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, email: true, role: true },
    }),
    prisma.store.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, ownerId: true },
    }),
    prisma.product.findMany({
      take: 200,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        isService: true,
        store: { select: { name: true } },
      },
    }),
    prisma.listing.findMany({
      take: 200,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        type: true,
        store: { select: { name: true } },
      },
    }),
  ]);
  return { users, stores, products, listings };
}

// Legacy callers share the complete editor's validation and transaction path.
export async function createAdminRecord(
  kind: CreationKind,
  values: Record<string, string>,
) {
  const { getAdminRecordWorkspace, saveAdminEditableRecord } = await import(
    "@/app/actions/admin-records"
  );
  await admin();
  const workspace = await getAdminRecordWorkspace(kind, "new");
  if (!workspace) return { ok: false as const, error: "Choose a record type." };
  const defaults = Object.fromEntries(
    workspace.fields
      .filter((f) => f.value != null)
      .map((f) => [f.name, f.value]),
  );
  const input: Record<string, unknown> = { ...defaults, ...values };
  if (kind === "listing") {
    input.priceMinor = Math.round(Number(values.price || 0) * 100);
    delete input.price;
  }
  if (kind === "product" || kind === "service" || kind === "store")
    input.slug ||= String(values.name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const result = await saveAdminEditableRecord(kind, "new", input);
  return result.error
    ? { ok: false as const, error: result.error }
    : { ok: true as const, id: result.id, kind };
}
