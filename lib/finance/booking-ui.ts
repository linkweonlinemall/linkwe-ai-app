import { BookingStatus } from "@prisma/client";

import { isBookingServiceEnded } from "@/lib/finance/booking-schedule";

export function canCustomerMarkBookingComplete(booking: {
  status: BookingStatus;
  earningsReleased: boolean;
  bookingDate: Date;
  endTime: string;
}): boolean {
  if (booking.earningsReleased || booking.status === BookingStatus.COMPLETED) {
    return false;
  }
  if (
    booking.status !== BookingStatus.CONFIRMED &&
    booking.status !== BookingStatus.DEPOSIT_PAID
  ) {
    return false;
  }
  return isBookingServiceEnded(booking.bookingDate, booking.endTime);
}
