/**
 * Trinidad & Tobago — base shipping rates by `ShippingZone` and billable weight (lbs).
 * Zoning comes from `trinidad-zoning.ts`; this file is **carrier base cost only** (no platform markup yet).
 */

import type { ShippingZone } from "@/lib/shipping/trinidad-zoning";
import { getShippingZone } from "@/lib/shipping/trinidad-zoning";

type ZoneRateTable = {
  /** 1–20 lbs inclusive */
  upTo20Lbs: number;
  /** 21–40 lbs inclusive */
  upTo40Lbs: number;
  /** 41–60 lbs inclusive */
  upTo60Lbs: number;
  /** For each whole pound above 60 (61+ bracket: `upTo60Lbs` + `perLbAfter60` × (lbs − 60)) */
  perLbAfter60: number;
};

const RATES: Record<ShippingZone, ZoneRateTable> = {
  METRO: { upTo20Lbs: 25, upTo40Lbs: 35, upTo60Lbs: 45, perLbAfter60: 5 },
  EXTENDED: { upTo20Lbs: 45, upTo40Lbs: 65, upTo60Lbs: 75, perLbAfter60: 5 },
  REMOTE: { upTo20Lbs: 70, upTo40Lbs: 90, upTo60Lbs: 110, perLbAfter60: 5 },
  TOBAGO_METRO: { upTo20Lbs: 40, upTo40Lbs: 50, upTo60Lbs: 60, perLbAfter60: 5 },
};

/**
 * Base shipping amount (plain number, same currency unit you treat as TTD in checkout later).
 * Non-finite or non-positive weight returns **0**.
 */
export function getBaseShippingRate(zone: ShippingZone, weightLbs: number): number {
  const w = Number(weightLbs);
  if (!Number.isFinite(w) || w <= 0) return 0;

  const t = RATES[zone];
  if (w <= 20) return t.upTo20Lbs;
  if (w <= 40) return t.upTo40Lbs;
  if (w <= 60) return t.upTo60Lbs;
  return t.upTo60Lbs + t.perLbAfter60 * (w - 60);
}

/**
 * Resolves `region` → zone via `getShippingZone`, then applies weight brackets.
 */
export function getShippingRateForRegion(region: string, weightLbs: number): number {
  return getBaseShippingRate(getShippingZone(region), weightLbs);
}
