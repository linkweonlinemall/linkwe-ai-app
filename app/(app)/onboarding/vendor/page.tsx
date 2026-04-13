import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveAuthLandingPath } from "@/lib/auth/landing";

/** Legacy URL; Phase A vendor onboarding lives under `/onboarding/business`. */
export default async function VendorOnboardingRedirectPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  redirect(await resolveAuthLandingPath(user));
}
