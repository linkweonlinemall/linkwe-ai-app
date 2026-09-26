import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getNextBusinessOnboardingStep } from "@/lib/onboarding/business-progress";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";
import { getIntendedPlanCookie, getPlanPickerConfirmedCookie } from "@/lib/onboarding/intended-plan";
import OnboardingFrame from "@/components/onboarding/OnboardingFrame";
import { PLAN_PICKER_OPTIONS } from "@/lib/onboarding/plan-picker-options";
import { BusinessStep3Form } from "./step-3-form";

export default async function BusinessOnboardingStep3Page() {
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") redirect("/login");
  const store = await getStoreByOwnerId(user.id);
  const next = getNextBusinessOnboardingStep(user, store);
  if (next === null) redirect("/dashboard/vendor");
  if (!(await getPlanPickerConfirmedCookie())) redirect("/onboarding/business/plan");
  if (next === 1) redirect("/onboarding/business/step-1");
  const plan = await getIntendedPlanCookie() ?? "STARTER";
  const option = PLAN_PICKER_OPTIONS.find(option => option.planId === plan)!;
  return <OnboardingFrame step={4} title="Make it feel like your business." description="Give your storefront a name, a short introduction and a place to call home. You can add the finishing touches later."><BusinessStep3Form userId={user.id} defaultCategoryId={store?.categoryId ?? ""} defaultName={store?.name ?? ""} defaultRegion={store?.region ?? user.region ?? ""} defaultSlug={store?.slug ?? ""} defaultTagline={store?.tagline ?? ""} plan={plan} planLabel={`${option.name} · ${option.priceLabel}${plan === "STARTER" ? "" : "/month"}`}/></OnboardingFrame>;
}
