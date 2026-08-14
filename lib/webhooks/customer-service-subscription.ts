import { CustomerSubscriptionStatus, Prisma } from "@prisma/client";
import type Stripe from "stripe";

import { createVendorEarningsLedgerPair } from "@/lib/finance/release-earnings";
import { mapSubscriptionIntervalToStripe } from "@/lib/finance/subscription-interval";
import { resolveVendorPlan } from "@/lib/finance/vendor-plan";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/stripe";

const CUSTOMER_SERVICE_SUBSCRIPTION_TYPE = "customer_service_subscription";

function subscriptionIdFromRef(
  subRef: string | Stripe.Subscription | null | undefined,
): string | null {
  if (!subRef) return null;
  return typeof subRef === "string" ? subRef : (subRef.id ?? null);
}

async function resolveRenewalDate(
  subscriptionId: string | null,
  fallbackUnix?: number | null,
): Promise<Date> {
  if (fallbackUnix && fallbackUnix > 0) return new Date(fallbackUnix * 1000);
  if (subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items"] });
      const periodEnd = sub.items?.data?.[0]?.current_period_end;
      if (periodEnd) return new Date(periodEnd * 1000);
    } catch (e) {
      console.error("[webhook/customer-sub] could not retrieve subscription for period end", e);
    }
  }
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

type EnsureRowInput = {
  productId: string;
  storeId: string;
  customerId: string;
  stripeSubscriptionId: string;
  currentPeriodEnd: Date;
};

async function ensureCustomerServiceSubscriptionRow(
  input: EnsureRowInput,
): Promise<{ id: string; productName: string } | null> {
  const existing = await prisma.customerServiceSubscription.findFirst({
    where: { stripeSubscriptionId: input.stripeSubscriptionId },
    select: { id: true, product: { select: { name: true } } },
  });
  if (existing) {
    return { id: existing.id, productName: existing.product.name };
  }

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: {
      id: true,
      name: true,
      price: true,
      subscriptionInterval: true,
      isService: true,
      serviceType: true,
      storeId: true,
    },
  });

  if (!product || !product.isService || product.serviceType !== "SUBSCRIPTION") {
    console.error("[webhook/customer-sub] invalid or missing product", input.productId);
    return null;
  }

  if (product.storeId !== input.storeId) {
    console.error("[webhook/customer-sub] product storeId mismatch", input.productId);
    return null;
  }

  const interval = product.subscriptionInterval?.trim().toLowerCase() ?? "";
  if (!mapSubscriptionIntervalToStripe(interval)) {
    console.error("[webhook/customer-sub] product missing valid billing interval", input.productId);
    return null;
  }

  const priceMinor = Math.round(product.price * 100);
  if (priceMinor < 1) {
    console.error("[webhook/customer-sub] product price invalid", input.productId);
    return null;
  }

  try {
    const created = await prisma.customerServiceSubscription.create({
      data: {
        customerId: input.customerId,
        productId: input.productId,
        storeId: input.storeId,
        stripeSubscriptionId: input.stripeSubscriptionId,
        status: CustomerSubscriptionStatus.ACTIVE,
        currentPeriodEnd: input.currentPeriodEnd,
        priceMinor,
        interval,
        cancelAtPeriodEnd: false,
      },
      select: { id: true, product: { select: { name: true } } },
    });
    return { id: created.id, productName: created.product.name };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const raced = await prisma.customerServiceSubscription.findFirst({
        where: { stripeSubscriptionId: input.stripeSubscriptionId },
        select: { id: true, product: { select: { name: true } } },
      });
      if (raced) return { id: raced.id, productName: raced.product.name };
    }
    console.error("[webhook/customer-sub] row create failed", e);
    return null;
  }
}

export async function handleCustomerServiceSubscriptionCheckout(
  checkoutSession: Stripe.Checkout.Session,
): Promise<void> {
  try {
    if (
      checkoutSession.mode !== "subscription" ||
      checkoutSession.metadata?.type !== CUSTOMER_SERVICE_SUBSCRIPTION_TYPE
    ) {
      return;
    }

    const productId = checkoutSession.metadata?.productId;
    const storeId = checkoutSession.metadata?.storeId;
    const customerId = checkoutSession.metadata?.customerId;
    if (!productId || !storeId || !customerId) {
      console.error("[webhook/customer-sub] checkout missing metadata fields");
      return;
    }

    const stripeSubscriptionId = subscriptionIdFromRef(checkoutSession.subscription);
    if (!stripeSubscriptionId) {
      console.error("[webhook/customer-sub] checkout missing stripe subscription id");
      return;
    }

    const currentPeriodEnd = await resolveRenewalDate(stripeSubscriptionId, null);
    await ensureCustomerServiceSubscriptionRow({
      productId,
      storeId,
      customerId,
      stripeSubscriptionId,
      currentPeriodEnd,
    });
  } catch (e) {
    console.error("[webhook/customer-sub] checkout handler error", e);
  }
}

