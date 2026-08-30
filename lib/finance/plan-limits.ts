/**
 * Single source of truth for vendor plan limits and monthly prices.
 * All gating, metering, and billing must read from here — do not hardcode these numbers elsewhere.
 */

import type { CommissionPlan } from "@/lib/finance/commission";

export type PlanLimits = {
  productCap: number | null;
  serviceCap: number | null;
  serviceMaxPriceMinor: number | null;
  aiMonthlyAllowance: number;
  aiLifetimeGiftAllowance: number;
};

export const PLAN_LIMITS: Record<CommissionPlan, PlanLimits> = {
  STARTER: { productCap: 30, serviceCap: 3, serviceMaxPriceMinor: 10000, aiMonthlyAllowance: 0, aiLifetimeGiftAllowance: 5 },
  GROWTH: { productCap: 300, serviceCap: null, serviceMaxPriceMinor: null, aiMonthlyAllowance: 300, aiLifetimeGiftAllowance: 0 },
  PRO: { productCap: null, serviceCap: null, serviceMaxPriceMinor: null, aiMonthlyAllowance: 1000, aiLifetimeGiftAllowance: 0 },
};

/** Monthly plan prices in minor units (TTD cents). STARTER is free. */
export const PLAN_PRICE_MINOR: Record<CommissionPlan, number> = {
  STARTER: 0,
  GROWTH: 30000,
  PRO: 50000,
};
