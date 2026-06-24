"use server";

import { revalidatePath } from "next/cache";

import { getAppBaseUrl } from "@/lib/app-base-url";
import { mapSubscriptionIntervalToStripe } from "@/lib/finance/subscription-interval";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/stripe";
import { isStoreSellable } from "@/lib/store/sellable-store";

export type MyServiceSubscriptionRow = {
  id: string;
  status: "ACTIVE" | "PAST_DUE" | "CANCELED";
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  priceMinor: number;
  interval: string;
  createdAt: Date;
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

  const subscriptions = [...rows].sort((a, b) => {
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

  const recurring = mapSubscriptionIntervalToStripe(service.subscriptionInterval);
  if (!recurring) return { ok: false, error: "invalid_interval" };

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

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, fullName: true, stripeCustomerId: true },
  });
  if (!user) return { ok: false, error: "not_logged_in" };

  let stripeCustomerId = user.stripeCustomerId;
  if (!stripeCustomerId) {
    try {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.fullName,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    } catch (e) {
      console.error("[startServiceSubscriptionCheckout] stripe customer create failed", e);
      return { ok: false, error: "checkout_failed" };
    }
  }

  const priceMinor = Math.round(service.price * 100);
  if (priceMinor < 1) return { ok: false, error: "invalid_price" };

  const baseUrl = getAppBaseUrl();
  const subscriptionMetadata = {
    type: "customer_service_subscription",
    productId: service.id,
    storeId: service.store.id,
    customerId: session.userId,
  };

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: "ttd",
            product_data: { name: service.name },
            unit_amount: priceMinor,
            recurring,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard/customer?sub=success`,
      cancel_url: `${baseUrl}/service/${service.slug}?sub=cancelled`,
      metadata: subscriptionMetadata,
      subscription_data: { metadata: subscriptionMetadata },
    });

    if (!checkoutSession.url) return { ok: false, error: "checkout_failed" };
    return { ok: true, checkoutUrl: checkoutSession.url };
  } catch (e) {
    console.error("[startServiceSubscriptionCheckout] checkout session failed", e);
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
      stripeSubscriptionId: true,
      status: true,
      cancelAtPeriodEnd: true,
      product: { select: { slug: true } },
    },
  });

  if (!row) return { ok: false, error: "not_found" };
  if (!row.stripeSubscriptionId) return { ok: false, error: "no_subscription" };
  if (row.status !== "ACTIVE") return { ok: false, error: "not_active" };
  if (row.cancelAtPeriodEnd) return { ok: true };

  try {
    await stripe.subscriptions.update(row.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  } catch (e) {
    console.error("[cancelMyServiceSubscription] stripe failed", e);
    return { ok: false, error: "stripe_failed" };
  }

  await prisma.customerServiceSubscription.update({
    where: { id: row.id },
    data: { cancelAtPeriodEnd: true },
  });

  revalidatePath(`/service/${row.product.slug}`);
  revalidatePath("/dashboard/customer");
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
      stripeSubscriptionId: true,
      status: true,
      cancelAtPeriodEnd: true,
      product: { select: { slug: true } },
    },
  });

  if (!row) return { ok: false, error: "not_found" };
  if (!row.stripeSubscriptionId) return { ok: false, error: "no_subscription" };
  if (row.status !== "ACTIVE") return { ok: false, error: "not_active" };
  if (!row.cancelAtPeriodEnd) return { ok: true };

  try {
    await stripe.subscriptions.update(row.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
  } catch (e) {
    console.error("[resumeMyServiceSubscription] stripe failed", e);
    return { ok: false, error: "stripe_failed" };
  }

  await prisma.customerServiceSubscription.update({
    where: { id: row.id },
    data: { cancelAtPeriodEnd: false },
  });

  revalidatePath(`/service/${row.product.slug}`);
  revalidatePath("/dashboard/customer");
  return { ok: true };
}
