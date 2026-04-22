import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getNextBusinessOnboardingStep } from "@/lib/onboarding/business-progress";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";

import { BusinessStep1Form } from "./step-1-form";

const STEPS = ["Business Info", "Verification", "Store Setup"] as const;

function BusinessOnboardingProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-center gap-0">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: i < currentStep ? "var(--scarlet)" : i === currentStep ? "white" : "white",
                  color:
                    i < currentStep ? "white" : i === currentStep ? "var(--scarlet)" : "var(--text-disabled)",
                  border:
                    i < currentStep ? "none" : i === currentStep ? "2px solid var(--scarlet)" : "1px solid var(--card-border)",
                }}
              >
                {i < currentStep ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className="whitespace-nowrap text-[11px]"
                style={{
                  color: i === currentStep ? "var(--scarlet)" : "var(--text-faint)",
                  fontWeight: i === currentStep ? 600 : 400,
                }}
              >
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 ? (
              <div
                className="mx-1 mb-5 h-0.5 w-12"
                style={{
                  backgroundColor: i < currentStep ? "var(--scarlet)" : "var(--card-border)",
                }}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function BusinessOnboardingStep1Page() {
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") redirect("/login");

  const store = await getStoreByOwnerId(user.id);
  const next = getNextBusinessOnboardingStep(user, store);
  if (next === null) redirect("/dashboard/vendor");
  if (next !== 1) redirect(`/onboarding/business/step-${next}`);

  return (
    <>
      <BusinessOnboardingProgress currentStep={0} />
      <div
        className="rounded-xl bg-white p-6 sm:p-8"
        style={{ border: "1px solid var(--card-border)" }}
      >
        <h1 className="mb-1 text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Business Information
        </h1>
        <p className="mb-6 text-sm" style={{ color: "var(--text-muted)" }}>
          Tell us about your business
        </p>
        <BusinessStep1Form defaultFullName={user.fullName} defaultPhone={user.phone ?? ""} defaultRegion={user.region ?? ""} />
      </div>
    </>
  );
}
