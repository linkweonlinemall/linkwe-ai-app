"use server";

import type { StoreShippingMode } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  getAllLinkWeDisplayRates,
  isVendorShippingZone,
  type VendorShippingRateInput,
  type VendorShippingSettingsData,
} from "@/lib/shipping/vendor-shipping-types";

const SHIPPING_PAGE = "/dashboard/vendor/shipping";
const NO_STORE_ERROR = "Store not found.";

type ActionError = { ok: false; error: string };
type ActionOk = { ok: true };

async function requireCallerStore(): Promise<
  | { ok: true; storeId: string }
  | ActionError
> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in required." };

  const store = await prisma.store.findUnique({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) return { ok: false, error: NO_STORE_ERROR };

  return { ok: true, storeId: store.id };
}

export async function getVendorShippingSettings(): Promise<
  | ({ ok: true } & VendorShippingSettingsData)
  | ActionError
> {
  const storeResult = await requireCallerStore();
  if (!storeResult.ok) return storeResult;

  try {
    const store = await prisma.store.findUnique({
      where: { id: storeResult.storeId },
      select: {
        shippingMode: true,
        shippingRates: {
          orderBy: { zone: "asc" },
        },
      },
    });

    if (!store) return { ok: false, error: NO_STORE_ERROR };

    return {
      ok: true,
      shippingMode: store.shippingMode,
      rates: store.shippingRates,
      linkweRates: getAllLinkWeDisplayRates(),
    };
  } catch (e) {
    console.error("getVendorShippingSettings", e);
    return { ok: false, error: "Could not load shipping settings." };
  }
}

export async function updateShippingMode(
  mode: "SELF" | "LINKWE",
): Promise<ActionOk | ActionError> {
  if (mode !== "SELF" && mode !== "LINKWE") {
    return { ok: false, error: "Invalid shipping mode." };
  }

  const storeResult = await requireCallerStore();
  if (!storeResult.ok) return storeResult;

  try {
    await prisma.store.update({
      where: { id: storeResult.storeId },
      data: { shippingMode: mode as StoreShippingMode },
    });
    revalidatePath(SHIPPING_PAGE);
    return { ok: true };
  } catch (e) {
    console.error("updateShippingMode", e);
    return { ok: false, error: "Could not update shipping mode." };
  }
}

export async function setShippingRates(
  rates: VendorShippingRateInput[],
): Promise<ActionOk | ActionError> {
  if (!Array.isArray(rates) || rates.length === 0) {
    return { ok: false, error: "At least one zone rate is required." };
  }

  const storeResult = await requireCallerStore();
  if (!storeResult.ok) return storeResult;

  for (const row of rates) {
    if (!isVendorShippingZone(row.zone)) {
      return { ok: false, error: `Unknown zone: ${row.zone}` };
    }
    const minor = Number(row.rateMinor);
    if (!Number.isFinite(minor) || minor < 0 || !Number.isInteger(minor)) {
      return { ok: false, error: "Rates must be whole minor units (≥ 0)." };
    }
    if (typeof row.active !== "boolean") {
      return { ok: false, error: "Each zone must include an active flag." };
    }
  }

  try {
    await prisma.$transaction(
      rates.map((row) =>
        prisma.vendorShippingRate.upsert({
          where: {
            storeId_zone: {
              storeId: storeResult.storeId,
              zone: row.zone,
            },
          },
          create: {
            storeId: storeResult.storeId,
            zone: row.zone,
            rateMinor: row.rateMinor,
            active: row.active,
          },
          update: {
            rateMinor: row.rateMinor,
            active: row.active,
          },
        }),
      ),
    );
    revalidatePath(SHIPPING_PAGE);
    return { ok: true };
  } catch (e) {
    console.error("setShippingRates", e);
    return { ok: false, error: "Could not save shipping rates." };
  }
}
