"use server";

import { revalidatePath } from "next/cache";

import { getAppBaseUrl } from "@/lib/app-base-url";
import { mapSubscriptionIntervalToStripe } from "@/lib/finance/subscription-interval";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/stripe";
import { isStoreSellable } from "@/lib/store/sellable-store";

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
