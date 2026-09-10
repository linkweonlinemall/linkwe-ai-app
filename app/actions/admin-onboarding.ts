"use server";

import { randomBytes, randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { StoreStatus, UserRole } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

export type OnboardingRow = {
  fullName?: string; email?: string; phone?: string; password?: string;
  storeName?: string; storeSlug?: string; categoryId?: string; region?: string;
  storeDescription?: string; storeStatus?: string;
  itemType?: string; itemName?: string; itemDescription?: string;
  price?: string | number; stock?: string | number; publish?: string | boolean;
};

export type OnboardingResult = {
  ok: boolean;
  createdUsers: number;
  createdStores: number;
  createdItems: number;
  errors: { row: number; message: string }[];
  credentials: { email: string; password: string }[];
};

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") throw new Error("Administrator access required.");
  return session;
}

function clean(value: unknown, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 52) || "store";
}

function truthy(value: unknown) {
  return ["true", "yes", "1", "published", "active"].includes(String(value ?? "").toLowerCase().trim());
}

function validStatus(value: unknown): StoreStatus {
  const status = clean(value).toUpperCase();
  return status === "ACTIVE" || status === "PENDING_APPROVAL" ? status : "DRAFT";
}

export async function importAdminOnboardingRows(rows: OnboardingRow[]): Promise<OnboardingResult> {
  const actor = await requireAdmin();
  const result: OnboardingResult = { ok: true, createdUsers: 0, createdStores: 0, createdItems: 0, errors: [], credentials: [] };
  if (!Array.isArray(rows) || rows.length === 0) return { ...result, ok: false, errors: [{ row: 0, message: "Add at least one row." }] };
  if (rows.length > 500) return { ...result, ok: false, errors: [{ row: 0, message: "Import up to 500 rows at a time." }] };

  // Rows with the same email belong to one vendor/store and may each add an item.
  const accounts = new Map<string, { firstRow: number; rows: OnboardingRow[] }>();
  rows.forEach((row, index) => {
    const email = clean(row.email, 254).toLowerCase();
    if (!accounts.has(email)) accounts.set(email, { firstRow: index + 2, rows: [] });
    accounts.get(email)!.rows.push(row);
  });

  for (const [email, group] of accounts) {
    const base = group.rows[0]!;
    const fullName = clean(base.fullName, 150);
    const storeName = clean(base.storeName, 150);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !fullName || !storeName) {
      result.errors.push({ row: group.firstRow, message: "fullName, email and storeName are required." });
      continue;
    }
    try {
      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, storesOwned: { select: { id: true }, take: 1 } } });
      if (existing && existing.role !== "VENDOR") throw new Error("This email belongs to a non-vendor account.");
      const suppliedPassword = clean(base.password, 72);
      const generatedPassword = suppliedPassword || `${randomBytes(9).toString("base64url")}!Aa7`;
      if (generatedPassword.length < 12) throw new Error("Password must contain at least 12 characters.");
      const storeBaseSlug = slugify(clean(base.storeSlug, 64) || storeName);

      const summary = await prisma.$transaction(async (tx) => {
        let userId = existing?.id;
        let madeUser = false;
        if (!userId) {
          const user = await tx.user.create({ data: { fullName, email, phone: clean(base.phone, 30) || null, role: UserRole.VENDOR, passwordHash: await hashPassword(generatedPassword), emailVerified: new Date() }, select: { id: true } });
          userId = user.id;
          madeUser = true;
        }
        let storeId = existing?.storesOwned[0]?.id;
        let madeStore = false;
        if (!storeId) {
          const collision = await tx.store.findUnique({ where: { slug: storeBaseSlug }, select: { id: true } });
          const slug = collision ? `${storeBaseSlug}-${randomUUID().slice(0, 6)}` : storeBaseSlug;
          const store = await tx.store.create({ data: { ownerId: userId, name: storeName, slug, categoryId: clean(base.categoryId, 100) || "other", region: clean(base.region, 100) || "Trinidad and Tobago", description: clean(base.storeDescription, 4000) || null, status: validStatus(base.storeStatus), onboardingStep: 4 }, select: { id: true } });
          storeId = store.id;
          madeStore = true;
        }
        let items = 0;
        for (const row of group.rows) {
          const name = clean(row.itemName, 150);
          if (!name) continue;
          const type = clean(row.itemType, 20).toLowerCase();
          const price = Number(row.price ?? 0);
          const stock = clean(row.stock) ? Math.max(0, Number.parseInt(clean(row.stock), 10) || 0) : null;
          await tx.product.create({ data: { storeId, name, slug: `${slugify(name)}-${randomUUID().slice(0, 8)}`, description: clean(row.itemDescription, 4000) || null, price: Number.isFinite(price) && price >= 0 ? price : 0, stock, tags: [], images: [], isService: type === "service", serviceType: type === "service" ? "QUOTE" : null, isPublished: truthy(row.publish) } });
          items++;
        }
        await tx.notification.create({ data: { userId: actor.userId, type: "GENERAL", title: "Vendor onboarded", body: `${fullName} · ${storeName} · ${items} item${items === 1 ? "" : "s"}`, linkUrl: `/dashboard/admin/users` } });
        return { madeUser, madeStore, items };
      });
      if (summary.madeUser) {
        result.createdUsers++;
        result.credentials.push({ email, password: generatedPassword });
      }
      if (summary.madeStore) result.createdStores++;
      result.createdItems += summary.items;
    } catch (error) {
      result.errors.push({ row: group.firstRow, message: error instanceof Error ? error.message : "Could not import this vendor." });
    }
  }
  result.ok = result.errors.length === 0;
  revalidatePath("/dashboard/admin", "layout");
  return result;
}
