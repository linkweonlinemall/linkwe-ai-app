/**
 * LinkWe — Courier pickup rates for vendor-to-warehouse leg.
 *
 * These are flat per-pickup fees charged to the VENDOR (not the customer).
 * The vendor chooses pickup or dropoff after an order is placed.
 * Pickup fees are deducted from vendor earnings before payout.
 *
 * Pricing basis: Trinidad fuel costs + courier time + reasonable vendor affordability.
 * Last reviewed: April 2026.
 */

import type { ShippingZone } from "@/lib/shipping/trinidad-zoning";
import { getShippingZone } from "@/lib/shipping/trinidad-zoning";

/** Flat pickup fee in TTD per collection, by zone. */
export const COURIER_PICKUP_RATES: Record<ShippingZone, number> = {
  METRO: 25,
  EXTENDED: 45,
  REMOTE: 70,
  TOBAGO_METRO: 120,
};

/**
 * Returns the flat courier pickup fee in TTD for a vendor in the given region.
 * This fee is charged to the vendor and deducted from their payout.
 */
export function getCourierPickupFee(vendorRegion: string): number {
  const zone = getShippingZone(vendorRegion);
  return COURIER_PICKUP_RATES[zone];
}

/**
 * Returns the courier pickup fee in minor units (cents × 100).
 * Use this when recording against the vendor ledger.
 */
export function getCourierPickupFeeMinor(vendorRegion: string): number {
  return Math.round(getCourierPickupFee(vendorRegion) * 100);
}

/**
 * Human-readable label for the pickup fee.
 * Example: "TTD 25.00 courier pickup fee"
 */
export function getCourierPickupFeeLabel(vendorRegion: string): string {
  const fee = getCourierPickupFee(vendorRegion);
  return `TTD ${fee.toFixed(2)} courier pickup fee`;
}

export type CourierPickupChoice = "VENDOR_DROPOFF" | "PICKUP_REQUESTED";

/**
 * Phase D — vendor fulfillment choice per order.
 * VENDOR_DROPOFF: vendor brings items to warehouse. No fee.
 * PICKUP_REQUESTED: courier collects from vendor. Fee applies.
 */
export const COURIER_PICKUP_CHOICE_LABELS: Record<CourierPickupChoice, string> = {
  VENDOR_DROPOFF: "I will drop off at the warehouse — no fee",
  PICKUP_REQUESTED: "Request courier pickup — fee applies",
};
