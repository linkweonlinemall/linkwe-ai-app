export function canVendorUsePayOnArrival(
  subscriptionPlan: string | null | undefined,
  subscriptionStatus: string | null | undefined,
): boolean {
  return (
    subscriptionStatus === "ACTIVE" &&
    (subscriptionPlan === "GROWTH" || subscriptionPlan === "PRO")
  );
}
