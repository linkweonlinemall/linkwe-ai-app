/**
 * Single entry point for "what plan is this store on and what does it include."
 * Gating, metering, and billing all read this. Pure function — no DB calls.
 */

import type { CommissionPlan } from "@/lib/finance/commission";
import { PLAN_LIMITS, type PlanLimits } from "@/lib/finance/plan-limits";
import { resolveVendorPlan } from "@/lib/finance/vendor-plan";

export type StorePlanInput = {
  subscriptionPlan: string | null;
  subscriptionStatus?: string | null;
};

export type StorePlan = {
  plan: CommissionPlan;
  status: string;
  limits: PlanLimits;
};

export function getStorePlan(store: StorePlanInput): StorePlan {
  const plan = resolveVendorPlan(store.subscriptionPlan);
  const status = store.subscriptionStatus ?? "NONE";

  return {
    plan,
    status,
    limits: PLAN_LIMITS[plan],
  };
}
