import { getCurrentPeriodKey } from "@/lib/finance/ai-usage-period";
import { getStorePlan } from "@/lib/finance/store-plan";
import { prisma } from "@/lib/prisma";

export type AIUsageStoreInput = {
  id: string;
  subscriptionPlan: string | null;
  subscriptionStatus?: string | null;
  planRenewsAt: Date | null;
};

export async function getAIUsageState(
  store: AIUsageStoreInput,
): Promise<{ allowance: number; used: number; remaining: number; periodKey: string }> {
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
  };
}

export async function consumeAIUse(
  store: AIUsageStoreInput,
): Promise<
  | { ok: true; remaining: number }
  | { ok: false; reason: string; allowance: number; used: number }
> {
  const allowance = getStorePlan({
    subscriptionPlan: store.subscriptionPlan,
    subscriptionStatus: store.subscriptionStatus,
  }).limits.aiMonthlyAllowance;

  const periodKey = getCurrentPeriodKey(store.planRenewsAt);

  if (allowance <= 0) {
    return {
      ok: false,
      reason: "AI is not included on your plan.",
      allowance: 0,
      used: 0,
    };
  }

  const row = await prisma.aIUsage.findUnique({
    where: {
      storeId_periodKey: { storeId: store.id, periodKey },
    },
    select: { count: true },
  });

  const used = row?.count ?? 0;

  if (used >= allowance) {
    return {
      ok: false,
      reason: `You've used all ${allowance} of your AI uses for this period. They reset on your next plan renewal.`,
      allowance,
      used,
    };
  }

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
