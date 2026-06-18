/**
 * Billing-period keys for AI usage metering.
 * Keys are deterministic strings stored on AIUsage.periodKey.
 */

/** UTC calendar month when the store has no subscription renewal anchor. */
function calendarMonthKey(now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `cal-${y}-${m}`;
}

/** UTC date at day `day` in month `month` (0-based), clamped to the month's length. */
function utcDateWithDay(year: number, month: number, day: number): Date {
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, daysInMonth)));
}

function formatRenewKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `renew-${y}-${m}-${day}`;
}

/**
 * Returns the current billing period key for a store.
 *
 * - No planRenewsAt: calendar UTC month (`cal-YYYY-MM`). Resets on the 1st UTC each month.
 * - With planRenewsAt: subscription-aligned period starting on the renewal day-of-month.
 *   Uses the renewal anchor in the current UTC month; if that date is still in the future,
 *   steps back one month (handles month-length edge cases by clamping the day).
 */
export function getCurrentPeriodKey(
  planRenewsAt: Date | null | undefined,
  now: Date = new Date(),
): string {
  if (planRenewsAt == null) {
    return calendarMonthKey(now);
  }

  const renewalDay = planRenewsAt.getUTCDate();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth();

  let periodStart = utcDateWithDay(year, month, renewalDay);
  if (periodStart.getTime() > now.getTime()) {
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
    periodStart = utcDateWithDay(year, month, renewalDay);
  }

  return formatRenewKey(periodStart);
}

export type PeriodInfo = {
  periodKey: string;
  kind: "calendar" | "renewal";
};

/** Lightweight metadata for callers that need to distinguish period types. */
export function getPeriodInfo(
  planRenewsAt: Date | null | undefined,
  now: Date = new Date(),
): PeriodInfo {
  return {
    periodKey: getCurrentPeriodKey(planRenewsAt, now),
    kind: planRenewsAt == null ? "calendar" : "renewal",
  };
}
