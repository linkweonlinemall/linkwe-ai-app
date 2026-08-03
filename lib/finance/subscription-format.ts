export function formatSubscriptionPeriodEnd(
  currentPeriodEnd: Date | string | null,
): string {
  if (!currentPeriodEnd) return "the end of your billing period";
  const date =
    currentPeriodEnd instanceof Date ? currentPeriodEnd : new Date(currentPeriodEnd);
  if (Number.isNaN(date.getTime())) return "the end of your billing period";
  return date.toLocaleDateString("en-TT", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
