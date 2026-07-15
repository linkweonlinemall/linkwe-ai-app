"use server";

import { revalidatePath } from "next/cache";
import { CancelledBy } from "@prisma/client";

import { getSession } from "@/lib/auth/session";
import { cancelBookingCore } from "@/lib/finance/cancel-booking";
import {
  assertBookingReadyForCustomerComplete,
  releaseBookingEarnings,
} from "@/lib/finance/complete-booking";
import { customerCancelState } from "@/lib/finance/booking-ui";
import { prisma } from "@/lib/prisma";

export async function markBookingComplete(
  bookingId: string,
): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };

  const check = await assertBookingReadyForCustomerComplete(
    bookingId,
    session.userId,
  );
  if ("error" in check) return { error: check.error };

  const result = await releaseBookingEarnings(
    bookingId,
    session.userId,
    "BOOKING_COMPLETE",
  );
  if (!result.ok) return { error: result.error };

  revalidatePath("/bookings");
  revalidatePath("/dashboard/vendor/bookings");
  revalidatePath("/dashboard/vendor/finance");

  return { ok: true };
}

export async function cancelMyBooking(
  bookingId: string,
): Promise<
  | { ok: true; refundedTTD: number; clawedBackMinor: number }
  | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in" };

  const booking = await prisma.productBooking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      customerId: true,
      status: true,
      bookingDate: true,
      startTime: true,
      product: { select: { cancellationHours: true } },
    },
  });

  if (!booking) return { ok: false, error: "Booking not found" };

  if (booking.customerId !== session.userId) {
    return { ok: false, error: "This is not your booking" };
  }

  const state = customerCancelState({
    status: booking.status,
    bookingDate: booking.bookingDate,
    startTime: booking.startTime,
    cancellationHours: booking.product.cancellationHours,
  });

  if (state === "not_applicable") {
    return { ok: false, error: "This booking can no longer be cancelled" };
  }

  if (state === "too_late") {
    return {
      ok: false,
      error: "The cancellation window has passed. Please message the vendor to cancel.",
    };
  }

  return cancelBookingCore(bookingId, CancelledBy.CUSTOMER, null);
}
