import type { Store, User } from "@prisma/client";
import { getNextBusinessOnboardingStep } from "@/lib/onboarding/business-progress";
import { getNextCourierOnboardingStep } from "@/lib/onboarding/courier-progress";
import { prisma } from "@/lib/prisma";
import { getRoleDashboardPath } from "./redirects";

/**
 * Where a signed-in user should land next. Vendors must finish Phase A business onboarding first.
 */
export function getAuthLandingPath(user: User, store: Pick<Store, "onboardingStep"> | null): string {
  if (user.role === "ADMIN") {
    return "/dashboard/admin";
  }

  if (user.role === "VENDOR") {
    const step = getNextBusinessOnboardingStep(user as User, store);
    if (step !== null) {
      return `/onboarding/business/step-${step}`;
    }
    return "/dashboard/vendor";
  }

  if (user.role === "COURIER") {
    const nextCourier = getNextCourierOnboardingStep(user);
    if (nextCourier !== null) {
      return nextCourier === 2
        ? "/dashboard/courier/onboarding?step=2"
        : "/dashboard/courier/onboarding?step=1";
    }
    return "/dashboard/courier";
  }

  return getRoleDashboardPath(user.role);
}

/** Loads vendor store onboarding row when needed; use from server layouts and auth redirects. */
export async function resolveAuthLandingPath(user: User): Promise<string> {
  const store =
    user.role === "VENDOR"
      ? await prisma.store.findFirst({ where: { ownerId: user.id }, select: { onboardingStep: true } })
      : null;
  return getAuthLandingPath(user, store);
}
