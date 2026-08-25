import { BookingStatus, CancelledBy, NotificationType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { createNotification } from "@/app/actions/notifications";
import { prisma } from "@/lib/prisma";
import { requestWiPayRefund } from "@/lib/wipay/wapi";

const TERMINAL_STATUSES: BookingStatus[] = [
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
  BookingStatus.NO_SHOW,
];

export async function cancelBookingCore(
  bookingId: string,
  cancelledBy: CancelledBy,
  reason?: string | null,
  vendorNotes?: string | null,
): Promise<
  | { ok: true; refundedTTD: number; clawedBackMinor: number }
  | { ok: false; error: string }
> {
  // 1. Load booking
  const booking = await prisma.productBooking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      customerId: true,
      amountPaid: true,
      earningsReleased: true,
      slot: {
        select: { id: true, currentBookings: true, maxBookings: true },
      },
      product: {
        select: {
          depositAmount: true,
          store: {
            select: { id: true, ownerId: true },
          },
        },
      },
    },
  });

  if (!booking) return { ok: false, error: "Booking not found" };
  if (TERMINAL_STATUSES.includes(booking.status)) {
    return { ok: false, error: "Booking cannot be cancelled in its current state" };
  }
  if (booking.earningsReleased) {
    return { ok: false, error: "Earnings already released for this booking" };
  }

  // 2. WiPay refund — must happen before $transaction.
  // Invariant: it must be structurally impossible to reach the $transaction
  // with amountPaid > 0 and no successful (or already-refunded) refund.
  let refundedTTD = 0;
  if (booking.amountPaid != null && booking.amountPaid > 0) {
    const payment = await prisma.paymentAttempt.findFirst({
      where: {
        purpose: "PRODUCT_BOOKING",
        targetId: bookingId,
        status: { in: ["SUCCEEDED", "REFUND_REQUESTED", "REFUNDED"] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!payment?.providerTransactionId) {
      return {
        ok: false,
        error: "Could not locate the payment to refund. Nothing was changed.",
      };
    }
    if (payment.status === "REFUND_REQUESTED" || payment.status === "REFUNDED") {
      refundedTTD = booking.amountPaid;
    } else {
      try {
        await requestWiPayRefund(payment.providerTransactionId);
        await prisma.paymentAttempt.update({
          where: { id: payment.id },
          data: { status: "REFUND_REQUESTED" },
        });
        refundedTTD = booking.amountPaid;
      } catch (err) {
        console.error("[cancelBookingCore] WiPay refund failed", err);
        return { ok: false, error: "Refund failed. Please try again." };
      }
    }
    // refundedTTD > 0 is now guaranteed before falling through.
  }

  // 3. $transaction: cancel booking + clawback ledger + decrement slot
  let clawedBackMinor = 0;
  const storeId = booking.product.store.id;

  await prisma.$transaction(async (tx) => {
    // a. Mark booking cancelled
    await tx.productBooking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy,
        cancellationReason: reason ?? null,
        ...(vendorNotes != null ? { vendorNotes } : {}),
      },
    });

    // b. Clawback deposit credit if one exists
    const depositCredit = await tx.vendorLedgerEntry.findFirst({
      where: {
        bookingId,
        entryType: "CREDIT_ORDER_SETTLEMENT",
        ledgerEntryType: "DEPOSIT_RECEIVED",
      },
    });

    if (depositCredit) {
      const clawbackKey = `booking:${bookingId}:cancel-refund`;
      const alreadyClawedBack = await tx.vendorLedgerEntry.findUnique({
        where: { idempotencyKey: clawbackKey },
      });

      if (!alreadyClawedBack) {
        await tx.vendorLedgerEntry.create({
          data: {
            storeId,
            currency: "TTD",
            entryType: "DEBIT_REFUND",
            ledgerEntryType: "DEPOSIT_RECEIVED",
            amountMinor: depositCredit.amountMinor,
            grossMinor: depositCredit.grossMinor,
            commissionMinor: depositCredit.commissionMinor,
            netMinor: depositCredit.netMinor,
            bookingId,
            idempotencyKey: clawbackKey,
            description: "Booking cancelled — deposit refunded",
            releasedAt: new Date(),
          },
        });
        clawedBackMinor = depositCredit.amountMinor;
      }
    }

    // c. Free the slot capacity
    if (booking.slot) {
      const currentBookings = Math.max(0, booking.slot.currentBookings - 1);
      await tx.productBookingSlot.update({
        where: { id: booking.slot.id },
        data: {
          currentBookings,
          isAvailable: currentBookings < booking.slot.maxBookings,
        },
      });
    }
  });

  // 4. Notifications (outside transaction — no network calls inside tx)
  await createNotification({
    userId: booking.customerId,
    type: NotificationType.BOOKING_CANCELLED,
    title: "Booking cancelled",
    body:
      refundedTTD > 0
        ? `Your booking was cancelled. TTD ${refundedTTD.toFixed(2)} has been refunded to your card.`
        : "Your booking has been cancelled.",
    linkUrl: "/bookings",
  });

  if (booking.product.store.ownerId) {
    await createNotification({
      userId: booking.product.store.ownerId,
      type: NotificationType.BOOKING_CANCELLED,
      title: "Booking cancelled",
      body:
        refundedTTD > 0
          ? `TTD ${refundedTTD.toFixed(2)} refunded to customer`
          : "A booking was cancelled",
      linkUrl: "/dashboard/vendor/bookings",
    });
  }

  // 5. Cache revalidation (best-effort; must not crash the cancel flow)
  for (const path of ["/bookings", "/dashboard/vendor/bookings"]) {
    try {
      revalidatePath(path);
    } catch {
      // silently ignored
    }
  }

  return { ok: true, refundedTTD, clawedBackMinor };
}
