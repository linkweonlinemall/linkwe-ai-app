"use server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { cancelBookingCore } from "@/lib/finance/cancel-booking";
import { CancelledBy } from "@prisma/client";

/** Private operational notes never become a customer-facing cancellation reason. */
export async function saveBookingPrivateNote(bookingId: string, note: string) {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { error: "Please sign in as the store owner." };
  if (typeof bookingId !== "string" || typeof note !== "string" || note.length > 4000) return { error: "Keep the private note under 4,000 characters." };
  const updated = await prisma.productBooking.updateMany({ where: { id: bookingId, product: { isService: true, store: { ownerId: session.userId } } }, data: { vendorNotes: note.trim() || null } });
  if (updated.count !== 1) return { error: "Booking not found in your store." };
  revalidatePath("/dashboard/vendor/service-desk");
  revalidatePath("/dashboard/vendor/bookings");
  return { ok: true as const };
}

export async function cancelServiceDeskBooking(bookingId: string, reason: string) {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { error: "Please sign in as the store owner." };
  if (typeof reason !== "string" || !reason.trim() || reason.length > 1000) return { error: "Add a cancellation reason, up to 1,000 characters." };
  const booking = await prisma.productBooking.findFirst({ where: { id: bookingId, product: { isService: true, store: { ownerId: session.userId } } }, select: { id: true } });
  if (!booking) return { error: "Booking not found in your store." };
  const result = await cancelBookingCore(bookingId, CancelledBy.VENDOR, reason.trim());
  revalidatePath("/dashboard/vendor/service-desk");
  return result;
}
