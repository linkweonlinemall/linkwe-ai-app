/**
 * Checkout pricing — cart subtotal + shipping (final, with markup) + order total in **minor units**.
 * Tax and Stripe are out of scope here; keep amounts consistent with listing `priceMinor` convention.
 */

import { getFinalShippingRateForRegion } from "@/lib/shipping/tt-markup";

/** One sellable line after resolving listing price and optional per-line weight. */
export type CheckoutPricingLine = {
  priceMinor: number;
  quantity: number;
  weightLbs: number;
};

function toMinorFromMajorUnits(major: number): number {
  return Math.round(major * 100);
}

/** Sum of `priceMinor * quantity` for all lines. */
export function getCartSubtotal(items: readonly CheckoutPricingLine[]): number {
  let sum = 0;
  for (const line of items) {
    const q = Number(line.quantity);
    const p = Number(line.priceMinor);
    if (!Number.isFinite(q) || !Number.isFinite(p) || q <= 0 || p < 0) continue;
    sum += Math.round(p * q);
  }
  return sum;
}

/**
 * Final shipping (carrier base + platform markup from `tt-markup`), converted to **minor units**
 * (×100, rounded). `totalWeightLbs` should be the **billable** total (e.g. Σ `weightLbs × quantity`).
 */
export function getCheckoutShipping(region: string, totalWeightLbs: number): number {
  const shippingMajor = getFinalShippingRateForRegion(region, totalWeightLbs);
  return toMinorFromMajorUnits(shippingMajor);
}

export type CheckoutPricingTotals = {
  subtotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
};

/**
 * Full checkout snapshot: **subtotalMinor** from lines, **shippingMinor** from region + weight,
 * **totalMinor** = subtotal + shipping (tax excluded for now).
 */
export function getCheckoutTotal(
  items: readonly CheckoutPricingLine[],
  region: string,
  totalWeightLbs: number,
): CheckoutPricingTotals {
  const subtotalMinor = getCartSubtotal(items);
  const shippingMinor = getCheckoutShipping(region, totalWeightLbs);
  return {
    subtotalMinor,
    shippingMinor,
    totalMinor: subtotalMinor + shippingMinor,
  };
}
