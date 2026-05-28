/** Trinidad & Tobago — Atlantic Standard Time (UTC-4, no DST). */
export const TRINIDAD_TIMEZONE = "America/Port_of_Spain";
export const TRINIDAD_OFFSET = "-04:00";

/** Calendar YYYY-MM-DD for a moment in Trinidad. */
export function ymdInTrinidad(instant: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TRINIDAD_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

/** Stable DB anchor for a Trinidad calendar day (noon AST). */
export function calendarDateAnchorTrinidad(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00${TRINIDAD_OFFSET}`);
}

/** Start/end of a Trinidad calendar day for range queries. */
export function dayRangeTrinidad(dateStr: string): { start: Date; end: Date } {
  return {
    start: new Date(`${dateStr}T00:00:00.000${TRINIDAD_OFFSET}`),
    end: new Date(`${dateStr}T23:59:59.999${TRINIDAD_OFFSET}`),
  };
}

/** 0 = Sunday … 6 = Saturday for a Trinidad calendar date. */
export function dayOfWeekTrinidad(dateStr: string): number {
  return calendarDateAnchorTrinidad(dateStr).getUTCDay();
}

/** Local wall-clock slot on a calendar day in Trinidad. */
export function slotInstantTrinidad(dateStr: string, time24: string): Date {
  const [h, m] = time24.split(":").map((v) => parseInt(v, 10));
  return new Date(
    `${dateStr}T${String(h).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}:00${TRINIDAD_OFFSET}`,
  );
}

export function isSlotInPastTrinidad(dateStr: string, startTime: string, now: Date = new Date()): boolean {
  return slotInstantTrinidad(dateStr, startTime).getTime() < now.getTime();
}
