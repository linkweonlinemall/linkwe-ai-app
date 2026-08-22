import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { NotificationType, StoreSubscriptionStatus, VendorSubscriptionPlan } from "@prisma/client";

import { minorToTtd } from "@/lib/finance/commission";
import { handleBookingPaymentIntentSucceeded } from "@/lib/finance/booking-payment";
import { createSplitOrdersFromMainOrder } from "@/lib/fulfillment/split-orders";
import {
  handleCustomerServiceSubscriptionCheckout,
  handleCustomerServiceSubscriptionDeleted,
  handleCustomerServiceSubscriptionInvoiceFailed,
  handleCustomerServiceSubscriptionInvoicePaid,
  handleCustomerServiceSubscriptionUpdated,
} from "@/lib/webhooks/customer-service-subscription";
import { createNotification } from "@/app/actions/notifications";
import { BASE_URL } from "@/lib/email/resend";
import { sendEmail } from "@/lib/email/send";
import { ticketConfirmationEmail } from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/stripe";

export const runtime = "nodejs";

const TICKET_PAYOUT_HOLD_HOURS = 72;

function getTicketPayoutEligibleAt(endDate: Date | null, startDate: Date): Date {
  const base = endDate ?? startDate;
  return new Date(base.getTime() + TICKET_PAYOUT_HOLD_HOURS * 60 * 60 * 1000);
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
      console.error("[webhook] could not retrieve subscription for period end", e);
    }
  }
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

async function handleSubscriptionInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const subStoreId = invoice.parent?.subscription_details?.metadata?.subscriptionStoreId;
  if (!subStoreId) return;

  const subRef = invoice.parent?.subscription_details?.subscription;
  const subscriptionId = typeof subRef === "string" ? subRef : (subRef?.id ?? null);
  const lineEnd =
    invoice.lines?.data?.find((l) => l.subscription)?.period?.end ?? invoice.period_end ?? null;
  const renewsAt = await resolveRenewalDate(subscriptionId, lineEnd);

  await prisma.store.updateMany({
    where: { id: subStoreId },
    data: {
      subscriptionStatus: StoreSubscriptionStatus.ACTIVE,
      planRenewsAt: renewsAt,
      pastDueSince: null,
      ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
    },
  });
}

async function markVendorSubscriptionPastDue(subStoreId: string): Promise<void> {
  const store = await prisma.store.findUnique({
    where: { id: subStoreId },
    select: { ownerId: true },
  });
  if (!store) return;

  // Stripe can send customer.subscription.updated and invoice.payment_failed in
  // either order. Only the first event should start the grace period and notify.
  const updated = await prisma.store.updateMany({
    where: { id: subStoreId, pastDueSince: null },
    data: {
      subscriptionStatus: StoreSubscriptionStatus.PAST_DUE,
      pastDueSince: new Date(),
    },
  });

  if (updated.count > 0) {
    await createNotification({
      userId: store.ownerId,
      type: NotificationType.GENERAL,
      title: "Subscription payment failed",
      body: "Update your payment method within 7 days to keep your current LinkWe plan.",
      linkUrl: "/dashboard/vendor/finance",
    });
  }
}

async function handleVendorSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const subStoreId = subscription.metadata?.subscriptionStoreId;
  if (!subStoreId) return;

  const periodEndUnix = subscription.items.data[0]?.current_period_end;
  const status =
    subscription.status === "active" || subscription.status === "trialing"
      ? StoreSubscriptionStatus.ACTIVE
      : subscription.status === "past_due" || subscription.status === "unpaid"
        ? StoreSubscriptionStatus.PAST_DUE
        : null;

  await prisma.store.updateMany({
    where: { id: subStoreId, stripeSubscriptionId: subscription.id },
    data: {
      autoRenew: !subscription.cancel_at_period_end,
      ...(periodEndUnix ? { planRenewsAt: new Date(periodEndUnix * 1000) } : {}),
      ...(status && status !== StoreSubscriptionStatus.PAST_DUE
        ? { subscriptionStatus: status }
        : {}),
      ...(status === StoreSubscriptionStatus.ACTIVE
          ? { pastDueSince: null }
          : {}),
    },
  });

  if (status === StoreSubscriptionStatus.PAST_DUE) {
    await markVendorSubscriptionPastDue(subStoreId);
  }
}

