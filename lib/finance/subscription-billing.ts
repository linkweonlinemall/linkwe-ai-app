import { getCurrentPeriodKey } from "@/lib/finance/ai-usage-period";
import { PLAN_PRICE_MINOR } from "@/lib/finance/plan-limits";
import { getVendorAvailableBalanceMinor } from "@/lib/finance/release-earnings";
import { resolveVendorPlan } from "@/lib/finance/vendor-plan";
import { prisma } from "@/lib/prisma";

/**
 * Attempts to charge a store's monthly subscription from its LinkWe balance.
 * - STARTER (price 0): nothing to charge, returns { ok: true, charged: false, reason: "free_plan" }.
 * - Balance >= price: writes a DEBIT_SUBSCRIPTION ledger entry (idempotent per period), returns { ok: true, charged: true }.
 * - Balance < price: does NOT charge, returns { ok: false, reason: "insufficient_balance", balanceMinor, priceMinor } (card fallback handled later).
 * Never pushes balance negative. Idempotent: a given store+period can only be charged once from balance.
 */
export async function chargeSubscriptionFromBalance(
  storeId: string,
  subscriptionPlan: string | null,
  planRenewsAt: Date | null,
): Promise<
  | { ok: true; charged: boolean; reason?: string }
  | { ok: false; reason: string; balanceMinor?: number; priceMinor?: number }
> {
  const plan = resolveVendorPlan(subscriptionPlan);
  const priceMinor = PLAN_PRICE_MINOR[plan];
  if (priceMinor <= 0) {
    return { ok: true, charged: false, reason: "free_plan" };
  }

  const periodKey = getCurrentPeriodKey(planRenewsAt);
  const idempotencyKey = `subscription:${storeId}:${periodKey}`;

  const existing = await prisma.vendorLedgerEntry.findUnique({
    where: { idempotencyKey },
  });
  if (existing) {
    return { ok: true, charged: false, reason: "already_charged_this_period" };
  }

  const balanceMinor = await getVendorAvailableBalanceMinor(storeId);
  if (balanceMinor < priceMinor) {
    return { ok: false, reason: "insufficient_balance", balanceMinor, priceMinor };
  }

  await prisma.vendorLedgerEntry.create({
    data: {
      storeId,
      currency: "TTD",
      entryType: "DEBIT_SUBSCRIPTION",
      ledgerEntryType: "SUBSCRIPTION",
      amountMinor: priceMinor,
      idempotencyKey,
      description: `${plan.charAt(0) + plan.slice(1).toLowerCase()} plan subscription — paid from balance`,
      releasedAt: new Date(),
    },
  });

  return { ok: true, charged: true };
}
