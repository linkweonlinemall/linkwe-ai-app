/**
 * Single source of truth for vendor plan limits and monthly prices.
 * All gating, metering, and billing must read from here — do not hardcode these numbers elsewhere.
 */

import type { CommissionPlan } from "@/lib/finance/commission";

export type PlanLimits = {
  productCap: number | null;
  aiMonthlyAllowance: number;
};

export const PLAN_LIMITS: Record<CommissionPlan, PlanLimits> = {
  STARTER: { productCap: 30, aiMonthlyAllowance: 0 },
  GROWTH: { productCap: 300, aiMonthlyAllowance: 300 },
  PRO: { productCap: null, aiMonthlyAllowance: 1000 },
};

/** Monthly plan prices in minor units (TTD cents). STARTER is free. */
export const PLAN_PRICE_MINOR: Record<CommissionPlan, number> = {
  STARTER: 0,
  GROWTH: 20000,
  PRO: 45000,
};