// ── Ticket order fulfilment ────────────────────────────────────────────────────
// Idempotent and atomic: the PENDING_PAYMENT claim, payout timestamp, and all
// quantitySold increments commit together. If any step fails, the transaction
// rolls back so Stripe can safely retry the entire fulfilment.
async function handleTicketOrderPaid(
  ticketOrderId: string,
  paymentIntentId: string,
): Promise<void> {
  const order = await prisma.$transaction(async (tx) => {
    const claimed = await tx.ticketOrder.updateMany({
      where: { id: ticketOrderId, status: "PENDING_PAYMENT" },
      data: {
        status: "PAID",
        stripePaymentIntentId: paymentIntentId,
        promoReservationExpiresAt: null,
      },
    });

    if (claimed.count === 0) return null; // Already processed — nothing to do

    const claimedOrder = await tx.ticketOrder.findUnique({
      where: { id: ticketOrderId },
      select: {
        reference: true,
        total: true,
        userId: true,
        promoCodeId: true,
        event: { select: { title: true, startDate: true, endDate: true } },
        user: { select: { email: true, fullName: true } },
        tickets: { select: { ticketTypeId: true } },
      },
    });

    if (!claimedOrder) {
      throw new Error(`[webhook/ticket] claimed order not found: ${ticketOrderId}`);
    }

    if (claimedOrder.promoCodeId) {
      await tx.eventPromoCode.update({
        where: { id: claimedOrder.promoCodeId },
        data: { usedCount: { increment: 1 } },
      });
    }

    await tx.ticketOrder.update({
      where: { id: ticketOrderId },
      data: {
        payoutEligibleAt: getTicketPayoutEligibleAt(
          claimedOrder.event.endDate,
          claimedOrder.event.startDate,
        ),
      },
    });

    const countByType = new Map<string, number>();
    for (const ticket of claimedOrder.tickets) {
      countByType.set(ticket.ticketTypeId, (countByType.get(ticket.ticketTypeId) ?? 0) + 1);
    }
    for (const [ticketTypeId, count] of countByType) {
      await tx.eventTicketType.update({
        where: { id: ticketTypeId },
        data: { quantitySold: { increment: count } },
      });
    }

    return claimedOrder;
  });

  if (!order) return;

  const ticketCount = order.tickets.length;

  // createNotification has an internal try/catch — cannot throw out
  await createNotification({
    userId: order.userId,
    type: NotificationType.TICKET_PURCHASED,
    title: `Tickets confirmed — ${order.event.title}`,
    body: `${ticketCount} ticket${ticketCount !== 1 ? "s" : ""} for ${order.event.title}`,
    linkUrl: "/my-tickets",
  });

  // sendEmail has an internal try/catch — cannot throw out
  await sendEmail({
    to: order.user.email,
    ...ticketConfirmationEmail({
      customerName: order.user.fullName ?? order.user.email,
      eventTitle: order.event.title,
      orderRef: order.reference,
      ticketCount,
      totalTTD: order.total / 100,
      myTicketsUrl: `${BASE_URL}/my-tickets`,
    }),
  });
}

