import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getNextBusinessOnboardingStep } from "@/lib/onboarding/business-progress";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";

export default async function VendorDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "VENDOR") {
    redirect(getRoleDashboardPath(user.role));
  }

  const store = await getStoreByOwnerId(user.id);
  const nextStep = getNextBusinessOnboardingStep(user, store);
  if (nextStep !== null) {
    redirect(`/onboarding/business/step-${nextStep}`);
  }

  return children;
}
