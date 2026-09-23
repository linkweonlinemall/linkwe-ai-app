import { mapSubscriptionInterval } from "@/lib/finance/subscription-interval";

export function normalizeSubscriptionInterval(
  serviceType: string,
  rawInterval: string | null,
): { interval: string | null } | { error: string } {
  if (serviceType !== "SUBSCRIPTION") {
    return { interval: rawInterval };
  }
  const normalized = rawInterval?.trim().toLowerCase() ?? "";
  if (!mapSubscriptionInterval(normalized)) {
    return {
      error: "A billing interval is required for subscription services.",
    };
  }
  return { interval: normalized };
}

export function validateSubscriptionConfiguration(input: {
  serviceType: string;
  interval: string | null;
  price: number;
  sessionsIncluded: number | null;
  cancellationDays: number | null;
  trialDays: number | null;
  trialPrice: number | null;
  canPause: boolean;
  pauseMaxWeeks: number | null;
}): string | null {
  if (input.serviceType !== "SUBSCRIPTION") return null;
  if (!Number.isFinite(input.price) || input.price <= 0) {
    return "Subscription services need a recurring price greater than zero.";
  }
  if (
    input.sessionsIncluded != null &&
    (!Number.isInteger(input.sessionsIncluded) ||
      input.sessionsIncluded < 1 ||
      input.sessionsIncluded > 1000)
  ) {
    return "Sessions per cycle must be between 1 and 1,000.";
  }
  if (
    input.cancellationDays != null &&
    (!Number.isInteger(input.cancellationDays) ||
      input.cancellationDays < 0 ||
      input.cancellationDays > 365)
  ) {
    return "Cancellation notice must be between 0 and 365 days.";
  }
  const cycleDays =
    input.interval === "weekly"
      ? 7
      : input.interval === "fortnightly"
        ? 14
        : input.interval === "quarterly"
          ? 92
          : 31;
  if (input.cancellationDays != null && input.cancellationDays >= cycleDays) {
    return `Cancellation notice must be less than ${cycleDays} days for this billing interval.`;
  }
  if (
    input.trialDays != null &&
    (!Number.isInteger(input.trialDays) ||
      input.trialDays < 1 ||
      input.trialDays > 365)
  ) {
    return "Trial length must be between 1 and 365 days.";
  }
  if (
    input.trialPrice != null &&
    (!Number.isFinite(input.trialPrice) ||
      input.trialPrice < 0 ||
      input.trialPrice > input.price)
  ) {
    return "Trial price must be between zero and the recurring price.";
  }
  if (input.trialPrice != null && input.trialDays == null) {
    return "Add a trial length before setting a trial price.";
  }
  if (
    input.canPause &&
    (!Number.isInteger(input.pauseMaxWeeks) ||
      (input.pauseMaxWeeks ?? 0) < 1 ||
      (input.pauseMaxWeeks ?? 0) > 52)
  ) {
    return "Pause limit must be between 1 and 52 weeks.";
  }
  return null;
}
