import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getNextBusinessOnboardingStep } from "@/lib/onboarding/business-progress";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";
import { getIntendedPlanCookie } from "@/lib/onboarding/intended-plan";
import OnboardingFrame from "@/components/onboarding/OnboardingFrame";
import { PLAN_PICKER_OPTIONS } from "@/lib/onboarding/plan-picker-options";
import { BusinessPlanPickerForm } from "./plan-picker-form";

export default async function BusinessOnboardingPlanPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") redirect("/login");
  const store = await getStoreByOwnerId(user.id);
  if (getNextBusinessOnboardingStep(user, store) === null) redirect("/dashboard/vendor");
  const defaultPlan = await getIntendedPlanCookie() ?? "STARTER";
  return <OnboardingFrame step={1} title="A plan for where you are." description="Start free or choose more room to grow. Pick what feels right for your business today." panel={false}><BusinessPlanPickerForm options={PLAN_PICKER_OPTIONS} defaultPlan={defaultPlan}/></OnboardingFrame>;
}
