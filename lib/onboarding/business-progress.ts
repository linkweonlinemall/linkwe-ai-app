import type { Store, User } from "@prisma/client";

export type BusinessOnboardingStep = 1 | 2 | 3;

/**
 * Next incomplete step for **vendor** accounts (Phase A). `null` = all three steps done.
 * - Step 1: account basics (`fullName`, `region` required; `phone` optional in UI)
 * - Step 2 is optional identity evidence and never blocks store setup.
 * - Step 3: store row exists with `onboardingStep >= 3` (store identity captured)
 */
export function getNextBusinessOnboardingStep(
  user: Pick<User, "role" | "fullName" | "region" | "idDocumentUrl">,
  store: Pick<Store, "onboardingStep"> | null,
): BusinessOnboardingStep | null {
  if (user.role !== "VENDOR") return null;
  if (!user.fullName?.trim() || !user.region?.trim()) return 1;
  if (!store || store.onboardingStep < 3) return 3;
  return null;
}

export function isVendorBusinessOnboardingComplete(
  user: Pick<User, "role" | "fullName" | "region" | "idDocumentUrl">,
  store: Pick<Store, "onboardingStep"> | null,
): boolean {
  return getNextBusinessOnboardingStep(user, store) === null;
}
