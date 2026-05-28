"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import {
  assertBookingReadyForCustomerComplete,
  releaseBookingEarnings,
} from "@/lib/finance/complete-booking";

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
