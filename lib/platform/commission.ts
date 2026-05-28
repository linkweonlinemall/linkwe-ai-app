import {
  calculateEarningsMinor,
  getCommissionRate,
  type CommissionItemType,
  type CommissionPlan,
} from "@/lib/finance/commission";

/** @deprecated Use getCommissionRate from lib/finance/commission with plan tier. */
export const PLATFORM_COMMISSION_RATE = 0.12;

export function calculateCommissionMinor(
  subtotalMinor: number,
  plan: CommissionPlan = "STARTER",
  type: CommissionItemType = "product",
): number {
  return calculateEarningsMinor(subtotalMinor, type, plan).commissionMinor;
}

export function calculateVendorNetMinor(
  subtotalMinor: number,
  plan: CommissionPlan = "STARTER",
  type: CommissionItemType = "product",
): number {
  return calculateEarningsMinor(subtotalMinor, type, plan).netMinor;
}

export { getCommissionRate };
