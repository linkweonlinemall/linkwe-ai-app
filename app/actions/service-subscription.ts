"use server";

import { NotificationType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { resumePausedServiceSubscription } from "@/lib/finance/resume-service-subscription";
import { createNotification } from "@/lib/notifications/create";
import { prisma } from "@/lib/prisma";
import { isStoreSellable } from "@/lib/store/sellable-store";
import { beginWiPayManualSubscription } from "@/lib/wipay/subscriptions";

export type MyServiceSubscriptionRow = {
  id: string;
  status: "ACTIVE" | "PAUSED" | "PAST_DUE" | "CANCELED";
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  nextChargeAt: Date | null;
  canceledAt: Date | null;
  priceMinor: number;
  interval: string;
  sessionsIncluded: number | null;
  sessionsRemaining: number | null;
  cancellationNoticeDays: number;
  canPause: boolean;
  pauseMaxWeeks: number | null;
  pausedAt: Date | null;
  pauseEndsAt: Date | null;
  trialEndsAt: Date | null;
  createdAt: Date;
  canRenew: boolean;
  product: {
    name: string;
    slug: string;
    images: string[];
    isPublished: boolean;
  };
  store: {
    name: string;
    slug: string;
  };
};

export async function getMyServiceSubscriptions(): Promise<
  { ok: true; subscriptions: MyServiceSubscriptionRow[] } | { ok: false; error: "not_logged_in" }
> {
  const session = await getSession();
  if (!session) return { ok: false, error: "not_logged_in" };

  const rows = await prisma.customerServiceSubscription.findMany({
    where: { customerId: session.userId },
    select: {
      id: true,
      status: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: true,
      nextChargeAt: true,
      canceledAt: true,
      priceMinor: true,
      interval: true,
      sessionsIncluded: true,
      sessionsRemaining: true,
      cancellationNoticeDays: true,
      canPause: true,
      pauseMaxWeeks: true,
      pauseUsedSeconds: true,
      pausedAt: true,
      pauseEndsAt: true,
      trialEndsAt: true,
      createdAt: true,
      product: {
        select: {
          name: true,
          slug: true,
          images: true,
          isPublished: true,
        },
      },
      store: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const statusRank = (status: MyServiceSubscriptionRow["status"]) =>
    status === "CANCELED" ? 1 : 0;

  const renewalWindowEnd = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const subscriptions: MyServiceSubscriptionRow[] = rows.map((row) => ({
    ...row,
    canRenew:
      !row.cancelAtPeriodEnd &&
      (!row.currentPeriodEnd || row.currentPeriodEnd.getTime() <= renewalWindowEnd),
  })).sort((a, b) => {
    const byStatus = statusRank(a.status) - statusRank(b.status);
    if (byStatus !== 0) return byStatus;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return { ok: true, subscriptions };
}

export type StoreSubscriberRow = {
  id: string;
  status: "ACTIVE" | "PAUSED" | "PAST_DUE" | "CANCELED";
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  priceMinor: number;
  interval: string;
  sessionsIncluded: number | null;
  sessionsRemaining: number | null;
  pausedAt: Date | null;
  pauseEndsAt: Date | null;
  trialEndsAt: Date | null;
  createdAt: Date;
  customer: { fullName: string | null };
  product: { name: string; slug: string };
};

export type StoreSubscribersSummary = {
  activeCount: number;
  monthlyRecurringRevenueMinor: number;
};

function priceMinorToMonthlyMinor(priceMinor: number, interval: string): number {
  const key = interval.trim().toLowerCase();
  switch (key) {
    case "weekly":
      return Math.round((priceMinor * 52) / 12);
    case "fortnightly":
      return Math.round((priceMinor * 26) / 12);
    case "monthly":
      return priceMinor;
    case "quarterly":
      return Math.round(priceMinor / 3);
    default:
      return priceMinor;
  }
}

export async function getMyStoreSubscribers(): Promise<
  | { ok: true; subscribers: StoreSubscriberRow[]; summary: StoreSubscribersSummary }
  | { ok: false; error: "not_logged_in" | "not_vendor" | "no_store" }
> {
  const session = await getSession();
  if (!session) return { ok: false, error: "not_logged_in" };
  if (session.role !== "VENDOR") return { ok: false, error: "not_vendor" };

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) return { ok: false, error: "no_store" };

  const rows = await prisma.customerServiceSubscription.findMany({
    where: { storeId: store.id },
    select: {
      id: true,
      status: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: true,
      canceledAt: true,
      priceMinor: true,
      interval: true,
      sessionsIncluded: true,
      sessionsRemaining: true,
      pausedAt: true,
      pauseEndsAt: true,
      trialEndsAt: true,
      createdAt: true,
      customer: { select: { fullName: true } },
      product: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const statusRank = (status: StoreSubscriberRow["status"]) => (status === "CANCELED" ? 1 : 0);

  const subscribers = [...rows].sort((a, b) => {
    const byStatus = statusRank(a.status) - statusRank(b.status);
    if (byStatus !== 0) return byStatus;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const activeRows = subscribers.filter((s) => s.status === "ACTIVE");
  const monthlyRecurringRevenueMinor = activeRows.reduce(
    (sum, row) => sum + priceMinorToMonthlyMinor(row.priceMinor, row.interval),
    0,
  );

  return {
    ok: true,
    subscribers,
    summary: {
      activeCount: activeRows.length,
      monthlyRecurringRevenueMinor,
    },
  };
}

export async function startServiceSubscriptionCheckout(
  productId: string,
): Promise<{ ok: true; checkoutUrl: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "not_logged_in" };

  const service = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      isService: true,
      serviceType: true,
      subscriptionInterval: true,
      sessionsIncluded: true,
      subscriptionCancellationDays: true,
      subscriptionTrialPeriod: true,
      subscriptionTrialPrice: true,
      subscriptionCanPause: true,
      subscriptionPauseMaxWeeks: true,
      isPublished: true,
      isArchived: true,
      isAvailable: true,
      storeId: true,
      store: {
        select: {
          id: true,
          slug: true,
          status: true,
          ownerId: true,
          owner: { select: { idVerificationStatus: true } },
        },
      },
    },
  });

  if (!service) return { ok: false, error: "service_not_found" };
  if (!service.isService) return { ok: false, error: "invalid_service" };
  if (service.serviceType !== "SUBSCRIPTION") return { ok: false, error: "not_subscription" };
  if (!service.isPublished || service.isArchived || !service.isAvailable) {
    return { ok: false, error: "unavailable" };
  }
  if (!isStoreSellable(service.store)) return { ok: false, error: "store_unavailable" };

  const interval = service.subscriptionInterval?.toLowerCase();
  if (!interval || !["weekly", "fortnightly", "monthly", "quarterly"].includes(interval)) {
    return { ok: false, error: "invalid_interval" };
  }

  if (!Number.isFinite(service.price) || service.price <= 0) {
    return { ok: false, error: "invalid_price" };
  }

  if (service.store.ownerId === session.userId) {
    return { ok: false, error: "own_service" };
  }

  const previousSubscription = await prisma.customerServiceSubscription.findFirst({
    where: {
      customerId: session.userId,
      productId: service.id,
    },
    select: { id: true, status: true },
    orderBy: { createdAt: "desc" },
  });
  if (
    previousSubscription &&
    ["ACTIVE", "PAUSED", "PAST_DUE"].includes(previousSubscription.status)
  ) {
    return { ok: false, error: "already_subscribed" };
  }

  const priceMinor = Math.round(service.price * 100);
  if (priceMinor < 1) return { ok: false, error: "invalid_price" };

  const trialDays =
    !previousSubscription &&
    service.subscriptionTrialPeriod != null &&
    Number.isInteger(service.subscriptionTrialPeriod) &&
    service.subscriptionTrialPeriod > 0
      ? service.subscriptionTrialPeriod
      : 0;
  const trialPriceMinor = trialDays > 0
    ? Math.round((service.subscriptionTrialPrice ?? 0) * 100)
    : priceMinor;
  if (!Number.isFinite(trialPriceMinor) || trialPriceMinor < 0 || trialPriceMinor > priceMinor) {
    return { ok: false, error: "invalid_trial_price" };
  }
  const sessionsIncluded =
    service.sessionsIncluded != null && service.sessionsIncluded > 0
      ? service.sessionsIncluded
      : null;
  const cancellationNoticeDays = Math.max(0, service.subscriptionCancellationDays ?? 0);
  const canPause = service.subscriptionCanPause && (service.subscriptionPauseMaxWeeks ?? 0) > 0;
  const pauseMaxWeeks = canPause ? service.subscriptionPauseMaxWeeks : null;

  if (trialDays > 0 && trialPriceMinor === 0) {
    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setUTCDate(trialEndsAt.getUTCDate() + trialDays);
    try {
      await prisma.customerServiceSubscription.create({
        data: {
          customerId: session.userId,
          productId: service.id,
          storeId: service.store.id,
          status: "ACTIVE",
          currentPeriodEnd: trialEndsAt,
          nextChargeAt: trialEndsAt,
          priceMinor,
          interval,
          sessionsIncluded,
          sessionsRemaining: sessionsIncluded,
          cancellationNoticeDays,
          canPause,
          pauseMaxWeeks,
          trialStartedAt: now,
          trialEndsAt,
        },
      });
      revalidatePath(`/service/${service.slug}`);
      revalidatePath("/dashboard/customer/subscriptions");
      return { ok: true, checkoutUrl: "/dashboard/customer/subscriptions?trial=started" };
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        return { ok: false, error: "already_subscribed" };
      }
      throw error;
    }
  }

  try {
    const checkoutUrl = await beginWiPayManualSubscription({
      userId: session.userId,
      purpose: "SERVICE_SUBSCRIPTION",
      targetId: service.id,
      amountMinor: trialPriceMinor,
      metadata: {
        storeId: service.store.id,
        interval,
        regularPriceMinor: priceMinor,
        trialDays,
        sessionsIncluded,
        cancellationNoticeDays,
        canPause,
        pauseMaxWeeks,
      },
    });
    return { ok: true, checkoutUrl };
  } catch (e) {
    console.error("[startServiceSubscriptionCheckout] WiPay checkout failed", e);
    return { ok: false, error: "checkout_failed" };
  }
}

export async function renewMyServiceSubscription(
  subscriptionId: string,
): Promise<{ ok: true; checkoutUrl: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "not_logged_in" };

  const subscription = await prisma.customerServiceSubscription.findFirst({
    where: { id: subscriptionId, customerId: session.userId },
    select: {
      id: true,
      productId: true,
      storeId: true,
      status: true,
      priceMinor: true,
      interval: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      sessionsIncluded: true,
      cancellationNoticeDays: true,
      canPause: true,
      pauseMaxWeeks: true,
      product: {
        select: {
          isPublished: true,
          isArchived: true,
          isAvailable: true,
          store: {
            select: {
              status: true,
              owner: { select: { idVerificationStatus: true } },
            },
          },
        },
      },
    },
  });
  if (!subscription) return { ok: false, error: "not_found" };
  if (subscription.status === "PAUSED") return { ok: false, error: "paused" };
  if (subscription.cancelAtPeriodEnd) return { ok: false, error: "ending" };
  if (
    !subscription.product.isPublished ||
    subscription.product.isArchived ||
    !subscription.product.isAvailable ||
    !isStoreSellable(subscription.product.store)
  ) {
    return { ok: false, error: "unavailable" };
  }

  const renewWindow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  if (subscription.currentPeriodEnd && subscription.currentPeriodEnd > renewWindow) {
    return { ok: false, error: "too_early" };
  }

  try {
    const checkoutUrl = await beginWiPayManualSubscription({
      userId: session.userId,
      purpose: "SERVICE_SUBSCRIPTION",
      targetId: subscription.productId,
      amountMinor: subscription.priceMinor,
      metadata: {
        storeId: subscription.storeId,
        interval: subscription.interval,
        subscriptionId: subscription.id,
        regularPriceMinor: subscription.priceMinor,
        sessionsIncluded: subscription.sessionsIncluded,
        cancellationNoticeDays: subscription.cancellationNoticeDays,
        canPause: subscription.canPause,
        pauseMaxWeeks: subscription.pauseMaxWeeks,
      },
    });
    return { ok: true, checkoutUrl };
  } catch (error) {
    console.error("[renewMyServiceSubscription] WiPay checkout failed", error);
    return { ok: false, error: "checkout_failed" };
  }
}

export async function cancelMyServiceSubscription(
  subscriptionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "not_logged_in" };

  const row = await prisma.customerServiceSubscription.findFirst({
    where: {
      id: subscriptionId,
      customerId: session.userId,
    },
    select: {
      id: true,
      status: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: true,
      cancellationNoticeDays: true,
      product: { select: { slug: true } },
    },
  });

  if (!row) return { ok: false, error: "not_found" };
  if (row.status !== "ACTIVE" && row.status !== "PAST_DUE") {
    return { ok: false, error: "not_active" };
  }
  if (row.cancelAtPeriodEnd) return { ok: true };
  if (
    row.status === "ACTIVE" &&
    row.currentPeriodEnd &&
    row.cancellationNoticeDays > 0 &&
    Date.now() > row.currentPeriodEnd.getTime() - row.cancellationNoticeDays * 24 * 60 * 60 * 1000
  ) {
    return { ok: false, error: "notice_period" };
  }

  await prisma.customerServiceSubscription.updateMany({
    where: {
      id: row.id,
      customerId: session.userId,
      status: { in: ["ACTIVE", "PAST_DUE"] },
      cancelAtPeriodEnd: false,
    },
    data: {
      cancelAtPeriodEnd: true,
    },
  });

  revalidatePath(`/service/${row.product.slug}`);
  revalidatePath("/dashboard/customer");
  revalidatePath("/dashboard/customer/subscriptions");
  return { ok: true };
}

export async function resumeMyServiceSubscription(
  subscriptionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "not_logged_in" };

  const row = await prisma.customerServiceSubscription.findFirst({
    where: {
      id: subscriptionId,
      customerId: session.userId,
    },
    select: {
      id: true,
      status: true,
      cancelAtPeriodEnd: true,
      product: { select: { slug: true } },
    },
  });

  if (!row) return { ok: false, error: "not_found" };
  if (row.status !== "ACTIVE" && row.status !== "PAST_DUE") {
    return { ok: false, error: "not_active" };
  }
  if (!row.cancelAtPeriodEnd) return { ok: true };

  await prisma.customerServiceSubscription.updateMany({
    where: {
      id: row.id,
      customerId: session.userId,
      status: { in: ["ACTIVE", "PAST_DUE"] },
      cancelAtPeriodEnd: true,
    },
    data: {
      cancelAtPeriodEnd: false,
    },
  });

  revalidatePath(`/service/${row.product.slug}`);
  revalidatePath("/dashboard/customer");
  revalidatePath("/dashboard/customer/subscriptions");
  return { ok: true };
}

export async function pauseMyServiceSubscription(
  subscriptionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "not_logged_in" };

  const row = await prisma.customerServiceSubscription.findFirst({
    where: { id: subscriptionId, customerId: session.userId },
    select: {
      status: true,
      canPause: true,
      pauseMaxWeeks: true,
      pauseUsedSeconds: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: true,
      product: { select: { slug: true } },
    },
  });
  if (!row) return { ok: false, error: "not_found" };
  if (row.status !== "ACTIVE") return { ok: false, error: "not_active" };
  if (!row.canPause || !row.pauseMaxWeeks || row.pauseMaxWeeks < 1) {
    return { ok: false, error: "pause_unavailable" };
  }
  const pauseSecondsRemaining = row.pauseMaxWeeks * 7 * 24 * 60 * 60 - row.pauseUsedSeconds;
  if (pauseSecondsRemaining <= 0) return { ok: false, error: "pause_limit_used" };
  if (row.cancelAtPeriodEnd) return { ok: false, error: "ending" };
  if (!row.currentPeriodEnd || row.currentPeriodEnd <= new Date()) {
    return { ok: false, error: "renewal_due" };
  }

  const pausedAt = new Date();
  const pauseEndsAt = new Date(pausedAt.getTime() + pauseSecondsRemaining * 1_000);
  const changed = await prisma.customerServiceSubscription.updateMany({
    where: {
      id: subscriptionId,
      customerId: session.userId,
      status: "ACTIVE",
      cancelAtPeriodEnd: false,
    },
    data: { status: "PAUSED", pausedAt, pauseEndsAt },
  });
  if (changed.count !== 1) return { ok: false, error: "not_active" };

  revalidatePath(`/service/${row.product.slug}`);
  revalidatePath("/dashboard/customer/subscriptions");
  return { ok: true };
}

export async function unpauseMyServiceSubscription(
  subscriptionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "not_logged_in" };
  const row = await prisma.customerServiceSubscription.findFirst({
    where: { id: subscriptionId, customerId: session.userId },
    select: { status: true, product: { select: { slug: true } } },
  });
  if (!row) return { ok: false, error: "not_found" };
  if (row.status !== "PAUSED") return { ok: false, error: "not_paused" };

  const resumed = await resumePausedServiceSubscription(subscriptionId, new Date(), session.userId);
  if (!resumed) return { ok: false, error: "not_paused" };
  revalidatePath(`/service/${row.product.slug}`);
  revalidatePath("/dashboard/customer/subscriptions");
  return { ok: true };
}

