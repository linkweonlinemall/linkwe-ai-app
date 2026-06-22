import type { CommissionPlan } from "@/lib/finance/commission";
import { getCommissionRate } from "@/lib/finance/commission";
import { PLAN_LIMITS, PLAN_PRICE_MINOR } from "@/lib/finance/plan-limits";
import type { IntendedPlan } from "@/lib/onboarding/intended-plan";

export type PlanPickerOption = {
  planId: IntendedPlan;
  name: string;
  tagline: string;
  priceLabel: string;
  priceNote: string;
  commission: string;
  productCapLabel: string;
  aiLabel: string;
  featured?: boolean;
};

function formatCommission(plan: CommissionPlan): string {
  const productPct = Math.round(getCommissionRate("product", plan) * 100);
  const servicePct = Math.round(getCommissionRate("service", plan) * 100);
  return `${productPct}% products · ${servicePct}% services`;
}

function formatPrice(plan: CommissionPlan): { priceLabel: string; priceNote: string } {
  const minor = PLAN_PRICE_MINOR[plan];
  if (minor === 0) {
    return { priceLabel: "Free", priceNote: "No monthly fee — pay only when you sell" };
  }
  return {
    priceLabel: `TTD ${minor / 100}`,
    priceNote: "per month",
  };
}

function formatProductCap(plan: CommissionPlan): string {
  const cap = PLAN_LIMITS[plan].productCap;
  return cap === null ? "Unlimited products" : `Up to ${cap} products`;
}

function formatAiAllowance(plan: CommissionPlan): string {
  const allowance = PLAN_LIMITS[plan].aiMonthlyAllowance;
  if (allowance <= 0) return "No AI assistant included";
  return `AI assistant — ${allowance} uses/mo`;
}

export const PLAN_PICKER_OPTIONS: PlanPickerOption[] = (
  [
    {
      planId: "STARTER",
      name: "Starter",
      tagline: "Everything you need to start selling.",
    },
    {
      planId: "GROWTH",
      name: "Growth",
      tagline: "For shops ready to scale and sell smarter.",
      featured: true,
    },
    {
      planId: "PRO",
      name: "Pro",
      tagline: "Maximum reach, lowest fees, full power.",
    },
  ] as const
).map((base) => {
  const { priceLabel, priceNote } = formatPrice(base.planId);
  return {
    ...base,
    priceLabel,
    priceNote,
    commission: formatCommission(base.planId),
    productCapLabel: formatProductCap(base.planId),
    aiLabel: formatAiAllowance(base.planId),
  };
});
