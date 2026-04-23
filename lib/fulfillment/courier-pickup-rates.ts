import type { ShippingZone } from "@/lib/shipping/trinidad-zoning";
import { getShippingZone } from "@/lib/shipping/trinidad-zoning";

export type CourierPickupChoice = "VENDOR_DROPOFF" | "PICKUP_REQUESTED";

export const COURIER_PICKUP_CHOICE_LABELS: Record<CourierPickupChoice, string> = {
  VENDOR_DROPOFF: "I will drop off at the warehouse — no fee",
  PICKUP_REQUESTED: "Request courier pickup — fee applies",
};

/** Weight tiers in lbs and rates in TTD by zone */
const WEIGHT_TIERS: Array<{ maxLbs: number; rates: Record<ShippingZone, number> }> = [
  {
    maxLbs: 5,
    rates: { METRO: 25, EXTENDED: 45, REMOTE: 70, TOBAGO_METRO: 120 },
  },
  {
    maxLbs: 10,
    rates: { METRO: 35, EXTENDED: 60, REMOTE: 90, TOBAGO_METRO: 150 },
  },
  {
    maxLbs: 20,
    rates: { METRO: 45, EXTENDED: 75, REMOTE: 110, TOBAGO_METRO: 185 },
  },
  {
    maxLbs: 40,
    rates: { METRO: 60, EXTENDED: 95, REMOTE: 135, TOBAGO_METRO: 220 },
  },
  {
    maxLbs: Infinity,
    rates: { METRO: 80, EXTENDED: 120, REMOTE: 165, TOBAGO_METRO: 260 },
  },
];

/**
 * Returns the pickup fee in TTD based on zone and total weight.
 * This is a per-TRIP fee covering all batched split orders.
 */
export function getCourierPickupFee(vendorRegion: string, totalWeightLbs: number): number {
  const zone = getShippingZone(vendorRegion);
  const tier = WEIGHT_TIERS.find((t) => totalWeightLbs <= t.maxLbs) ?? WEIGHT_TIERS[WEIGHT_TIERS.length - 1];
  return tier!.rates[zone];
}

/**
 * Returns the fee in minor units (TTD × 100).
 */
export function getCourierPickupFeeMinor(vendorRegion: string, totalWeightLbs: number): number {
  return Math.round(getCourierPickupFee(vendorRegion, totalWeightLbs) * 100);
}

/**
 * Returns a human-readable label.
 */
export function getCourierPickupFeeLabel(vendorRegion: string, totalWeightLbs: number): string {
  const fee = getCourierPickupFee(vendorRegion, totalWeightLbs);
  return `TTD ${fee.toFixed(2)} courier pickup (${totalWeightLbs.toFixed(1)} lbs)`;
}

/**
 * Calculate total weight in lbs from a list of order items.
 * Falls back to 1 lb per item if product has no weight.
 */
export function calculateBatchWeightLbs(
  items: Array<{
    quantity: number;
    product?: { weight?: number | null; weightUnit?: string | null } | null;
  }>,
): number {
  return items.reduce((total, item) => {
    const weight = item.product?.weight ?? 1;
    const unit = item.product?.weightUnit ?? "LB";
    const weightLbs = unit === "KG" ? weight * 2.20462 : weight;
    return total + weightLbs * item.quantity;
  }, 0);
}
