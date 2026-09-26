import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getNextBusinessOnboardingStep } from "@/lib/onboarding/business-progress";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";
import { getPlanPickerConfirmedCookie } from "@/lib/onboarding/intended-plan";
import OnboardingFrame from "@/components/onboarding/OnboardingFrame";
import { BusinessStep2Form } from "./step-2-form";

export default async function BusinessOnboardingStep2Page() {
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") redirect("/login");
  const store = await getStoreByOwnerId(user.id);
  const next = getNextBusinessOnboardingStep(user, store);
  if (next === null) redirect("/dashboard/vendor");
  if (!(await getPlanPickerConfirmedCookie())) redirect("/onboarding/business/plan");
  if (next === 1) redirect("/onboarding/business/step-1");
  return <OnboardingFrame step={3} title="Build trust from the start." description="Verify your identity so we can review your business. In a hurry? Skip this step and come back from your dashboard."><BusinessStep2Form verificationStatus={user.idVerificationStatus} hasDocuments={Boolean(user.idDocumentUrl && user.selfieWithIdUrl)}/></OnboardingFrame>;
}