// ── AI top-up fulfilment ───────────────────────────────────────────────────────
// Idempotent: updateMany only matches PENDING; duplicate Stripe retries get
// count=0 and exit without re-incrementing aiTopupCreditsRemaining.
async function handleAITopupPaymentSucceeded(paymentIntentId: string): Promise<void> {
  let credited = false;
  try {
    credited = await prisma.$transaction(async (tx) => {
      const claimed = await tx.aITopupPurchase.updateMany({
        where: { stripePaymentIntentId: paymentIntentId, status: "PENDING" },
        data: { status: "PAID", paidAt: new Date() },
      });

      if (claimed.count === 0) {
        return false;
      }

      const purchase = await tx.aITopupPurchase.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
        select: { storeId: true, usesPurchased: true },
      });

      if (!purchase) {
        throw new Error(
          `[webhook/ai-topup] purchase row missing after PENDING claim: ${paymentIntentId}`,
        );
      }

      await tx.store.update({
        where: { id: purchase.storeId },
        data: { aiTopupCreditsRemaining: { increment: purchase.usesPurchased } },
      });

      return true;
    });
  } catch (e) {
    console.error("[webhook/ai-topup] credit failed", paymentIntentId, e);
    throw e;
  }

  if (!credited) {
    const existing = await prisma.aITopupPurchase.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
      select: { id: true },
    });
    if (!existing) {
      console.warn(
        "[webhook/ai-topup] no AITopupPurchase row for PaymentIntent — skipping credit",
        paymentIntentId,
      );
    }
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook] Invalid signature:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        await handleCustomerServiceSubscriptionCheckout(checkoutSession);

        const requestId = checkoutSession.metadata?.requestId;

        if (requestId) {
          const amountTotal = checkoutSession.amount_total;
          const amountPaid = amountTotal != null ? minorToTtd(amountTotal) : undefined;

          const pi = checkoutSession.payment_intent;
          const paymentIntentId = typeof pi === "string" ? pi : (pi?.id ?? null);

          // Idempotent: updateMany only matches non-CONFIRMED rows; a Stripe
          // retry of an already-confirmed request gets count=0 and is a no-op.
          await prisma.onDemandRequest.updateMany({
            where: { id: requestId, status: { not: "CONFIRMED" } },
            data: {
              status: "CONFIRMED",
              amountPaid,
              stripePaymentIntentId: paymentIntentId ?? undefined,
            },
          });
        }

        const subStoreId = checkoutSession.metadata?.subscriptionStoreId;
        const targetPlan = checkoutSession.metadata?.targetPlan;
        if (
          checkoutSession.mode === "subscription" &&
          subStoreId &&
          (targetPlan === "GROWTH" || targetPlan === "PRO")
        ) {
          const subscriptionId =
            typeof checkoutSession.subscription === "string"
              ? checkoutSession.subscription
              : (checkoutSession.subscription?.id ?? null);
          const planRenewsAt = await resolveRenewalDate(subscriptionId, null);
          await prisma.store.updateMany({
            where: { id: subStoreId },
            data: {
              subscriptionPlan: targetPlan as VendorSubscriptionPlan,
              subscriptionStatus: StoreSubscriptionStatus.ACTIVE,
              stripeSubscriptionId: subscriptionId,
              planRenewsAt,
            },
          });
        }
        break;
      }

      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleCustomerServiceSubscriptionInvoicePaid(invoice);
        await handleSubscriptionInvoicePaid(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleCustomerServiceSubscriptionInvoiceFailed(invoice);

        const subStoreId = invoice.parent?.subscription_details?.metadata?.subscriptionStoreId;
        if (!subStoreId) break;
        await markVendorSubscriptionPastDue(subStoreId);
        break;
      }

      case "invoice.voided": {
        const invoice = event.data.object as Stripe.Invoice;
        const subRef = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof subRef === "string" ? subRef : (subRef?.id ?? null);
        if (!subscriptionId) break;

        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await handleVendorSubscriptionUpdated(subscription);
        } catch (e) {
          console.error("[webhook] could not reconcile voided subscription invoice", e);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleCustomerServiceSubscriptionUpdated(subscription);
        await handleVendorSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleCustomerServiceSubscriptionDeleted(subscription);

        const subStoreId = subscription.metadata?.subscriptionStoreId;
        if (!subStoreId) break;

        await prisma.store.updateMany({
          where: { id: subStoreId, stripeSubscriptionId: subscription.id },
          data: {
            subscriptionPlan: VendorSubscriptionPlan.STARTER,
            subscriptionStatus: StoreSubscriptionStatus.NONE,
            stripeSubscriptionId: null,
            planRenewsAt: null,
            autoRenew: true,
          },
        });
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata?.bookingId;
        if (bookingId) {
          await handleBookingPaymentIntentSucceeded(paymentIntent);
        }

        const orderId = paymentIntent.metadata?.orderId;
        if (orderId) {
          await prisma.mainOrder.updateMany({
            where: { id: orderId, status: "PENDING_PAYMENT" },
            data: { status: "PAID" },
          });
          await createSplitOrdersFromMainOrder(orderId);
        }

        const ticketOrderId = paymentIntent.metadata?.ticketOrderId;
        if (ticketOrderId) {
          await handleTicketOrderPaid(ticketOrderId, paymentIntent.id);
        }

        const aiTopupStoreId = paymentIntent.metadata?.aiTopupStoreId;
        if (aiTopupStoreId) {
          await handleAITopupPaymentSucceeded(paymentIntent.id);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const errorId = crypto.randomUUID();
    console.error(`[webhook] Handler error (${errorId}):`, err);
    return NextResponse.json(
      { error: "Webhook processing failed", errorId },
      { status: 500 },
    );
  }
}
