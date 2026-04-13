import type { User } from "@prisma/client";

export type CourierOnboardingStep = 1 | 2;

/**
 * Next incomplete courier orientation step. `null` = Phase A courier onboarding complete.
 * - `courierOnboardingStep` 0 → show step 1
 * - `courierOnboardingStep` 1 → show step 2 (after step 1 submit)
 * - `courierOnboardingStep` ≥ 2 → done
 */
export function getNextCourierOnboardingStep(
  user: Pick<User, "role" | "courierOnboardingStep">,
): CourierOnboardingStep | null {
  if (user.role !== "COURIER") return null;
  if (user.courierOnboardingStep < 1) return 1;
  if (user.courierOnboardingStep < 2) return 2;
  return null;
}
