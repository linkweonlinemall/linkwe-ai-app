import { prisma } from "@/lib/prisma";

function shiftDate(value: Date | null, milliseconds: number): Date | null {
  return value ? new Date(value.getTime() + milliseconds) : null;
}

/** Restores a paused subscription and moves its paid-through date by the time paused. */
export async function resumePausedServiceSubscription(
  subscriptionId: string,
  now = new Date(),
  customerId?: string,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const subscription = await tx.customerServiceSubscription.findFirst({
      where: {
        id: subscriptionId,
        status: "PAUSED",
        ...(customerId ? { customerId } : {}),
      },
      select: {
        pausedAt: true,
        pauseEndsAt: true,
        currentPeriodEnd: true,
        nextChargeAt: true,
        pauseUsedSeconds: true,
      },
    });
    if (!subscription?.pausedAt) return false;

    const effectiveResumeAt =
      subscription.pauseEndsAt && subscription.pauseEndsAt < now
        ? subscription.pauseEndsAt
        : now;
    const pausedMilliseconds = Math.max(
      0,
      effectiveResumeAt.getTime() - subscription.pausedAt.getTime(),
    );
    const pausedSeconds = Math.ceil(pausedMilliseconds / 1_000);
    const changed = await tx.customerServiceSubscription.updateMany({
      where: {
        id: subscriptionId,
        status: "PAUSED",
        pausedAt: subscription.pausedAt,
      },
      data: {
        status: "ACTIVE",
        pausedAt: null,
        pauseEndsAt: null,
        pauseUsedSeconds: { increment: pausedSeconds },
        currentPeriodEnd: shiftDate(subscription.currentPeriodEnd, pausedMilliseconds),
        nextChargeAt: shiftDate(subscription.nextChargeAt, pausedMilliseconds),
      },
    });
    return changed.count === 1;
  }, { isolationLevel: "Serializable" });
}
