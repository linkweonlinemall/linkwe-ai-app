import { slotInstantTrinidad, ymdInTrinidad } from "@/lib/timezone/trinidad";

/**
 * Scheduled start of a ProductBooking as the UTC instant represented by its
 * Trinidad calendar date and local wall-clock time.
 */
export function getBookingScheduledStart(bookingDate: Date, startTime: string): Date {
  return slotInstantTrinidad(ymdInTrinidad(bookingDate), startTime);
}

/**
 * Scheduled end of a ProductBooking as the UTC instant represented by its
 * Trinidad calendar date and local wall-clock time.
 */
export function getBookingScheduledEnd(bookingDate: Date, endTime: string): Date {
  return slotInstantTrinidad(ymdInTrinidad(bookingDate), endTime);
}

export function getBookingAutoCompleteAt(
  bookingDate: Date,
  endTime: string,
  graceHours = 48,
): Date {
  const scheduledEnd = getBookingScheduledEnd(bookingDate, endTime);
  return new Date(scheduledEnd.getTime() + graceHours * 60 * 60 * 1000);
}

export function isBookingServiceEnded(
  bookingDate: Date,
  endTime: string,
  now = new Date(),
): boolean {
  return now.getTime() >= getBookingScheduledEnd(bookingDate, endTime).getTime();
}
