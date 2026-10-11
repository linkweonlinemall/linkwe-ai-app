"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { adjustVendorStock } from "@/lib/vendor/stock/adjust";
import { getStockCatalog } from "@/lib/vendor/stock/query";
import { resolveStockQr } from "@/lib/vendor/stock/resolve-qr";
import { StockQrError, type StockQrResult } from "@/lib/vendor/stock/scan";
import { StockProRequiredError } from "@/lib/vendor/stock/access";
import { StockAdjustmentError, StockAdjustmentAccessError, type StockAdjustmentResult } from "@/lib/vendor/stock/model";

export async function loadVendorStockCatalog() {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return null;
  try { return await getStockCatalog(session.userId); }
  catch (error) {
    if (error instanceof StockProRequiredError) return { upgradeRequired: true as const, error: error.message };
    throw error;
  }
}

export async function resolveVendorStockQr(value: unknown, expectedStoreId: unknown): Promise<StockQrResult> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { ok: false, error: "Sign in to your vendor account to find this product." };
  try {
    return { ok: true, product: await resolveStockQr(prisma, session.userId, expectedStoreId, value) };
  } catch (error) {
    if (error instanceof StockProRequiredError) return { ok: false, error: error.message, upgradeRequired: true };
    return { ok: false, error: error instanceof StockQrError ? error.message : "Could not check this label. Reconnect and try again, or search your catalog." };
  }
}

export async function submitVendorStockAdjustment(input: unknown): Promise<StockAdjustmentResult> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { ok: false, error: "Sign in to your vendor account to confirm this stock update, then retry it.", uncertain: true };
  try {
    const result = await adjustVendorStock(prisma, session.userId, input);
    revalidatePath("/dashboard/vendor/catalog");
    revalidatePath("/dashboard/vendor/creation");
    revalidatePath("/dashboard/vendor");
    revalidatePath("/products/[slug]", "page");
    revalidatePath("/store/[slug]", "page");
    revalidatePath("/shop");
    revalidatePath("/search");
    revalidatePath("/cart");
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof StockProRequiredError) return { ok: false, error: error.message, uncertain: true, upgradeRequired: true };
    if (error instanceof StockAdjustmentAccessError) return { ok: false, error: error.message, uncertain: true };
    if (error instanceof StockAdjustmentError) return { ok: false, error: error.message, uncertain: false };
    console.error("Vendor stock adjustment could not be confirmed", error instanceof Error ? error.name : "Unknown error");
    return { ok: false, error: "We could not confirm this update. Retry the same adjustment to safely check its result.", uncertain: true };
  }
}
