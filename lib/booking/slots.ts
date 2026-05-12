import type {
  ProductAvailabilityOverride,
  ProductAvailabilitySchedule,
  ProductBookingSlot,
} from "@prisma/client";

export type TimeSlot = {
  startTime: string;
  endTime: string;
  available: boolean;
};

function utcYmd(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Calendar date anchor at UTC noon so getUTCDay matches Y-M-D. */
function utcAnchorFromYmd(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map((v) => parseInt(v, 10));
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

function utcMidnightFromYmd(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map((v) => parseInt(v, 10));
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

// Generate time slots for a specific date based on schedule + overrides + existing bookings
export function generateSlotsForDate(
  dateStr: string,
  schedule: ProductAvailabilitySchedule[],
  overrides: ProductAvailabilityOverride[],
  existingSlots: ProductBookingSlot[],
  serviceDuration: number,
): TimeSlot[] {
  const anchor = utcAnchorFromYmd(dateStr);
  const dayOfWeek = anchor.getUTCDay();

  const override = overrides.find(
    (o) => utcYmd(new Date(o.date)) === dateStr,
  );

  if (override?.isBlocked) return [];

  const daySchedule = schedule.find((s) => s.dayOfWeek === dayOfWeek && s.isActive);
  if (!daySchedule) return [];

  const startTime = override?.customStartTime ?? daySchedule.startTime;
  const endTime = override?.customEndTime ?? daySchedule.endTime;
  const slotDuration = serviceDuration;
  const buffer = daySchedule.slotBufferMins ?? 0;

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;

  const slots: TimeSlot[] = [];
  let current = startMins;

  while (current + slotDuration <= endMins) {
    const slotStart = minsToTime(current);
    const slotEnd = minsToTime(current + slotDuration);

    const existingSlot = existingSlots.find(
      (s) => utcYmd(new Date(s.date)) === dateStr && s.startTime === slotStart,
    );

    const available =
      !existingSlot ||
      (existingSlot.isAvailable && existingSlot.currentBookings < existingSlot.maxBookings);

    slots.push({ startTime: slotStart, endTime: slotEnd, available });
    current += slotDuration + buffer;
  }

  return slots;
}

function minsToTime(mins: number): string {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// Get available dates for the next N days
export function getAvailableDates(
  schedule: ProductAvailabilitySchedule[],
  overrides: ProductAvailabilityOverride[],
  advanceBookingDays: number,
): string[] {
  const dates: string[] = [];
  const now = new Date();
  const startUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  for (let i = 1; i <= advanceBookingDays; i++) {
    const dayMs = startUtc + i * 86400000;
    const date = new Date(dayMs);
    const dateStr = utcYmd(date);
    const dayOfWeek = date.getUTCDay();

    const override = overrides.find(
      (o) => utcYmd(new Date(o.date)) === dateStr,
    );
    if (override?.isBlocked) continue;

    const hasSchedule = schedule.some((s) => s.dayOfWeek === dayOfWeek && s.isActive);
    if (hasSchedule || override?.customStartTime) {
      dates.push(dateStr);
    }
  }

  return dates;
}

export function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

export { utcMidnightFromYmd };
