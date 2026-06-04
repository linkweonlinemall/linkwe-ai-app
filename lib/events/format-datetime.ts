import { TRINIDAD_TIMEZONE } from "@/lib/timezone/trinidad";

const TZ = { timeZone: TRINIDAD_TIMEZONE } as const;

/** Saturday, 18 July 2026 — public hero, PDF, check-in */
export function formatEventDateLong(date: Date): string {
  return new Date(date).toLocaleDateString("en-TT", {
    ...TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Sat, 18 July 2026 — ticket purchase card header */
export function formatEventDateCard(date: Date): string {
  return new Date(date).toLocaleDateString("en-TT", {
    ...TZ,
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Sat, 18 Jul 2026 — my tickets list, event cards subtitle */
export function formatEventDateShort(date: Date): string {
  return new Date(date).toLocaleDateString("en-TT", {
    ...TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** 18 Jul 2026 — vendor events list */
export function formatEventDateCompact(date: Date): string {
  return new Date(date).toLocaleDateString("en-TT", {
    ...TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Calendar chip on event listing cards */
export function formatEventCalendarDay(date: Date): { day: string; month: string } {
  const d = new Date(date);
  return {
    day: d.toLocaleDateString("en-TT", { ...TZ, day: "numeric" }),
    month: d.toLocaleDateString("en-TT", { ...TZ, month: "short" }).toUpperCase(),
  };
}

/** 08:00 am — general event time */
export function formatEventTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-TT", {
    ...TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** 08:00 am — ticket card (fixed-width hour) */
export function formatEventTimeCard(date: Date): string {
  return new Date(date).toLocaleTimeString("en-TT", {
    ...TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** Sale window labels on ticket types */
export function formatEventSaleDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-TT", {
    ...TZ,
    day: "numeric",
    month: "short",
  });
}
