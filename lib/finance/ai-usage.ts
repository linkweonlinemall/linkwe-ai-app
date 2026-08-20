import { getCurrentPeriodKey } from "@/lib/finance/ai-usage-period";
import { getStorePlan } from "@/lib/finance/store-plan";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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

  if (allowance > 0) {
    // Keep the limit check and increment in the same database statement. Without
    // this condition, concurrent requests near the limit can both pass a stale
    // read and either exceed the allowance or spend a top-up unnecessarily.
    const incremented = await prisma.aIUsage.updateMany({
      where: { storeId: store.id, periodKey, count: { lt: allowance } },
      data: { count: { increment: 1 } },
    });

    if (incremented.count === 1) {
      const updated = await prisma.aIUsage.findUniqueOrThrow({
        where: { storeId_periodKey: { storeId: store.id, periodKey } },
        select: { count: true },
      });
      return { ok: true, remaining: Math.max(0, allowance - updated.count) };
    }

    try {
      await prisma.aIUsage.create({
        data: { storeId: store.id, periodKey, count: 1 },
      });
      return { ok: true, remaining: allowance - 1 };
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2002"
      ) {
        throw error;
      }

      // Another request created the period row between updateMany and create.
      // Retry the conditional increment once against that new row.
      const retried = await prisma.aIUsage.updateMany({
        where: { storeId: store.id, periodKey, count: { lt: allowance } },
        data: { count: { increment: 1 } },
      });
      if (retried.count === 1) {
        const updated = await prisma.aIUsage.findUniqueOrThrow({
          where: { storeId_periodKey: { storeId: store.id, periodKey } },
          select: { count: true },
        });
        return { ok: true, remaining: Math.max(0, allowance - updated.count) };
      }
    }
  }

  const spent = await prisma.store.updateMany({
    where: { id: store.id, aiTopupCreditsRemaining: { gt: 0 } },
    data: { aiTopupCreditsRemaining: { decrement: 1 } },
  });

  if (spent.count === 1) {
    return { ok: true, remaining: 0, usedTopup: true };
  }

  const row = await prisma.aIUsage.findUnique({
    where: { storeId_periodKey: { storeId: store.id, periodKey } },
    select: { count: true },
  });

  return {
    ok: false,
    reason: "You're out of AI uses. Buy more AI uses or upgrade your plan.",
    allowance,
    used: row?.count ?? 0,
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
