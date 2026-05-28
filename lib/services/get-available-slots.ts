import {
  DAY_KEY_BY_JS_DOW,
  getDayScheduleForDate,
  getStoreHoursRangeForDay,
  type WeekSchedule,
} from "@/lib/services/opening-hours";
import {
  calendarDateAnchorTrinidad,
  dayOfWeekTrinidad,
  isSlotInPastTrinidad,
  ymdInTrinidad,
} from "@/lib/timezone/trinidad";

export type ServiceAvailabilityInput = {
  durationMinutes: number;
  bufferMinutes: number;
  maxPerDay: number | null;
  useStoreHours: boolean;
  availableDays: string[];
  availableFrom: string | null;
  availableTo: string | null;
  isAvailable: boolean;
};

export type ExistingBookingSlot = {
  date: Date | string;
  startTime: string;
  currentBookings?: number;
  maxBookings?: number;
  isAvailable?: boolean;
};

export type AvailableSlot = {
  time: string;
  endTime: string;
  available: boolean;
};

function minsFromTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function timeFromMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function dateKeyFromInput(date: Date | string): string {
  if (typeof date === "string") return date.slice(0, 10);
  return ymdInTrinidad(date);
}

function dayKeyFromDateStr(dateStr: string): string {
  return DAY_KEY_BY_JS_DOW[dayOfWeekTrinidad(dateStr)] ?? "monday";
}

function resolveHoursForDay(
  service: ServiceAvailabilityInput,
  dayKey: string,
  openingHours: WeekSchedule | null,
): { from: string; to: string } | null {
  if (service.useStoreHours) {
    return getStoreHoursRangeForDay(openingHours, dayKey);
  }
  if (!service.availableDays.includes(dayKey)) return null;
  if (!service.availableFrom || !service.availableTo) return null;
  return { from: service.availableFrom, to: service.availableTo };
}

function countBookingsOnDate(
  dateStr: string,
  existingSlots: ExistingBookingSlot[],
): number {
  return existingSlots.filter((s) => {
    const key = dateKeyFromInput(s.date);
    if (key !== dateStr) return false;
    const booked =
      s.isAvailable === false ||
      (s.currentBookings ?? 0) >= (s.maxBookings ?? 1);
    return booked;
  }).length;
}

function isSlotBooked(
  dateStr: string,
  startTime: string,
  existingSlots: ExistingBookingSlot[],
): boolean {
  return existingSlots.some((s) => {
    const key = dateKeyFromInput(s.date);
    if (key !== dateStr || s.startTime !== startTime) return false;
    return (
      s.isAvailable === false ||
      (s.currentBookings ?? 0) >= (s.maxBookings ?? 1)
    );
  });
}

/**
 * Generate bookable time slots for a service on a given date (YYYY-MM-DD).
 */
export function getAvailableSlots(
  service: ServiceAvailabilityInput,
  date: Date | string,
  openingHours: WeekSchedule | null = null,
  existingSlots: ExistingBookingSlot[] = [],
): AvailableSlot[] {
  if (!service.isAvailable) return [];

  const dateStr = dateKeyFromInput(date);
  const dayKey = dayKeyFromDateStr(dateStr);

  if (service.useStoreHours) {
    const daySchedule = getDayScheduleForDate(openingHours, dateStr);
    if (!daySchedule || daySchedule.closed || daySchedule.slots.length === 0) {
      return [];
    }
  } else if (!service.availableDays.includes(dayKey)) {
    return [];
  }

  const range = resolveHoursForDay(service, dayKey, openingHours);
  if (!range) return [];

  const duration = Math.max(15, service.durationMinutes);
  const buffer = Math.max(0, service.bufferMinutes);
  const startMins = minsFromTime(range.from);
  const endMins = minsFromTime(range.to);
  if (endMins - startMins < duration) return [];

  const bookingsToday = countBookingsOnDate(dateStr, existingSlots);
  const dayCapReached =
    service.maxPerDay != null && bookingsToday >= service.maxPerDay;
  const todayYmd = ymdInTrinidad();

  const slots: AvailableSlot[] = [];
  let current = startMins;

  while (current + duration <= endMins) {
    const startTime = timeFromMins(current);
    const endTime = timeFromMins(current + duration);
    const booked = isSlotBooked(dateStr, startTime, existingSlots);
    const inPast = dateStr === todayYmd && isSlotInPastTrinidad(dateStr, startTime);
    const available = !dayCapReached && !booked && !inPast;
    slots.push({ time: startTime, endTime, available });
    current += duration + buffer;
  }

  return slots;
}

/** Dates in the next `advanceDays` days that have at least one available slot. */
export function getAvailableDatesForService(
  service: ServiceAvailabilityInput,
  openingHours: WeekSchedule | null,
  existingSlots: ExistingBookingSlot[],
  advanceDays: number,
): string[] {
  const dates: string[] = [];
  const todayYmd = ymdInTrinidad();
  const todayAnchor = calendarDateAnchorTrinidad(todayYmd);

  for (let i = 1; i <= advanceDays; i++) {
    const d = new Date(todayAnchor.getTime() + i * 86400000);
    const dateStr = ymdInTrinidad(d);
    const daySlots = getAvailableSlots(service, dateStr, openingHours, existingSlots);
    if (daySlots.some((s) => s.available)) dates.push(dateStr);
  }

  return dates;
}
