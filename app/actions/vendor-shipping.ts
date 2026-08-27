"use server";

import type { StoreShippingMode } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { ttdToMinor } from "@/lib/finance/commission";
import { prisma } from "@/lib/prisma";
import {
  SELF_DELIVERY_ZONE_LABELS,
  SELF_DELIVERY_ZONES,
  getDefaultRatesForHomeZone,
  getSelfDeliveryZoneRegionsPreview,
  isSelfDeliveryZone,
  mapStoreRegionToHomeZone,
} from "@/lib/shipping/self-delivery-zones";
import {
  getAllLinkWeDisplayRates,
  type SelfDeliveryZoneRowData,
  type VendorShippingRateInput,
  type VendorShippingSettingsData,
} from "@/lib/shipping/vendor-shipping-types";

const SHIPPING_PAGE = "/dashboard/vendor/shipping";
const NO_STORE_ERROR = "Store not found.";

/**
 * Optional one-time Neon cleanup for pre-launch legacy self-delivery rows (run manually):
 *
 * DELETE FROM vendor_shipping_rates
 * WHERE zone IN ('METRO', 'EXTENDED', 'REMOTE', 'TOBAGO_METRO');
 *
 * Load logic ignores those rows for the SELF UI; checkout still reads them until Phase 3.
 */

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

function buildSelfDeliveryZoneRows(
  storeRegion: string | null,
  savedRates: Array<{ zone: string; rateMinor: number; active: boolean; linkweFallback: boolean }>,
): Pick<VendorShippingSettingsData, "selfDeliveryZones" | "homeZone" | "homeZoneLabel"> {
  const homeZone = mapStoreRegionToHomeZone(storeRegion ?? "");
  const defaultsMajor = getDefaultRatesForHomeZone(homeZone);

  const savedByZone = new Map(
    savedRates
      .filter((row) => isSelfDeliveryZone(row.zone))
      .map((row) => [row.zone, row] as const),
  );

  const selfDeliveryZones: SelfDeliveryZoneRowData[] = SELF_DELIVERY_ZONES.map((zone) => {
    const saved = savedByZone.get(zone);
    const defaultMajor = defaultsMajor[zone];
    return {
      zone,
      label: SELF_DELIVERY_ZONE_LABELS[zone],
      regionsPreview: getSelfDeliveryZoneRegionsPreview(zone),
      rateMinor: saved ? saved.rateMinor : ttdToMinor(defaultMajor),
      isSuggested: !saved,
      active: saved?.active ?? true,
      linkweFallback: saved?.linkweFallback ?? false,
    };
  });

  return {
    selfDeliveryZones,
    homeZone,
    homeZoneLabel: SELF_DELIVERY_ZONE_LABELS[homeZone],
  };
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
        region: true,
        shippingRates: {
          orderBy: { zone: "asc" },
        },
      },
    });

    if (!store) return { ok: false, error: NO_STORE_ERROR };

    const selfDelivery = buildSelfDeliveryZoneRows(store.region, store.shippingRates);

    return {
      ok: true,
      shippingMode: store.shippingMode,
      rates: store.shippingRates,
      ...selfDelivery,
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

  if (rates.length !== SELF_DELIVERY_ZONES.length) {
    return { ok: false, error: "All 16 delivery zones must be included." };
  }

  const storeResult = await requireCallerStore();
  if (!storeResult.ok) return storeResult;

  const seenZones = new Set<string>();
  for (const row of rates) {
    if (!isSelfDeliveryZone(row.zone)) {
      return { ok: false, error: `Unknown self-delivery zone: ${row.zone}` };
    }
    if (seenZones.has(row.zone)) {
      return { ok: false, error: `Duplicate zone: ${row.zone}` };
    }
    seenZones.add(row.zone);
    const minor = Number(row.rateMinor);
    if (!Number.isFinite(minor) || minor < 0 || !Number.isInteger(minor)) {
      return { ok: false, error: "Rates must be whole minor units (≥ 0)." };
    }
    if (typeof row.active !== "boolean") {
      return { ok: false, error: "Each zone must include an active flag." };
    }
    if (typeof row.linkweFallback !== "boolean") return { ok: false, error: "Each zone must include a LinkWe delivery flag." };
  }

  for (const zone of SELF_DELIVERY_ZONES) {
    if (!seenZones.has(zone)) {
      return { ok: false, error: `Missing zone: ${zone}` };
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
            linkweFallback: row.linkweFallback,
          },
          update: {
            rateMinor: row.rateMinor,
            active: row.active,
            linkweFallback: row.linkweFallback,
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
