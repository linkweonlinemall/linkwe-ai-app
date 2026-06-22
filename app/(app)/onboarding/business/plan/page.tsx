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
      className="rounded-xl bg-white p-6 sm:p-8"
      style={{ border: "1px solid var(--card-border)" }}
    >
      <h1 className="mb-1 text-xl font-bold" style={{ color: "var(--text-primary)" }}>
        Choose your plan
      </h1>
      <p className="mb-6 text-sm" style={{ color: "var(--text-muted)" }}>
        Pick the plan that fits your shop. Starter is free — upgrade anytime.
      </p>
      <BusinessPlanPickerForm options={PLAN_PICKER_OPTIONS} defaultPlan={defaultPlan} />
    </div>
  );
}
