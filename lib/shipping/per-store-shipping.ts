import { getCheckoutShipping } from "@/lib/checkout/pricing";
import { getSelfDeliveryZone } from "@/lib/shipping/self-delivery-zones";

export type PerStoreShippingInput = {
  /** Customer delivery region (checkout dropdown slug). Each store resolves its own zone by mode. */
  region: string;
  stores: Array<{
    storeId: string;
    storeName: string;
    shippingMode: "SELF" | "LINKWE";
    selfRates: Array<{ zone: string; rateMinor: number; active: boolean }>;
    totalWeightLbs: number;
    allItemsDigitalOrPickup: boolean;
  }>;
};

export type PerStoreShippingRow = {
  storeId: string;
  storeName: string;
  mode: "SELF" | "LINKWE";
  shippingMinor: number;
  deliversToZone: boolean;
};

export type PerStoreShippingResult = {
  perStore: PerStoreShippingRow[];
  totalShippingMinor: number;
  hasCoverageFailure: boolean;
  blockedStores: Array<{ storeId: string; storeName: string }>;
};

function computeStoreShipping(
  input: PerStoreShippingInput,
  store: PerStoreShippingInput["stores"][number],
): PerStoreShippingRow {
  const mode = store.shippingMode;

  if (store.allItemsDigitalOrPickup) {
    return {
      storeId: store.storeId,
      storeName: store.storeName,
      mode,
      shippingMinor: 0,
      deliversToZone: true,
    };
  }

  if (mode === "SELF") {
    const selfZone = getSelfDeliveryZone(input.region);
    const rate = store.selfRates.find((r) => r.zone === selfZone && r.active);
    if (rate) {
      return {
        storeId: store.storeId,
        storeName: store.storeName,
        mode,
        shippingMinor: Math.max(0, Math.round(rate.rateMinor)),
        deliversToZone: true,
      };
    }
    return {
      storeId: store.storeId,
      storeName: store.storeName,
      mode,
      shippingMinor: 0,
      deliversToZone: false,
    };
  }

  const weight = Number(store.totalWeightLbs);
  const billableWeight = Number.isFinite(weight) && weight > 0 ? weight : 0;
  return {
    storeId: store.storeId,
    storeName: store.storeName,
    mode: "LINKWE",
    shippingMinor: getCheckoutShipping(input.region, billableWeight),
    deliversToZone: true,
  };
}

/**
 * Pure per-store shipping calculator. No DB or session — safe on server and client.
 */
export function computePerStoreShipping(input: PerStoreShippingInput): PerStoreShippingResult {
  const perStore = input.stores.map((store) => computeStoreShipping(input, store));

  const blockedStores = perStore
    .filter((row) => !row.deliversToZone)
    .map((row) => ({ storeId: row.storeId, storeName: row.storeName }));

  const totalShippingMinor = perStore.reduce(
    (sum, row) => sum + (row.deliversToZone ? row.shippingMinor : 0),
    0,
  );

  return {
    perStore,
    totalShippingMinor,
    hasCoverageFailure: blockedStores.length > 0,
    blockedStores,
  };
}
