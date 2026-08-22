import {
  BookingStatus,
  NotificationType,
  StoreSubscriptionStatus,
  VendorSubscriptionPlan,
} from "@prisma/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createNotification } from "@/app/actions/notifications";
import { releaseBookingEarnings } from "@/lib/finance/complete-booking";
import { releaseSplitOrderEarnings } from "@/lib/finance/complete-order";
import { releaseTicketOrderEarnings } from "@/lib/finance/release-ticket-earnings";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/stripe";

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

  const expiredBookings = await prisma.productBooking.findMany({
    where: {
      autoCompleteAt: { lte: now },
      earningsReleased: false,
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.DEPOSIT_PAID] },
    },
    select: { id: true },
  });

  for (const booking of expiredBookings) {
    await releaseBookingEarnings(booking.id, "SYSTEM", "BOOKING_AUTO_COMPLETE");
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
  const overdueStores = await prisma.store.findMany({
    where: {
      subscriptionStatus: StoreSubscriptionStatus.PAST_DUE,
      stripeSubscriptionId: { not: null },
      pastDueSince: { lte: pastDueCutoff },
    },
    select: { id: true, ownerId: true, stripeSubscriptionId: true },
  });
  let downgraded = 0;
  for (const store of overdueStores) {
    try {
      if (store.stripeSubscriptionId) {
        // Cancel at Stripe so it stops retrying the card. This also fires customer.subscription.deleted,
        // but that webhook's stripeSubscriptionId-match guard will no-op after we null it below.
        try {
          await stripe.subscriptions.cancel(store.stripeSubscriptionId);
        } catch (e) {
          const alreadyAbsent =
            e instanceof Stripe.errors.StripeInvalidRequestError && e.code === "resource_missing";
          if (!alreadyAbsent) throw e;
        }
      }
      await prisma.store.updateMany({
        where: { id: store.id, subscriptionStatus: StoreSubscriptionStatus.PAST_DUE },
        data: {
          subscriptionPlan: VendorSubscriptionPlan.STARTER,
          subscriptionStatus: StoreSubscriptionStatus.NONE,
          stripeSubscriptionId: null,
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
    ordersCompleted: expiredOrders.length,
    ticketOrdersReleased: eligibleTicketOrders.length,
    pastDueDowngraded: downgraded,
  });
}
