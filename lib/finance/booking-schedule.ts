/**
 * Scheduled start of a ProductBooking in UTC (booking date anchor + startTime HH:mm).
 */
export function getBookingScheduledStart(bookingDate: Date, startTime: string): Date {
  const [h, m] = startTime.split(":").map((v) => parseInt(v, 10));
  const start = new Date(bookingDate);
  start.setUTCHours(h, m ?? 0, 0, 0);
  return start;
}

/**
 * Scheduled end of a ProductBooking in UTC (booking date anchor + endTime HH:mm).
 */
export function getBookingScheduledEnd(bookingDate: Date, endTime: string): Date {
  const [h, m] = endTime.split(":").map((v) => parseInt(v, 10));
  const end = new Date(bookingDate);
  end.setUTCHours(h, m ?? 0, 0, 0);
  return end;
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
