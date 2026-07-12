import { BookingStatus, NotificationType } from "@prisma/client";
import type Stripe from "stripe";

import { revalidatePath } from "next/cache";

import { createNotification } from "@/app/actions/notifications";
import { sendBookingConfirmationEmails } from "@/app/actions/booking-emails";
import { getBookingAutoCompleteAt } from "@/lib/finance/booking-schedule";
import { createVendorEarningsLedgerPair } from "@/lib/finance/release-earnings";
import { resolveVendorPlan } from "@/lib/finance/vendor-plan";
import { prisma } from "@/lib/prisma";

function paymentTypeFromMetadata(
  metadata: Stripe.Metadata | null | undefined,
): "full_payment" | "deposit" {
  const raw = metadata?.paymentType;
  if (raw === "deposit" || raw === "full_payment") return raw;
  if (raw === "full") return "full_payment";
  return "full_payment";
}

export async function handleBookingPaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
) {
  const bookingId = paymentIntent.metadata?.bookingId;
  if (!bookingId) return;

  const paymentType = paymentTypeFromMetadata(paymentIntent.metadata);
  const amountPaid = paymentIntent.amount / 100;

  const booking = await prisma.productBooking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      bookingDate: true,
      endTime: true,
      totalPrice: true,
      amountPaid: true,
      autoCompleteAt: true,
      customerId: true,
      earningsReleased: true,
      product: {
        select: {
          slug: true,
          requiresApproval: true,
          depositAmount: true,
          store: {
            select: {
              id: true,
              ownerId: true,
              subscriptionPlan: true,
            },
          },
        },
      },
    },
  });

  if (!booking || booking.status === BookingStatus.CANCELLED) return;

  const autoCompleteAt = getBookingAutoCompleteAt(booking.bookingDate, booking.endTime);
  const plan = resolveVendorPlan(booking.product.store.subscriptionPlan);
  const storeId = booking.product.store.id;

  if (paymentType === "deposit") {
    const alreadyDeposit =
      booking.status === BookingStatus.DEPOSIT_PAID ||
      booking.status === BookingStatus.CONFIRMED ||
      booking.status === BookingStatus.COMPLETED;

    if (!alreadyDeposit) {
      await prisma.$transaction(async (tx) => {
        await tx.productBooking.update({
          where: { id: bookingId },
          data: {
            status: BookingStatus.DEPOSIT_PAID,
            amountPaid: amountPaid,
            autoCompleteAt,
            stripePaymentIntentId: paymentIntent.id,
          },
        });

        await createVendorEarningsLedgerPair(tx, {
          storeId,
          ledgerEntryType: "DEPOSIT_RECEIVED",
          grossTTD: amountPaid,
          itemType: "service",
          plan,
          bookingId,
          idempotencyKey: `booking:${bookingId}:deposit`,
          description: `Booking deposit received`,
        });
      });

      await createNotification({
        userId: booking.customerId,
        type: NotificationType.BOOKING_CONFIRMED,
        title: "Deposit paid",
        body: "Your booking deposit was received.",
        linkUrl: "/bookings",
      });

      if (booking.product.store.ownerId) {
        await createNotification({
          userId: booking.product.store.ownerId,
          type: NotificationType.BOOKING_CONFIRMED,
          title: "Booking deposit received",
          body: `TTD ${amountPaid.toFixed(2)} deposit secured`,
          linkUrl: "/dashboard/vendor/bookings",
        });
      }
    }
    return;
  }

  // full_payment
  const nextStatus = booking.product.requiresApproval
    ? BookingStatus.PENDING
    : BookingStatus.CONFIRMED;

  // Idempotency guard: true only on the first successful webhook delivery.
  // Stripe retries on 500 would otherwise re-send confirmation emails.
  const isFirstProcessing =
    booking.status !== nextStatus ||
    booking.amountPaid == null ||
    booking.autoCompleteAt == null;

  if (isFirstProcessing) {
    await prisma.productBooking.update({
      where: { id: bookingId },
      data: {
        status: nextStatus,
        amountPaid: amountPaid,
        autoCompleteAt,
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    if (nextStatus === BookingStatus.CONFIRMED) {
      await sendBookingConfirmationEmails(bookingId, booking.customerId);
    }

    await createNotification({
      userId: booking.customerId,
      type: NotificationType.BOOKING_CONFIRMED,
      title: "Payment received",
      body: "Your booking payment was successful.",
      linkUrl: "/bookings",
    });

    if (booking.product.store.ownerId) {
      await createNotification({
        userId: booking.product.store.ownerId,
        type: NotificationType.BOOKING_CONFIRMED,
        title: "New paid booking",
        body: `TTD ${amountPaid.toFixed(2)} paid online`,
        linkUrl: "/dashboard/vendor/bookings",
      });
    }
  }

  revalidateBookingPaths(booking.product.slug);
}

function revalidateBookingPaths(serviceSlug: string) {
  // revalidatePath throws E263 ("static generation store missing") when called
  // from a webhook Route Handler that has no incremental-cache store.
  // Cache revalidation is best-effort here — it must never crash the payment flow.
  for (const path of [`/service/${serviceSlug}`, "/bookings", "/booking-confirmation"]) {
    try {
      revalidatePath(path);
    } catch {
      // silently ignored — cache will expire naturally
    }
  }
}
