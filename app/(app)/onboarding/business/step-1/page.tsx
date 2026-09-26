import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getNextBusinessOnboardingStep } from "@/lib/onboarding/business-progress";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";
import { getPlanPickerConfirmedCookie } from "@/lib/onboarding/intended-plan";
import OnboardingFrame from "@/components/onboarding/OnboardingFrame";
import { BusinessStep1Form } from "./step-1-form";

export default async function BusinessOnboardingStep1Page() {
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") redirect("/login");
  const store = await getStoreByOwnerId(user.id);
  if (getNextBusinessOnboardingStep(user, store) === null) redirect("/dashboard/vendor");
  if (!(await getPlanPickerConfirmedCookie())) redirect("/onboarding/business/plan");
  return <OnboardingFrame step={2} title="First, a little about you." description="Let’s get to know the person behind the business. These details belong to your account."><BusinessStep1Form defaultFullName={user.fullName ?? ""} defaultPhone={user.phone ?? ""} defaultRegion={user.region ?? ""}/></OnboardingFrame>;
}
