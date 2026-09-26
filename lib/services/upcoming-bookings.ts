import type { Prisma } from "@prisma/client";
import { TRINIDAD_TIMEZONE, ymdInTrinidad } from "@/lib/timezone/trinidad";

/** Format the stored calendar day without shifting older midnight-UTC anchors. */
export function bookingDateLabel(value: Date | string): string {
  return new Date(value).toLocaleDateString("en-TT", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Booking dates are calendar-day anchors; slot times are Trinidad wall-clock times. */
export function upcomingBookingsWhere(now = new Date()): Prisma.ProductBookingWhereInput {
  const start = new Date(`${ymdInTrinidad(now)}T00:00:00Z`);
  const next = new Date(start.getTime() + 86_400_000);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: TRINIDAD_TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(now);
  return {
    status: { in: ["PENDING", "CONFIRMED", "DEPOSIT_PAID"] },
    OR: [{ bookingDate: { gte: next } }, { bookingDate: { gte: start, lt: next }, endTime: { gt: time } }],
  };
}
