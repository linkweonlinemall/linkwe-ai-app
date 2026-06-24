/** Stripe recurring config for LinkWe service subscription intervals. */
export type StripeRecurringInterval = {
  interval: "week" | "month";
  interval_count: number;
};

const INTERVAL_MAP: Record<string, StripeRecurringInterval> = {
  weekly: { interval: "week", interval_count: 1 },
  fortnightly: { interval: "week", interval_count: 2 },
  monthly: { interval: "month", interval_count: 1 },
  quarterly: { interval: "month", interval_count: 3 },
};

/**
 * Maps Product.subscriptionInterval strings to Stripe price recurring config.
 * Returns null for unknown or empty values (callers should treat as invalid).
 */
export function mapSubscriptionIntervalToStripe(
  interval: string | null | undefined,
): StripeRecurringInterval | null {
  if (!interval) return null;
  const key = interval.trim().toLowerCase();
  return INTERVAL_MAP[key] ?? null;
}
