import { BookingStatus, CancelledBy, type Prisma } from "@prisma/client";

export async function releaseBookingPaymentHoldTx(
  tx: Prisma.TransactionClient,
  bookingId: string,
  reason: string,
): Promise<boolean> {
  const booking = await tx.productBooking.findFirst({
    where: {
      id: bookingId,
      status: BookingStatus.PENDING,
      amountPaid: null,
    },
    select: { id: true, slotId: true },
  });
  if (!booking) return false;

  const released = await tx.productBooking.updateMany({
    where: {
      id: booking.id,
      status: BookingStatus.PENDING,
      amountPaid: null,
    },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledBy: CancelledBy.SYSTEM,
      cancelledAt: new Date(),
      cancellationReason: reason,
    },
  });
  if (released.count !== 1) return false;

  await tx.productBookingSlot.updateMany({
    where: { id: booking.slotId, currentBookings: { gt: 0 } },
    data: { currentBookings: { decrement: 1 }, isAvailable: true },
  });
  return true;
}