export async function handleCustomerServiceSubscriptionInvoicePaid(
  invoice: Stripe.Invoice,
): Promise<void> {
  try {
    const metadata = invoice.parent?.subscription_details?.metadata;
    if (metadata?.type !== CUSTOMER_SERVICE_SUBSCRIPTION_TYPE) return;

    const productId = metadata.productId;
    const storeId = metadata.storeId;
    const customerId = metadata.customerId;
    if (!productId || !storeId || !customerId) {
      console.error("[webhook/customer-sub] invoice paid missing metadata fields");
      return;
    }

    const stripeSubscriptionId = subscriptionIdFromRef(
      invoice.parent?.subscription_details?.subscription,
    );
    if (!stripeSubscriptionId) {
      console.error("[webhook/customer-sub] invoice paid missing stripe subscription id");
      return;
    }

    const lineEnd =
      invoice.lines?.data?.find((l) => l.subscription)?.period?.end ??
      invoice.period_end ??
      null;
    const currentPeriodEnd = await resolveRenewalDate(stripeSubscriptionId, lineEnd);

    const subRow = await ensureCustomerServiceSubscriptionRow({
      productId,
      storeId,
      customerId,
      stripeSubscriptionId,
      currentPeriodEnd,
    });
    if (!subRow) return;

    const amountPaidMinor = invoice.amount_paid ?? 0;
    if (amountPaidMinor < 1) {
      console.error("[webhook/customer-sub] invoice amount_paid is zero", invoice.id);
      return;
    }

    const grossTTD = amountPaidMinor / 100;

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { subscriptionPlan: true },
    });
    if (!store) {
      console.error("[webhook/customer-sub] store not found", storeId);
      return;
    }

    const plan = resolveVendorPlan(store.subscriptionPlan);

    await prisma.$transaction(async (tx) => {
      await createVendorEarningsLedgerPair(tx, {
        storeId,
        ledgerEntryType: "SERVICE_SUBSCRIPTION_RENEWAL",
        grossTTD,
        itemType: "service",
        plan,
        idempotencyKey: `service-sub:${stripeSubscriptionId}:${invoice.id}`,
        description: `Service subscription renewal — ${subRow.productName}`,
      });

      await tx.customerServiceSubscription.updateMany({
        where: { stripeSubscriptionId },
        data: {
          status: CustomerSubscriptionStatus.ACTIVE,
          currentPeriodEnd,
        },
      });
    });
  } catch (e) {
    console.error("[webhook/customer-sub] invoice paid handler error", e);
  }
}

export async function handleCustomerServiceSubscriptionInvoiceFailed(
  invoice: Stripe.Invoice,
): Promise<void> {
  try {
    const metadata = invoice.parent?.subscription_details?.metadata;
    if (metadata?.type !== CUSTOMER_SERVICE_SUBSCRIPTION_TYPE) return;

    const stripeSubscriptionId = subscriptionIdFromRef(
      invoice.parent?.subscription_details?.subscription,
    );
    if (!stripeSubscriptionId) return;

    await prisma.customerServiceSubscription.updateMany({
      where: { stripeSubscriptionId },
      data: { status: CustomerSubscriptionStatus.PAST_DUE },
    });
  } catch (e) {
    console.error("[webhook/customer-sub] invoice failed handler error", e);
  }
}

export async function handleCustomerServiceSubscriptionUpdated(
  subscription: Stripe.Subscription,
): Promise<void> {
  try {
    if (subscription.metadata?.type !== CUSTOMER_SERVICE_SUBSCRIPTION_TYPE) return;

    const currentPeriodEndUnix = subscription.items.data[0]?.current_period_end;
    const status =
      subscription.status === "active" || subscription.status === "trialing"
        ? CustomerSubscriptionStatus.ACTIVE
        : subscription.status === "canceled"
          ? CustomerSubscriptionStatus.CANCELED
          : subscription.status === "past_due" ||
              subscription.status === "unpaid" ||
              subscription.status === "incomplete" ||
              subscription.status === "incomplete_expired"
            ? CustomerSubscriptionStatus.PAST_DUE
            : null;

    const result = await prisma.customerServiceSubscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        ...(currentPeriodEndUnix
          ? { currentPeriodEnd: new Date(currentPeriodEndUnix * 1000) }
          : {}),
        ...(status ? { status } : {}),
        ...(status === CustomerSubscriptionStatus.CANCELED
          ? { canceledAt: new Date((subscription.canceled_at ?? Math.floor(Date.now() / 1000)) * 1000) }
          : status === CustomerSubscriptionStatus.ACTIVE
            ? { canceledAt: null }
            : {}),
      },
    });

    if (result.count === 0) {
      console.warn("[webhook/customer-sub] updated: no row for subscription", subscription.id);
    }
  } catch (e) {
    console.error("[webhook/customer-sub] updated handler error", e);
  }
}

export async function handleCustomerServiceSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  try {
    if (subscription.metadata?.type !== CUSTOMER_SERVICE_SUBSCRIPTION_TYPE) return;

    const result = await prisma.customerServiceSubscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: CustomerSubscriptionStatus.CANCELED,
        canceledAt: new Date(),
      },
    });

    if (result.count === 0) {
      console.warn("[webhook/customer-sub] deleted: no row for subscription", subscription.id);
    }
  } catch (e) {
    console.error("[webhook/customer-sub] deleted handler error", e);
  }
}
