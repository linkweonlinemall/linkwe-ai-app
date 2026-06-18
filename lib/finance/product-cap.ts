import { prisma } from "@/lib/prisma";
import { getStorePlan } from "@/lib/finance/store-plan";

/**
 * Checks whether a store can create `count` more products under its plan cap.
 * Counts only real products: isService = false, isArchived = false. Drafts count.
 * Returns { ok: true } if allowed, or { ok: false, reason } if it would exceed the cap.
 * Pro (null cap) is unlimited.
 */
export async function checkProductCap(
  storeId: string,
  subscriptionPlan: string | null,
  subscriptionStatus: string | null,
  count: number = 1,
): Promise<{ ok: true } | { ok: false; reason: string; cap: number; current: number }> {
  const { plan, limits } = getStorePlan({ subscriptionPlan, subscriptionStatus });
  if (limits.productCap === null) return { ok: true }; // unlimited (Pro)
  const current = await prisma.product.count({
    where: { storeId, isService: false, isArchived: false },
  });
  if (current + count > limits.productCap) {
    return {
      ok: false,
      cap: limits.productCap,
      current,
      reason: `You've reached your ${plan.charAt(0) + plan.slice(1).toLowerCase()} plan limit of ${limits.productCap} products. Upgrade your plan to add more.`,
    };
  }
  return { ok: true };
}
