export type TimeSlot = { from: string; to: string };
export type DaySchedule = { closed: boolean; allDay: boolean; slots: TimeSlot[] };
export type WeekSchedule = Record<string, DaySchedule>;

export const WEEK_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type WeekDay = (typeof WEEK_DAYS)[number];

const CLOSED_DAY_DEFAULT: DaySchedule = { closed: true, allDay: false, slots: [] };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeDaySchedule(rawDay: unknown): DaySchedule {
  if (!isPlainObject(rawDay)) {
    return { ...CLOSED_DAY_DEFAULT };
  }

  let closed = Boolean(rawDay.closed);
  const allDay = Boolean(rawDay.allDay);
  const slots: TimeSlot[] = Array.isArray(rawDay.slots)
    ? rawDay.slots
        .filter((s): s is Record<string, unknown> => isPlainObject(s))
        .map((s) => ({
          from: typeof s.from === "string" ? s.from.trim() : "",
          to: typeof s.to === "string" ? s.to.trim() : "",
        }))
        .filter((s) => s.from.length > 0 && s.to.length > 0)
    : [];

  if (!closed && !allDay && slots.length === 0) {
    closed = true;
  }

  return { closed, allDay, slots };
}

/** Server-side write guard — coerces any incoming JSON to a complete, persist-safe WeekSchedule. */
export function normalizeOpeningHoursForDb(raw: unknown): WeekSchedule | null {
  if (raw == null || !isPlainObject(raw)) {
    return null;
  }

  const schedule: WeekSchedule = {};
  for (const day of WEEK_DAYS) {
    schedule[day] =
      raw[day] === undefined ? { ...CLOSED_DAY_DEFAULT } : normalizeDaySchedule(raw[day]);
  }
  return schedule;
}

export function getTodayKey(): WeekDay {
  const idx = new Date().getDay();
  const map: WeekDay[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return map[idx] ?? "monday";
}

function parseTimeToMinutes(value: string): number | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1]!, 10);
  const minutes = parseInt(match[2]!, 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export function formatDayHours(schedule: DaySchedule | undefined): string {
  if (!schedule || schedule.closed) return "Closed";
  if (schedule.allDay) return "Open 24 hours";
  const slots = schedule.slots ?? [];
  if (!slots.length) return "Closed";
  return slots.map((s) => `${s.from} – ${s.to}`).join(", ");
}

export function getStoreOpenStatus(openingHours: WeekSchedule | null): {
  isOpen: boolean;
  label: string;
  detail: string;
} {
  if (!openingHours) {
    return { isOpen: false, label: "Hours not set", detail: "Contact the store for hours" };
  }

  const today = getTodayKey();
  const day = openingHours[today];
  if (!day || day.closed) {
    return { isOpen: false, label: "Closed today", detail: "Opens on the next scheduled day" };
  }
  if (day.allDay) {
    return { isOpen: true, label: "Open now", detail: "Open 24 hours today" };
  }
  const slots = day.slots ?? [];
  if (!slots.length) {
    return { isOpen: false, label: "Closed today", detail: "No hours listed for today" };
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  for (const slot of slots) {
    const from = parseTimeToMinutes(slot.from);
    const to = parseTimeToMinutes(slot.to);
    if (from == null || to == null) continue;
    if (nowMinutes >= from && nowMinutes <= to) {
      return { isOpen: true, label: "Open now", detail: `Closes at ${slot.to}` };
    }
  }

  const nextSlot = slots[0];
  return {
    isOpen: false,
    label: "Closed now",
    detail: nextSlot ? `Opens at ${nextSlot.from}` : "Closed today",
  };
}
