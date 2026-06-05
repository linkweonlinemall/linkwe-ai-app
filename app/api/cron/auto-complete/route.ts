import { BookingStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { releaseBookingEarnings } from "@/lib/finance/complete-booking";
import { releaseSplitOrderEarnings } from "@/lib/finance/complete-order";
import { releaseTicketOrderEarnings } from "@/lib/finance/release-ticket-earnings";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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

  return NextResponse.json({
    bookingsCompleted: expiredBookings.length,
    ordersCompleted: expiredOrders.length,
    ticketOrdersReleased: eligibleTicketOrders.length,
  });
}
