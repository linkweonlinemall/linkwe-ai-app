import { distanceKm, getCsfCustomerDeliveryRate, getFallbackCsfDistanceKm } from "@/lib/shipping/csf-rates";
import { getShippingZone } from "@/lib/shipping/trinidad-zoning";

export type PerStoreShippingInput = {
  /** Customer delivery region (checkout dropdown slug). Each store resolves its own zone by mode. */
  region: string;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
  stores: Array<{
    storeId: string;
    storeName: string;
    shippingMode: "LINKWE";
    latitude: number | null;
    longitude: number | null;
    region: string;
    totalWeightLbs: number;
    allItemsDigitalOrPickup: boolean;
    isDigitalOnly: boolean;
  }>;
};

export type PerStoreShippingRow = {
  storeId: string;
  storeName: string;
  mode: "LINKWE";
  shippingMinor: number;
  distanceKm: number | null;
  deliversToZone: boolean;
  isDigitalOnly: boolean;
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
  const mode = "LINKWE" as const;

  if (store.allItemsDigitalOrPickup) {
    return {
      storeId: store.storeId,
      storeName: store.storeName,
      mode,
      shippingMinor: 0,
      distanceKm: null,
      deliversToZone: true,
      isDigitalOnly: store.isDigitalOnly,
    };
  }

  const weight = Number(store.totalWeightLbs);
  const billableWeight = Number.isFinite(weight) && weight > 0 ? weight : 0;
  const zone = getShippingZone(input.region);
  const storeZone = getShippingZone(store.region);
  const origin = validCoordinates(store.latitude, store.longitude);
  const destination = validCoordinates(input.destinationLatitude, input.destinationLongitude);
  const hasCoordinates = origin !== null && destination !== null;
  const calculatedDistance = hasCoordinates
    ? distanceKm(origin, destination)
    : getFallbackCsfDistanceKm(storeZone, zone);
  return {
    storeId: store.storeId,
    storeName: store.storeName,
    mode: "LINKWE",
    shippingMinor: Math.round(getCsfCustomerDeliveryRate({
      distanceKm: calculatedDistance,
      totalWeightLbs: billableWeight,
      interIsland: (zone === "TOBAGO_METRO") !== (storeZone === "TOBAGO_METRO"),
    }) * 100),
    distanceKm: hasCoordinates ? calculatedDistance : null,
    deliversToZone: true,
    isDigitalOnly: store.isDigitalOnly,
  };
}

function validCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): { latitude: number; longitude: number } | null {
  const valid =
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180;
  return valid ? { latitude, longitude } : null;
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
