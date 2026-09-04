import type { ShippingZone } from "@/lib/shipping/trinidad-zoning";

export const CSF_STANDARD_LABEL_COST_TTD = 33;
export const CSF_MAX_LABEL_WEIGHT_LBS = 60;

export const CSF_DISTANCE_BANDS = [
  { maxKm: 15, label: "Up to 15 km", customerPriceTtd: 40 },
  { maxKm: 30, label: "15-30 km", customerPriceTtd: 45 },
  { maxKm: 50, label: "30-50 km", customerPriceTtd: 50 },
  { maxKm: Number.POSITIVE_INFINITY, label: "Over 50 km", customerPriceTtd: 55 },
] as const;

export const CSF_INTER_ISLAND_SURCHARGE_TTD = 15;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceKm(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
): number {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(origin.latitude)) *
      Math.cos(toRadians(destination.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getCsfDistanceBand(distance: number) {
  const safeDistance = Number.isFinite(distance) && distance >= 0 ? distance : 50.01;
  return CSF_DISTANCE_BANDS.find((band) => safeDistance <= band.maxKm)!;
}

function representativeDistanceKm(zone: ShippingZone): number {
  switch (zone) {
    case "METRO": return 12;
    case "EXTENDED": return 25;
    case "REMOTE": return 45;
    case "TOBAGO_METRO": return 25;
  }
}

/** Conservative estimate used only when either saved map pin is unavailable. */
export function getFallbackCsfDistanceKm(
  originZone: ShippingZone,
  destinationZone: ShippingZone,
): number {
  if (originZone === destinationZone) return representativeDistanceKm(originZone);
  if (originZone === "TOBAGO_METRO" || destinationZone === "TOBAGO_METRO") return 25;
  return Math.max(representativeDistanceKm(originZone), representativeDistanceKm(destinationZone));
}

export function getCsfCustomerDeliveryRate(input: {
  distanceKm: number;
  totalWeightLbs: number;
  interIsland?: boolean;
}): number {
  const labels = Math.max(1, Math.ceil(Math.max(0.01, input.totalWeightLbs) / CSF_MAX_LABEL_WEIGHT_LBS));
  const perLabel =
    getCsfDistanceBand(input.distanceKm).customerPriceTtd +
    (input.interIsland ? CSF_INTER_ISLAND_SURCHARGE_TTD : 0);
  return perLabel * labels;
}
