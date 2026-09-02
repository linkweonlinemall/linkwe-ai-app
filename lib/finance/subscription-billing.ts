import { getCurrentPeriodKey } from "@/lib/finance/ai-usage-period";
import type { CommissionPlan } from "@/lib/finance/commission";
import { PLAN_PRICE_MINOR } from "@/lib/finance/plan-limits";
import { isVendorBalanceDebit } from "@/lib/finance/vendor-balance";
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
  targetPlan?: CommissionPlan,
): Promise<
  | { ok: true; charged: boolean; reason?: string }
  | { ok: false; reason: string; balanceMinor?: number; priceMinor?: number }
> {
  const currentPlan = resolveVendorPlan(subscriptionPlan);
  const plan = targetPlan ?? currentPlan;
  const priceMinor = PLAN_PRICE_MINOR[plan];
  if (priceMinor <= 0) {
    return { ok: true, charged: false, reason: "free_plan" };
  }

  const periodKey = getCurrentPeriodKey(planRenewsAt);
  const idempotencyKey = `subscription:${storeId}:${plan}:${periodKey}`;
  const legacyIdempotencyKey = `subscription:${storeId}:${periodKey}`;

  try {
  return await prisma.$transaction(async (tx) => {
    // Re-read inside the transaction: another tab may already have changed the plan.
    const store = await tx.store.findUnique({ where: { id: storeId } });
    if (!store) return { ok: false as const, reason: "Store not found." };
    if (resolveVendorPlan(store.subscriptionPlan) !== currentPlan ||
        store.planRenewsAt?.getTime() !== planRenewsAt?.getTime()) {
      return { ok: false as const, reason: "Your subscription changed. Refresh Finance before trying again." };
    }
    if (PLAN_PRICE_MINOR[plan] < PLAN_PRICE_MINOR[currentPlan]) {
      return { ok: false as const, reason: "Please contact support to downgrade your plan." };
    }
    const existing = await tx.vendorLedgerEntry.findFirst({
      where: {
        idempotencyKey: {
          in: plan === currentPlan
            ? [idempotencyKey, legacyIdempotencyKey]
            : [idempotencyKey],
        },
      },
    });
    if (existing) return { ok: true as const, charged: false, reason: "already_charged_this_period" };

    if (plan === currentPlan && planRenewsAt &&
        planRenewsAt.getTime() > Date.now() + 7 * 24 * 60 * 60 * 1000) {
      return { ok: false as const, reason: "Renewal opens seven days before your current period ends." };
    }

    const entries = await tx.vendorLedgerEntry.findMany({
      where: { storeId },
      select: { amountMinor: true, entryType: true },
    });
    const balanceMinor = entries.reduce((balance, entry) => {
      if (entry.entryType === "CREDIT_ORDER_SETTLEMENT") return balance + entry.amountMinor;
      if (isVendorBalanceDebit(entry.entryType)) return balance - entry.amountMinor;
      return balance;
    }, 0);
    if (balanceMinor < priceMinor) {
      return { ok: false as const, reason: "insufficient_balance", balanceMinor, priceMinor };
    }

    const now = new Date();
    const renewalBase = plan === currentPlan && planRenewsAt && planRenewsAt > now ? planRenewsAt : now;
    const nextRenewal = new Date(renewalBase);
    const renewalDay = nextRenewal.getUTCDate();
    nextRenewal.setUTCDate(1);
    nextRenewal.setUTCMonth(nextRenewal.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(nextRenewal.getUTCFullYear(), nextRenewal.getUTCMonth() + 1, 0)).getUTCDate();
    nextRenewal.setUTCDate(Math.min(renewalDay, lastDay));
    await tx.vendorLedgerEntry.create({
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
    await tx.store.update({
      where: { id: storeId },
      data: {
        subscriptionPlan: plan,
        subscriptionStatus: "ACTIVE",
        planRenewsAt: nextRenewal,
        pastDueSince: null,
        wipayTrustedCardId: null,
      },
    });
    return { ok: true as const, charged: true };
  }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error &&
        (error.code === "P2034" || error.code === "P2002")) {
      return { ok: false, reason: "Another payment is being processed. Refresh Finance to check its result before trying again." };
    }
    throw error;
  }
}
