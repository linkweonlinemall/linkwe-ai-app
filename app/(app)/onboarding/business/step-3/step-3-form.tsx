"use client";

import { useActionState, useState } from "react";

import CompressedFileInput from "@/components/ui/CompressedFileInput";
import Input from "@/components/ui/Input";
import RegionSelect from "@/components/ui/RegionSelect";
import CategoryPicker from "@/components/ui/CategoryPicker";
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
  disabled = false,
}: {
  currentStep: number;
  showBack: boolean;
  backHref?: string;
  isLastStep: boolean;
  pending: boolean;
  pendingLabel: string;
  /** Extra disable condition (e.g. image upload in flight). Button is blocked
   *  but the label doesn't change to pendingLabel. */
  disabled?: boolean;
}) {
  const stepsLength = 3;
  const isDisabled = pending || disabled;
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
        disabled={isDisabled}
        title={disabled && !pending ? "Wait for image uploads to finish" : undefined}
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
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [imagesUploading, setImagesUploading] = useState(false);

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
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700">
          Category <span className="text-[#D4450A]">*</span>
        </label>
        <CategoryPicker name="categoryId" value={categoryId} onChange={setCategoryId} />
      </div>
      <RegionSelect name="region" defaultValue={defaultRegion} required label="Store region" />
      <Input
        required
        className="text-base"
        defaultValue={defaultTagline}
        label="Tagline"
        name="tagline"
        placeholder="Short line shoppers see first"
        type="text"
      />
      <CompressedFileInput
        accept="image/jpeg,image/png,image/webp"
        className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5"
        label="Logo (optional)"
        name="logo"
        onUploadingChange={setImagesUploading}
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
        disabled={imagesUploading}
      />
    </form>
  );
}
