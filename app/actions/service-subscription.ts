"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { isStoreSellable } from "@/lib/store/sellable-store";
import { beginWiPaySubscription } from "@/lib/wipay/subscriptions";

export type MyServiceSubscriptionRow = {
  id: string;
  status: "ACTIVE" | "PAST_DUE" | "CANCELED";
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  nextChargeAt: Date | null;
  canceledAt: Date | null;
  priceMinor: number;
  interval: string;
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
  status: "ACTIVE" | "PAST_DUE" | "CANCELED";
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  priceMinor: number;
  interval: string;
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
      isPublished: true,
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
  if (!service.isPublished) return { ok: false, error: "unavailable" };
  if (!isStoreSellable(service.store)) return { ok: false, error: "store_unavailable" };

  const interval = service.subscriptionInterval?.toLowerCase();
  if (!interval || !["weekly", "fortnightly", "monthly", "quarterly"].includes(interval)) {
    return { ok: false, error: "invalid_interval" };
  }

  if (service.price <= 0) return { ok: false, error: "invalid_price" };

  if (service.store.ownerId === session.userId) {
    return { ok: false, error: "own_service" };
  }

  const existingActive = await prisma.customerServiceSubscription.findFirst({
    where: {
      customerId: session.userId,
      productId: service.id,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (existingActive) return { ok: false, error: "already_subscribed" };

  const priceMinor = Math.round(service.price * 100);
  if (priceMinor < 1) return { ok: false, error: "invalid_price" };

  try {
    const checkoutUrl = await beginWiPaySubscription({
      userId: session.userId,
      purpose: "SERVICE_SUBSCRIPTION",
      targetId: service.id,
      amountMinor: priceMinor,
      metadata: {
        storeId: service.store.id,
        interval,
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
      product: {
        select: {
          isPublished: true,
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
  if (subscription.cancelAtPeriodEnd) return { ok: false, error: "ending" };
  if (!subscription.product.isPublished || !isStoreSellable(subscription.product.store)) {
    return { ok: false, error: "unavailable" };
  }

  const renewWindow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  if (subscription.currentPeriodEnd && subscription.currentPeriodEnd > renewWindow) {
    return { ok: false, error: "too_early" };
  }

  try {
    const checkoutUrl = await beginWiPaySubscription({
      userId: session.userId,
      purpose: "SERVICE_SUBSCRIPTION",
      targetId: subscription.productId,
      amountMinor: subscription.priceMinor,
      metadata: {
        storeId: subscription.storeId,
        interval: subscription.interval,
        subscriptionId: subscription.id,
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
      wipayTrustedCardId: true,
      status: true,
      cancelAtPeriodEnd: true,
      product: { select: { slug: true } },
    },
  });

  if (!row) return { ok: false, error: "not_found" };
  if (!row.wipayTrustedCardId) return { ok: false, error: "no_subscription" };
  if (row.status !== "ACTIVE") return { ok: false, error: "not_active" };
  if (row.cancelAtPeriodEnd) return { ok: true };

  await prisma.customerServiceSubscription.update({
    where: { id: row.id },
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
      wipayTrustedCardId: true,
      status: true,
      cancelAtPeriodEnd: true,
      product: { select: { slug: true } },
    },
  });

  if (!row) return { ok: false, error: "not_found" };
  if (!row.wipayTrustedCardId) return { ok: false, error: "no_subscription" };
  if (row.status !== "ACTIVE") return { ok: false, error: "not_active" };
  if (!row.cancelAtPeriodEnd) return { ok: true };

  await prisma.customerServiceSubscription.update({
    where: { id: row.id },
    data: {
      cancelAtPeriodEnd: false,
    },
  });

  revalidatePath(`/service/${row.product.slug}`);
  revalidatePath("/dashboard/customer");
  revalidatePath("/dashboard/customer/subscriptions");
  return { ok: true };
}
