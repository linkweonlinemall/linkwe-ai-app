import { dayOfWeekTrinidad } from "@/lib/timezone/trinidad";

export type TimeSlotRange = { from: string; to: string };
export type DaySchedule = { closed: boolean; allDay: boolean; slots: TimeSlotRange[] };
export type WeekSchedule = Record<string, DaySchedule>;

export const WEEKDAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** JS getDay(): 0 = Sunday … 6 = Saturday */
export const DAY_KEY_BY_JS_DOW: readonly string[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function parseStoreOpeningHours(raw: unknown): WeekSchedule | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as WeekSchedule;
}

export function formatTimeCompact(time24: string): string {
  const [hRaw, mRaw] = time24.split(":");
  const h = parseInt(hRaw ?? "0", 10);
  const m = parseInt(mRaw ?? "0", 10);
  const period = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  if (m === 0) return `${hour12}${period}`;
  return `${hour12}:${String(m).padStart(2, "0")}${period}`;
}

export function formatDayHoursLabel(day: DaySchedule): string | null {
  if (day.closed || day.slots.length === 0) return null;
  const slot = day.slots[0]!;
  return `${formatTimeCompact(slot.from)}–${formatTimeCompact(slot.to)}`;
}

export function getDayScheduleForDate(
  openingHours: WeekSchedule | null,
  dateStr: string,
): DaySchedule | null {
  if (!openingHours) return null;
  const dayKey = DAY_KEY_BY_JS_DOW[dayOfWeekTrinidad(dateStr)];
  if (!dayKey) return null;
  return openingHours[dayKey] ?? null;
}

export function getStoreHoursRangeForDay(
  openingHours: WeekSchedule | null,
  dayKey: string,
): { from: string; to: string } | null {
  if (!openingHours) return null;
  const day = openingHours[dayKey];
  if (!day || day.closed || day.slots.length === 0) return null;
  const slot = day.slots[0]!;
  return { from: slot.from, to: slot.to };
}

export function formatScheduleSummary(
  useStoreHours: boolean,
  availableDays: string[],
  availableFrom: string | null,
  availableTo: string | null,
  openingHours: WeekSchedule | null,
): string {
  if (useStoreHours) return "Follows store hours";

  if (availableDays.length === 0) return "Custom schedule";

  const dayLabels = availableDays.map((d) => {
    const idx = WEEKDAY_KEYS.indexOf(d as (typeof WEEKDAY_KEYS)[number]);
    return idx >= 0 ? WEEKDAY_SHORT[idx] : d.slice(0, 3);
  });

  const timePart =
    availableFrom && availableTo
      ? ` · ${formatTimeCompact(availableFrom)}–${formatTimeCompact(availableTo)}`
      : "";

  if (availableDays.length === 1) {
    return `${dayLabels[0]} only${timePart}`;
  }
  if (availableDays.length <= 3) {
    return `${dayLabels.join(", ")}${timePart}`;
  }
  return `${availableDays.length} days${timePart}`;
}
