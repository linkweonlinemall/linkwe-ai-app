import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getNextBusinessOnboardingStep } from "@/lib/onboarding/business-progress";
import { getIntendedPlanCookie, getPlanPickerConfirmedCookie } from "@/lib/onboarding/intended-plan";
import { PLAN_PICKER_OPTIONS } from "@/lib/onboarding/plan-picker-options";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";

import { BusinessPlanPickerForm } from "./plan-picker-form";

export default async function BusinessOnboardingPlanPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") redirect("/login");

  const store = await getStoreByOwnerId(user.id);
  const next = getNextBusinessOnboardingStep(user, store);
  if (next === null) redirect("/dashboard/vendor");

  const planConfirmed = await getPlanPickerConfirmedCookie();
  if (next !== 1 || planConfirmed) {
    redirect(`/onboarding/business/step-${next}`);
  }

  const cookiePlan = await getIntendedPlanCookie();
  const defaultPlan = cookiePlan ?? "STARTER";

  return (
    <div
      data-plan-picker
      className="min-w-0 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl shadow-zinc-900/5"
    >
      <div className="bg-gradient-to-br from-[#1C1C1A] via-[#29201B] to-[#66300F] px-5 py-7 text-white sm:px-8 sm:py-9">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Let’s build your business</p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Choose your plan
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
        Start small or make room to grow. Choose the plan that fits your business today—you can upgrade later.
      </p>
      </div>
      <div className="p-4 sm:p-7">
      <BusinessPlanPickerForm options={PLAN_PICKER_OPTIONS} defaultPlan={defaultPlan} />
      </div>
    </div>
  );
}
