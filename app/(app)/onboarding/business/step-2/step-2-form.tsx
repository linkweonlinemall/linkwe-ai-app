"use client";

import { useActionState } from "react";

import Input from "@/components/ui/Input";
import { saveBusinessOnboardingStep2, type BusinessOnboardingState } from "../actions";

function WizardFormFooter({
  currentStep,
  showBack,
  backHref,
  isLastStep,
  pending,
  pendingLabel,
}: {
  currentStep: number;
  showBack: boolean;
  backHref?: string;
  isLastStep: boolean;
  pending: boolean;
  pendingLabel: string;
}) {
  const stepsLength = 3;
  return (
    <div
      className="mt-8 flex items-center justify-between pt-6"
      style={{ borderTop: "1px solid var(--card-border-subtle)" }}
    >
      <div>
        {showBack && backHref ? (
          <a
            href={backHref}
            className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-50"
            style={{ color: "var(--text-secondary)", borderColor: "var(--card-border)" }}
          >
            ← Back
          </a>
        ) : null}
      </div>
      <span className="text-xs" style={{ color: "var(--text-faint)" }}>
        Step {currentStep + 1} of {stepsLength}
      </span>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: "var(--scarlet)" }}
      >
        {pending ? pendingLabel : isLastStep ? "Complete Setup" : "Continue →"}
      </button>
    </div>
  );
}

export function BusinessStep2Form() {
  const [state, formAction, pending] = useActionState(saveBusinessOnboardingStep2, {} as BusinessOnboardingState);

  return (
    <form className="flex flex-col gap-4" action={formAction}>
      <Input
        required
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5"
        label="ID document"
        name="document"
        type="file"
      />

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}

      <WizardFormFooter
        currentStep={1}
        showBack
        backHref="/onboarding/business/step-1"
        isLastStep={false}
        pending={pending}
        pendingLabel="Uploading…"
      />
    </form>
  );
}
