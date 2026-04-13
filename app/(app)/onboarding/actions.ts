"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveAuthLandingPath } from "@/lib/auth/landing";
import { prisma } from "@/lib/prisma";

/** @deprecated Use `/onboarding/business` flows. */
export async function advanceVendorOnboardingAction(): Promise<void> {
  redirect("/onboarding/business/step-1");
}

/** @deprecated Use `/onboarding/business` flows. */
export async function completeVendorOnboardingAction(): Promise<void> {
  redirect("/onboarding/business/step-1");
}

export async function advanceCourierOnboardingAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "COURIER") {
    redirect("/login");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { courierOnboardingStep: 1 },
  });

  redirect("/onboarding/courier?step=2");
}

export async function completeCourierOnboardingAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "COURIER") {
    redirect("/login");
  }

  if (user.courierOnboardingStep < 1) {
    redirect("/onboarding/courier");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { courierOnboardingStep: 2 },
  });

  const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  redirect(await resolveAuthLandingPath(updated));
}

export async function completeCustomerWelcomeAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  redirect(await resolveAuthLandingPath(user));
}
