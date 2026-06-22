import type { Store, User } from "@prisma/client";
import { getNextBusinessOnboardingStep } from "@/lib/onboarding/business-progress";
import { getPlanPickerConfirmedCookie } from "@/lib/onboarding/intended-plan";
import { prisma } from "@/lib/prisma";
import { getRoleDashboardPath } from "./redirects";

/**
 * Where a signed-in user should land next. Vendors must finish Phase A business onboarding first.
 * Sync helper — does not account for the plan picker; prefer resolveAuthLandingPath for vendors.
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

  return getRoleDashboardPath(user.role);
}

/** Loads vendor store onboarding row when needed; use from server layouts and auth redirects. */
export async function resolveAuthLandingPath(user: User): Promise<string> {
  const store =
    user.role === "VENDOR"
      ? await prisma.store.findFirst({ where: { ownerId: user.id }, select: { onboardingStep: true } })
      : null;

  if (user.role === "VENDOR") {
    const step = getNextBusinessOnboardingStep(user, store);
    if (step !== null) {
      const planConfirmed = await getPlanPickerConfirmedCookie();
      if (step === 1 && !planConfirmed) {
        return "/onboarding/business/plan";
      }
      return `/onboarding/business/step-${step}`;
    }
    return "/dashboard/vendor";
  }

  return getAuthLandingPath(user, store);
}
