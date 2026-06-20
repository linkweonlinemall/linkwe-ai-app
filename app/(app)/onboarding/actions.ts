"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveAuthLandingPath } from "@/lib/auth/landing";

/** @deprecated Use `/onboarding/business` flows. */
export async function advanceVendorOnboardingAction(): Promise<void> {
  redirect("/onboarding/business/step-1");
}

/** @deprecated Use `/onboarding/business` flows. */
export async function completeVendorOnboardingAction(): Promise<void> {
  redirect("/onboarding/business/step-1");
}

export async function completeCustomerWelcomeAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  redirect(await resolveAuthLandingPath(user));
}