export async function recordServiceSubscriptionSession(
  subscriptionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { ok: false, error: "not_vendor" };
  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) return { ok: false, error: "no_store" };

  const recorded = await prisma.$transaction(async (tx) => {
    const changed = await tx.customerServiceSubscription.updateMany({
      where: {
        id: subscriptionId,
        storeId: store.id,
        status: "ACTIVE",
        currentPeriodEnd: { gt: new Date() },
        sessionsRemaining: { gt: 0 },
      },
      data: { sessionsRemaining: { decrement: 1 } },
    });
    if (changed.count !== 1) return null;
    await tx.serviceSubscriptionSessionUsage.create({
      data: { subscriptionId, recordedById: session.userId },
    });
    return tx.customerServiceSubscription.findUnique({
      where: { id: subscriptionId },
      select: {
        customerId: true,
        sessionsRemaining: true,
        product: { select: { name: true } },
      },
    });
  }, { isolationLevel: "Serializable" });
  if (!recorded) return { ok: false, error: "session_unavailable" };
  await Promise.allSettled([
    createNotification({
      userId: recorded.customerId,
      type: NotificationType.GENERAL,
      title: "Subscription session recorded",
      body: `${recorded.product.name}: ${recorded.sessionsRemaining ?? 0} session${recorded.sessionsRemaining === 1 ? "" : "s"} remaining this cycle.`,
      linkUrl: "/dashboard/customer/subscriptions",
    }),
  ]);
  revalidatePath("/dashboard/vendor/subscribers");
  revalidatePath("/dashboard/customer/subscriptions");
  return { ok: true };
}
