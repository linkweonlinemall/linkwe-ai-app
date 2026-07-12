import { BookingStatus, CancelledBy, NotificationType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { createNotification } from "@/app/actions/notifications";
import { ttdToMinor } from "@/lib/finance/commission";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/stripe";

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
      stripePaymentIntentId: true,
      earningsReleased: true,
      slot: {
        select: { id: true, currentBookings: true },
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

  // 2. Stripe refund — must happen before $transaction.
  // Invariant: it must be structurally impossible to reach the $transaction
  // with amountPaid > 0 and no successful (or already-refunded) refund.
  let refundedTTD = 0;
  if (booking.amountPaid != null && booking.amountPaid > 0) {
    // Resolve the PaymentIntent id: stored column first, then metadata search.
    let paymentIntentId = booking.stripePaymentIntentId ?? null;

    if (!paymentIntentId) {
      let intents;
      try {
        intents = await stripe.paymentIntents.search({
          query: `metadata['bookingId']:'${bookingId}'`,
          limit: 1,
        });
      } catch (err) {
        console.error("[cancelBookingCore] PaymentIntent search failed", err);
        return {
          ok: false,
          error: "Could not locate the payment to refund. Nothing was changed.",
        };
      }
      paymentIntentId = intents.data[0]?.id ?? null;
    }

    // No PaymentIntent found — refuse to cancel without refunding.
    if (!paymentIntentId) {
      return {
        ok: false,
        error: "Could not locate the payment to refund. Nothing was changed.",
      };
    }

    // Attempt the refund. charge_already_refunded is treated as success.
    try {
      await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: ttdToMinor(booking.amountPaid),
      });
      refundedTTD = booking.amountPaid;
    } catch (err: unknown) {
      const stripeErr = err as { code?: string };
      if (stripeErr?.code === "charge_already_refunded") {
        refundedTTD = booking.amountPaid;
      } else {
        console.error("[cancelBookingCore] Stripe refund failed", err);
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
      await tx.productBookingSlot.update({
        where: { id: booking.slot.id },
        data: {
          currentBookings: Math.max(0, booking.slot.currentBookings - 1),
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
