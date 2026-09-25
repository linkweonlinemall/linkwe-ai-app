import {
  BookingStatus,
  NotificationType,
  StoreSubscriptionStatus,
  VendorSubscriptionPlan,
} from "@prisma/client";
import { NextResponse } from "next/server";

import { createNotification } from "@/lib/notifications/create";
import { releaseBookingEarnings } from "@/lib/finance/complete-booking";
import { releaseSplitOrderEarnings } from "@/lib/finance/complete-order";
import { releaseTicketOrderEarnings } from "@/lib/finance/release-ticket-earnings";
import { releaseOnDemandEarnings } from "@/lib/finance/complete-ondemand";
import { resumePausedServiceSubscription } from "@/lib/finance/resume-service-subscription";
import { expireCheckoutHolds } from "@/lib/payments/checkout-expiry";
import { settleVerifiedWiPaySuccess } from "@/lib/payments/settle-wipay-success";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRACE_DAYS = 7;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  const manualSecret = request.headers.get("x-cron-secret");
  const isAuthorized =
    Boolean(cronSecret) &&
    (authorization === `Bearer ${cronSecret}` || manualSecret === cronSecret);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const checkoutExpiry = await expireCheckoutHolds(now);
  const stalePaymentClaims = await prisma.paymentAttempt.findMany({
    where: {
      status: "PROCESSING",
      updatedAt: { lte: new Date(now.getTime() - 10 * 60 * 1_000) },
    },
    select: { id: true },
    take: 100,
  });
  let paymentClaimsRecovered = 0;
  for (const attempt of stalePaymentClaims) {
    try {
      const outcome = await settleVerifiedWiPaySuccess(attempt.id);
      if (outcome === "fulfilled" || outcome === "already_fulfilled") {
        paymentClaimsRecovered++;
      }
    } catch (error) {
      console.error("[cron] stale payment fulfillment retry failed", attempt.id, error);
    }
  }

  const expiredBookings = await prisma.productBooking.findMany({
    where: {
      autoCompleteAt: { lte: now },
      earningsReleased: false,
      cancelledAt: null,
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.DEPOSIT_PAID] },
    },
    select: { id: true },
  });

  for (const booking of expiredBookings) {
    await releaseBookingEarnings(booking.id, "SYSTEM", "BOOKING_AUTO_COMPLETE");
  }

  const expiredOnDemandRequests = await prisma.onDemandRequest.findMany({
    where: {
      autoCompleteAt: { lte: now },
      earningsReleased: false,
      status: "CONFIRMED",
      vendorCompletedAt: { not: null },
    },
    select: { id: true },
  });

  for (const request of expiredOnDemandRequests) {
    await releaseOnDemandEarnings(request.id, "SYSTEM", "ON_DEMAND_AUTO_COMPLETE");
  }

  const expiredOrders = await prisma.splitOrder.findMany({
    where: {
      autoCompleteAt: { lte: now },
      earningsReleased: false,
      status: "DELIVERED",
    },
    select: { id: true },
  });

  for (const order of expiredOrders) {
    await releaseSplitOrderEarnings(order.id, "SYSTEM", "ORDER_AUTO_COMPLETE");
  }

  const eligibleTicketOrders = await prisma.ticketOrder.findMany({
    where: {
      payoutEligibleAt: { lte: now },
      earningsReleased: false,
      status: "PAID",
    },
    select: { id: true },
  });

  for (const ticketOrder of eligibleTicketOrders) {
    await releaseTicketOrderEarnings(
      ticketOrder.id,
      "Ticket earnings released after event hold",
    );
  }

  const graceMs = GRACE_DAYS * 24 * 60 * 60 * 1000;
  const pastDueCutoff = new Date(now.getTime() - graceMs);

  const pausedSubscriptionsDue = await prisma.customerServiceSubscription.findMany({
    where: { status: "PAUSED", pauseEndsAt: { lte: now } },
    select: { id: true, customerId: true, product: { select: { name: true } } },
    take: 250,
  });
  let serviceSubscriptionsResumed = 0;
  for (const subscription of pausedSubscriptionsDue) {
    if (!(await resumePausedServiceSubscription(subscription.id, now))) continue;
    serviceSubscriptionsResumed++;
    await createNotification({
      userId: subscription.customerId,
      type: NotificationType.GENERAL,
      title: "Your service subscription has resumed",
      body: `${subscription.product.name} resumed automatically after reaching its pause limit.`,
      linkUrl: "/dashboard/customer/subscriptions",
    });
  }

  const newlyDueStores = await prisma.store.findMany({
    where: {
      subscriptionStatus: StoreSubscriptionStatus.ACTIVE,
      subscriptionPlan: { not: VendorSubscriptionPlan.STARTER },
      planRenewsAt: { lte: now },
    },
    select: { id: true, ownerId: true },
  });
  for (const store of newlyDueStores) {
    await prisma.store.updateMany({
      where: { id: store.id, subscriptionStatus: StoreSubscriptionStatus.ACTIVE },
      data: { subscriptionStatus: StoreSubscriptionStatus.PAST_DUE, pastDueSince: now },
    });
    await createNotification({
      userId: store.ownerId,
      type: NotificationType.GENERAL,
      title: "Your LinkWe plan is ready to renew",
      body: "Approve your next monthly payment through WiPay within 7 days to keep your current plan.",
      linkUrl: "/dashboard/vendor/finance",
    });
  }

  const serviceRenewalsDueRows = await prisma.customerServiceSubscription.findMany({
    where: { status: "ACTIVE", currentPeriodEnd: { lte: now }, cancelAtPeriodEnd: false },
    select: {
      id: true,
      customerId: true,
      product: { select: { name: true } },
      store: { select: { ownerId: true } },
    },
  });
  let serviceRenewalsDue = 0;
  for (const subscription of serviceRenewalsDueRows) {
    const changed = await prisma.customerServiceSubscription.updateMany({
      where: {
        id: subscription.id,
        status: "ACTIVE",
        currentPeriodEnd: { lte: now },
        cancelAtPeriodEnd: false,
      },
      data: { status: "PAST_DUE" },
    });
    if (changed.count === 0) continue;
    serviceRenewalsDue++;
    await Promise.allSettled([
      createNotification({
        userId: subscription.customerId,
        type: NotificationType.GENERAL,
        title: "Your service subscription is ready to renew",
        body: `Renew ${subscription.product.name} within 7 days to keep your subscription active.`,
        linkUrl: "/dashboard/customer/subscriptions",
      }),
      createNotification({
        userId: subscription.store.ownerId,
        type: NotificationType.GENERAL,
        title: "A subscriber is due to renew",
        body: `A subscription to ${subscription.product.name} is now awaiting renewal.`,
        linkUrl: "/dashboard/vendor/subscribers",
      }),
    ]);
  }
  const scheduledServiceEndings = await prisma.customerServiceSubscription.updateMany({
    where: {
      status: { in: ["ACTIVE", "PAST_DUE"] },
      cancelAtPeriodEnd: true,
      currentPeriodEnd: { lte: now },
    },
    data: { status: "CANCELED", canceledAt: now, nextChargeAt: null },
  });
  const endedServiceSubscriptions = await prisma.customerServiceSubscription.updateMany({
    where: {
      status: { in: ["ACTIVE", "PAST_DUE"] },
      cancelAtPeriodEnd: false,
      currentPeriodEnd: { lte: pastDueCutoff },
    },
    data: { status: "CANCELED", canceledAt: now, nextChargeAt: null },
  });
  const overdueStores = await prisma.store.findMany({
    where: {
      subscriptionStatus: StoreSubscriptionStatus.PAST_DUE,
      subscriptionPlan: { not: VendorSubscriptionPlan.STARTER },
      pastDueSince: { lte: pastDueCutoff },
    },
    select: { id: true, ownerId: true },
  });
  let downgraded = 0;
  for (const store of overdueStores) {
    try {
      await prisma.store.updateMany({
        where: { id: store.id, subscriptionStatus: StoreSubscriptionStatus.PAST_DUE },
        data: {
          subscriptionPlan: VendorSubscriptionPlan.STARTER,
          subscriptionStatus: StoreSubscriptionStatus.NONE,
          stripeSubscriptionId: null,
          wipayTrustedCardId: null,
          planRenewsAt: null,
          pastDueSince: null,
          autoRenew: true,
        },
      });

      await createNotification({
        userId: store.ownerId,
        type: NotificationType.GENERAL,
        title: "Subscription moved to Starter",
        body: "Your payment remained unresolved after 7 days, so your store is now on the Starter plan. You can upgrade again anytime.",
        linkUrl: "/dashboard/vendor/finance",
      });
      downgraded++;
    } catch (e) {
      console.error("[cron] downgrade failed for store", store.id, e);
    }
  }

  return NextResponse.json({
    bookingsCompleted: expiredBookings.length,
    onDemandRequestsCompleted: expiredOnDemandRequests.length,
    checkoutAttemptsExpired: checkoutExpiry.attemptsExpired,
    bookingSlotsReleased: checkoutExpiry.bookingSlotsReleased,
    paymentClaimsRecovered,
    ordersCompleted: expiredOrders.length,
    ticketOrdersReleased: eligibleTicketOrders.length,
    pastDueDowngraded: downgraded,
    vendorRenewalsDue: newlyDueStores.length,
    serviceRenewalsDue,
    serviceSubscriptionsResumed,
    serviceSubscriptionsEnded: endedServiceSubscriptions.count + scheduledServiceEndings.count,
  });
}
