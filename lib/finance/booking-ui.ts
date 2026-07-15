import { BookingStatus } from "@prisma/client";

import { getBookingScheduledStart, isBookingServiceEnded } from "@/lib/finance/booking-schedule";

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

const CUSTOMER_CANCELLABLE_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.DEPOSIT_PAID,
];

export const DEFAULT_CANCELLATION_HOURS = 24;

export function customerCancelState(booking: {
  status: BookingStatus;
  bookingDate: Date;
  startTime: string;
  cancellationHours: number | null;
}): "cancellable" | "too_late" | "not_applicable" {
  if (!CUSTOMER_CANCELLABLE_STATUSES.includes(booking.status)) {
    return "not_applicable";
  }

  const hours = booking.cancellationHours ?? DEFAULT_CANCELLATION_HOURS;
  const bookingStart = getBookingScheduledStart(booking.bookingDate, booking.startTime);
  const cutoff = new Date(bookingStart.getTime() - hours * 60 * 60 * 1000);

  return new Date() > cutoff ? "too_late" : "cancellable";
}
