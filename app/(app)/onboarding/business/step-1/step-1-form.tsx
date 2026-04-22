"use client";

import { useActionState } from "react";
import Link from "next/link";

import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Select from "@/components/ui/Select";
import { TRINIDAD_ONBOARDING_REGION_OPTIONS } from "@/lib/onboarding/tt-region-options";
import { saveBusinessOnboardingStep1, type BusinessOnboardingState } from "../actions";

type Props = {
  defaultFullName: string;
  defaultPhone: string;
  defaultRegion: string;
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

export function BusinessStep1Form({ defaultFullName, defaultPhone, defaultRegion }: Props) {
  const [state, formAction, pending] = useActionState(saveBusinessOnboardingStep1, {} as BusinessOnboardingState);

  return (
    <>
      <form className="flex flex-col gap-4" action={formAction}>
        <Input
          required
          className="text-base"
          defaultValue={defaultFullName}
          label="Full name"
          name="fullName"
          type="text"
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="step1-phone">Phone number</Label>
          <div className="flex">
            <span className="inline-flex items-center rounded-l-lg border border-r-0 border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
              +1 (868)
            </span>
            <input
              required
              autoComplete="tel"
              className="flex-1 rounded-r-lg border border-l-0 border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
              defaultValue={defaultPhone}
              id="step1-phone"
              name="phone"
              placeholder="XXX-XXXX"
              type="tel"
            />
          </div>
          <p className="text-xs text-zinc-500">Trinidad & Tobago number. Enter your 7-digit number.</p>
        </div>
        <Select required className="text-base" defaultValue={defaultRegion} label="Region" name="region">
          <option value="">Select region…</option>
          {TRINIDAD_ONBOARDING_REGION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>

        {state.error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {state.error}
          </p>
        ) : null}

        <WizardFormFooter
          currentStep={0}
          showBack={false}
          isLastStep={false}
          pending={pending}
          pendingLabel="Saving…"
        />
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link className="font-medium text-zinc-800 underline-offset-4 hover:underline" href="/login">
          Back to login
        </Link>
      </p>
    </>
  );
}
