import { BookingStatus, StoreSubscriptionStatus, VendorSubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";

import { releaseBookingEarnings } from "@/lib/finance/complete-booking";
import { releaseSplitOrderEarnings } from "@/lib/finance/complete-order";
import { releaseTicketOrderEarnings } from "@/lib/finance/release-ticket-earnings";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/stripe";

export const runtime = "nodejs";

const GRACE_DAYS = 7;

export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
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
    select: { id: true, stripeSubscriptionId: true },
  });
  let downgraded = 0;
  for (const store of overdueStores) {
    try {
      if (store.stripeSubscriptionId) {
        // Cancel at Stripe so it stops retrying the card. This also fires customer.subscription.deleted,
        // but that webhook's stripeSubscriptionId-match guard will no-op after we null it below.
        await stripe.subscriptions.cancel(store.stripeSubscriptionId).catch((e) => {
          console.error("[cron] stripe cancel failed for store", store.id, e);
        });
      }
      await prisma.store.updateMany({
        where: { id: store.id, subscriptionStatus: StoreSubscriptionStatus.PAST_DUE },
        data: {
          subscriptionPlan: VendorSubscriptionPlan.STARTER,
          subscriptionStatus: StoreSubscriptionStatus.NONE,
          stripeSubscriptionId: null,
          planRenewsAt: null,
          pastDueSince: null,
        },
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
