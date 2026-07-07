import { getCurrentPeriodKey } from "@/lib/finance/ai-usage-period";
import { getStorePlan } from "@/lib/finance/store-plan";
import { prisma } from "@/lib/prisma";

export type AIUsageStoreInput = {
  id: string;
  subscriptionPlan: string | null;
  subscriptionStatus?: string | null;
  planRenewsAt: Date | null;
  aiTopupCreditsRemaining: number;
};

export async function getAIUsageState(
  store: AIUsageStoreInput,
): Promise<{
  allowance: number;
  used: number;
  remaining: number;
  periodKey: string;
  topupRemaining: number;
}> {
  const allowance = getStorePlan({
    subscriptionPlan: store.subscriptionPlan,
    subscriptionStatus: store.subscriptionStatus,
  }).limits.aiMonthlyAllowance;

  const periodKey = getCurrentPeriodKey(store.planRenewsAt);

  const row = await prisma.aIUsage.findUnique({
    where: {
      storeId_periodKey: { storeId: store.id, periodKey },
    },
    select: { count: true },
  });

  const used = row?.count ?? 0;

  return {
    allowance,
    used,
    remaining: Math.max(0, allowance - used),
    periodKey,
    topupRemaining: store.aiTopupCreditsRemaining,
  };
}

export async function consumeAIUse(
  store: AIUsageStoreInput,
): Promise<
  | { ok: true; remaining: number; usedTopup?: true }
  | { ok: false; reason: string; allowance: number; used: number }
> {
  const allowance = getStorePlan({
    subscriptionPlan: store.subscriptionPlan,
    subscriptionStatus: store.subscriptionStatus,
  }).limits.aiMonthlyAllowance;

  const periodKey = getCurrentPeriodKey(store.planRenewsAt);

  const row = await prisma.aIUsage.findUnique({
    where: {
      storeId_periodKey: { storeId: store.id, periodKey },
    },
    select: { count: true },
  });

  const used = row?.count ?? 0;

  if (allowance > 0 && used < allowance) {
    const updated = await prisma.aIUsage.upsert({
      where: {
        storeId_periodKey: { storeId: store.id, periodKey },
      },
      create: {
        storeId: store.id,
        periodKey,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
      select: { count: true },
    });

    return { ok: true, remaining: allowance - updated.count };
  }

  const spent = await prisma.store.updateMany({
    where: { id: store.id, aiTopupCreditsRemaining: { gt: 0 } },
    data: { aiTopupCreditsRemaining: { decrement: 1 } },
  });

  if (spent.count === 1) {
    return { ok: true, remaining: 0, usedTopup: true };
  }

  return {
    ok: false,
    reason: "You're out of AI uses. Buy more AI uses or upgrade your plan.",
    allowance,
    used,
  };
}

export async function recordAITokens(
  storeId: string,
  planRenewsAt: Date | null,
  promptTokens: number,
  completionTokens: number,
): Promise<void> {
  if (promptTokens <= 0 && completionTokens <= 0) return;
  const periodKey = getCurrentPeriodKey(planRenewsAt);
  await prisma.aIUsage.upsert({
    where: { storeId_periodKey: { storeId, periodKey } },
    create: {
      storeId,
      periodKey,
      count: 0,
      tokenPromptTotal: promptTokens,
      tokenCompletionTotal: completionTokens,
    },
    update: {
      tokenPromptTotal: { increment: promptTokens },
      tokenCompletionTotal: { increment: completionTokens },
    },
  });
}
