/**
 * Trinidad & Tobago — platform shipping markup on top of **carrier base** rates (`tt-rates.ts`).
 * Base rates stay in `getShippingRateForRegion` / `getBaseShippingRate`; this module adds fees only.
 */

import { getShippingRateForRegion } from "@/lib/shipping/tt-rates";

const FLAT_MARKUP = 10;
const PERCENT_MARKUP = 0.1;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sanitizeBaseRate(baseRate: number): number {
  const b = Number(baseRate);
  if (!Number.isFinite(b) || b < 0) return 0;
  return b;
}

/**
 * Markup only: **flat 10** + **10% of base** (not including base itself).
 * Rounded to **2** decimal places.
 */
export function getShippingMarkup(baseRate: number): number {
  const b = sanitizeBaseRate(baseRate);
  return round2(FLAT_MARKUP + b * PERCENT_MARKUP);
}

/**
 * **finalShipping = baseRate + 10 + (baseRate × 0.1)** — full amount the customer pays for shipping (before minor-unit conversion).
 * Rounded to **2** decimal places.
 */
export function getFinalShippingRate(baseRate: number): number {
  const b = sanitizeBaseRate(baseRate);
  return round2(b + FLAT_MARKUP + b * PERCENT_MARKUP);
}

/**
 * Base rate from region + weight (`tt-rates`), then **final** shipping with markup applied.
 */
export function getFinalShippingRateForRegion(region: string, weightLbs: number): number {
  return getFinalShippingRate(getShippingRateForRegion(region, weightLbs));
}
