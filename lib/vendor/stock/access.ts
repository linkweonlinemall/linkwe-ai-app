import { getStorePlan, type StorePlanInput } from "@/lib/finance/store-plan";
import { StockAdjustmentAccessError } from "./model";

export const STOCK_UPGRADE_HREF = "/dashboard/vendor/finance";
export const STOCK_PRO_MESSAGE = "Live stock updates and QR stock scanning require an active Pro plan. Upgrade or renew in Finance; your ordinary product management remains available.";
export const stockPlanSelect = { subscriptionPlan: true, subscriptionStatus: true, planRenewsAt: true } as const;
export type StockPlanInput = StorePlanInput & { planRenewsAt: Date | null };

/** Pro is currently the highest tier. Use the same active/paid-period rule as existing paid Photo Studio access. */
export function canUseLiveStock(store: StockPlanInput, now = new Date()): boolean {
  const { plan, status } = getStorePlan(store);
  return plan === "PRO" && status === "ACTIVE" && (!store.planRenewsAt || store.planRenewsAt > now);
}
export class StockProRequiredError extends StockAdjustmentAccessError {}
export function assertLiveStockAccess(store: StockPlanInput) {
  if (!canUseLiveStock(store)) throw new StockProRequiredError(STOCK_PRO_MESSAGE);
}
