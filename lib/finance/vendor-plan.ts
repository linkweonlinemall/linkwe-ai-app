import type { CommissionPlan } from "@/lib/finance/commission";

/** Store subscription tier for commission — defaults to STARTER when unset. */
export function resolveVendorPlan(
  plan: string | null | undefined,
): CommissionPlan {
  if (plan === "GROWTH" || plan === "PRO" || plan === "STARTER") {
    return plan;
  }
  return "STARTER";
}
