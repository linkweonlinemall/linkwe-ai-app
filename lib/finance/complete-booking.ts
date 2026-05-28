import { BookingStatus, NotificationType } from "@prisma/client";

import { createNotification } from "@/app/actions/notifications";
import { calculateEarnings } from "@/lib/finance/commission";
import { isBookingServiceEnded } from "@/lib/finance/booking-schedule";
import { createVendorEarningsLedgerPair } from "@/lib/finance/release-earnings";
import { resolveVendorPlan } from "@/lib/finance/vendor-plan";
import { prisma } from "@/lib/prisma";

export function bookingCompletionGrossTTD(booking: {
  status: BookingStatus;
  totalPrice: number;
  amountPaid: number | null;
  product: { depositAmount: number | null };
}): number {
  const deposit =
    booking.product.depositAmount != null && booking.product.depositAmount > 0
      ? booking.product.depositAmount
      : 0;

  if (booking.status === BookingStatus.DEPOSIT_PAID && deposit > 0) {
    return Math.max(0, booking.totalPrice - deposit);
  }

  return booking.totalPrice;
}

export async function releaseBookingEarnings(
  bookingId: string,
  markedCompleteBy: string,
  ledgerType: "BOOKING_COMPLETE" | "BOOKING_AUTO_COMPLETE" = "BOOKING_COMPLETE",
) {
  const booking = await prisma.productBooking.findUnique({
    where: { id: bookingId },
    include: {
      product: {
        select: {
          depositAmount: true,
          store: { select: { id: true, ownerId: true, subscriptionPlan: true } },
        },
      },
    },
  });

  if (!booking || booking.earningsReleased) {
    return { ok: false as const, error: "Booking not eligible" };
  }

  if (
    booking.status !== BookingStatus.CONFIRMED &&
    booking.status !== BookingStatus.DEPOSIT_PAID
  ) {
    return { ok: false as const, error: "Booking not eligible" };
  }

  const grossTTD = bookingCompletionGrossTTD(booking);
  const plan = resolveVendorPlan(booking.product.store.subscriptionPlan);
  const { net } = calculateEarnings(grossTTD, "service", plan);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.productBooking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.COMPLETED,
        completedAt: now,
        markedCompleteBy,
        earningsReleased: true,
        earningsAmount: net,
      },
    });

    if (grossTTD > 0) {
      await createVendorEarningsLedgerPair(tx, {
        storeId: booking.product.store.id,
        ledgerEntryType: ledgerType,
        grossTTD,
        itemType: "service",
        plan,
        bookingId,
        idempotencyKey: `booking:${bookingId}:${ledgerType}`,
        description:
          ledgerType === "BOOKING_AUTO_COMPLETE"
            ? "Booking auto-completed"
            : "Service marked complete by customer",
        markedByUserId: markedCompleteBy === "SYSTEM" ? undefined : markedCompleteBy,
      });
    }
  });

  const ownerId = booking.product.store.ownerId;
  if (ownerId) {
    await createNotification({
      userId: ownerId,
      type: NotificationType.PAYOUT_PROCESSED,
      title:
        ledgerType === "BOOKING_AUTO_COMPLETE"
          ? "Booking auto-completed"
          : "Service marked complete",
      body: `TTD ${net.toFixed(2)} added to your balance`,
      linkUrl: "/dashboard/vendor/finance",
    });
  }

  return { ok: true as const, net };
}

export async function assertBookingReadyForCustomerComplete(
  bookingId: string,
  customerId: string,
): Promise<
  | { ok: true; booking: { id: string; product: { store: { name: string } } } }
  | { error: string }
> {
  const booking = await prisma.productBooking.findFirst({
    where: { id: bookingId, customerId },
    select: {
      id: true,
      status: true,
      earningsReleased: true,
      bookingDate: true,
      endTime: true,
      product: { select: { store: { select: { name: true } } } },
    },
  });

  if (!booking) return { error: "Booking not found" };
  if (booking.earningsReleased || booking.status === BookingStatus.COMPLETED) {
    return { error: "Booking is already completed" };
  }
  if (
    booking.status !== BookingStatus.CONFIRMED &&
    booking.status !== BookingStatus.DEPOSIT_PAID
  ) {
    return { error: "This booking cannot be completed yet" };
  }
  if (!isBookingServiceEnded(booking.bookingDate, booking.endTime)) {
    return { error: "Service not completed yet" };
  }

  return { ok: true, booking };
}
