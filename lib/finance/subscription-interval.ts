/** Canonical recurring config for LinkWe service subscription intervals. */
export type RecurringInterval = {
  interval: "week" | "month";
  interval_count: number;
};

const INTERVAL_MAP: Record<string, RecurringInterval> = {
  weekly: { interval: "week", interval_count: 1 },
  fortnightly: { interval: "week", interval_count: 2 },
  monthly: { interval: "month", interval_count: 1 },
  quarterly: { interval: "month", interval_count: 3 },
};

const INTERVAL_DISPLAY: Record<string, string> = {
  weekly: "per week",
  fortnightly: "every 2 weeks",
  monthly: "per month",
  quarterly: "per quarter",
};

/** Canonical billing interval keys accepted by mapSubscriptionInterval. */
export const SUBSCRIPTION_INTERVAL_KEYS = Object.keys(INTERVAL_MAP) as Array<
  keyof typeof INTERVAL_MAP
>;

/**
 * Maps Product.subscriptionInterval strings to LinkWe's recurring schedule.
 * Returns null for unknown or empty values (callers should treat as invalid).
 */
export function mapSubscriptionInterval(
  interval: string | null | undefined,
): RecurringInterval | null {
  if (!interval) return null;
  const key = interval.trim().toLowerCase();
  return INTERVAL_MAP[key] ?? null;
}

/** Customer-facing price suffix, e.g. "per month". Falls back to "per cycle" when unknown. */
export function formatSubscriptionIntervalDisplay(
  interval: string | null | undefined,
): string {
  if (!interval) return "per cycle";
  const key = interval.trim().toLowerCase();
  return INTERVAL_DISPLAY[key] ?? "per cycle";
}
