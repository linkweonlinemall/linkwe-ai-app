
export type CourierPickupChoice = "VENDOR_DROPOFF" | "PICKUP_REQUESTED";

export const COURIER_PICKUP_CHOICE_LABELS: Record<CourierPickupChoice, string> = {
  VENDOR_DROPOFF: "I will drop off at the warehouse — no fee",
  PICKUP_REQUESTED: "Request courier pickup — fee applies",
};

/** LinkWe's flat vendor collection charge, per selected vendor order. */
export const VENDOR_COLLECTION_FEE_MINOR = 4000;
export function getCourierPickupFee(_vendorRegion: string, _totalWeightLbs: number): number { return 40; }
export function getCourierPickupFeeMinor(_vendorRegion: string, _totalWeightLbs: number): number { return VENDOR_COLLECTION_FEE_MINOR; }
export function getCourierPickupFeeLabel(_vendorRegion: string, _totalWeightLbs: number): string { return "TTD 40.00 collection to LinkWe warehouse"; }

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
