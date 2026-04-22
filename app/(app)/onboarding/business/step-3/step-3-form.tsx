"use client";

import { useActionState } from "react";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { TRINIDAD_ONBOARDING_REGION_OPTIONS } from "@/lib/onboarding/tt-region-options";
import { STORE_CATEGORY_OPTIONS } from "@/lib/onboarding/store-categories";
import { saveBusinessOnboardingStep3, type BusinessOnboardingState } from "../actions";

type Props = {
  defaultName: string;
  defaultSlug: string;
  defaultCategoryId: string;
  defaultRegion: string;
  defaultTagline: string;
};

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

export function BusinessStep3Form({
  defaultName,
  defaultSlug,
  defaultCategoryId,
  defaultRegion,
  defaultTagline,
}: Props) {
  const [state, formAction, pending] = useActionState(saveBusinessOnboardingStep3, {} as BusinessOnboardingState);

  return (
    <form className="flex flex-col gap-4" action={formAction}>
      <Input required className="text-base" defaultValue={defaultName} label="Store name" name="name" type="text" />
      <Input
        required
        className="font-mono text-base"
        defaultValue={defaultSlug}
        label="Store slug"
        name="slug"
        placeholder="my-store"
        type="text"
      />
      <Select required className="text-base" defaultValue={defaultCategoryId} label="Category" name="categoryId">
        <option value="">Select…</option>
        {STORE_CATEGORY_OPTIONS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </Select>
      <Select required className="text-base" defaultValue={defaultRegion} label="Store region" name="region">
        <option value="">Select region…</option>
        {TRINIDAD_ONBOARDING_REGION_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Input
        required
        className="text-base"
        defaultValue={defaultTagline}
        label="Tagline"
        name="tagline"
        placeholder="Short line shoppers see first"
        type="text"
      />
      <Input
        accept="image/jpeg,image/png,image/webp"
        className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5"
        label="Logo (optional)"
        name="logo"
        type="file"
      />

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}

      <WizardFormFooter
        currentStep={2}
        showBack
        backHref="/onboarding/business/step-2"
        isLastStep
        pending={pending}
        pendingLabel="Saving…"
      />
    </form>
  );
}
