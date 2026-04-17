"use client";

import { useActionState } from "react";
import Link from "next/link";
import { TRINIDAD_ONBOARDING_REGION_OPTIONS } from "@/lib/onboarding/tt-region-options";
import { saveBusinessOnboardingStep1, type BusinessOnboardingState } from "../actions";

type Props = {
  defaultFullName: string;
  defaultPhone: string;
  defaultRegion: string;
};

export function BusinessStep1Form({ defaultFullName, defaultPhone, defaultRegion }: Props) {
  const [state, formAction, pending] = useActionState(saveBusinessOnboardingStep1, {} as BusinessOnboardingState);

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Step 1 of 3</p>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Account basics</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Legal name, contact, and your Trinidad region.</p>

      <form className="mt-8 flex flex-col gap-4" action={formAction}>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Full name
          <input
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={defaultFullName}
            name="fullName"
            type="text"
          />
        </label>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Phone number
          </label>
          <div className="flex">
            <span className="inline-flex items-center rounded-l-lg border border-r-0 border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              +1 (868)
            </span>
            <input
              required
              autoComplete="tel"
              className="flex-1 rounded-r-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              defaultValue={defaultPhone}
              name="phone"
              placeholder="XXX-XXXX"
              type="tel"
            />
          </div>
          <p className="text-xs text-zinc-500">Trinidad & Tobago number. Enter your 7-digit number.</p>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Region
          <select
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={defaultRegion}
            name="region"
          >
            <option value="">Select region…</option>
            {TRINIDAD_ONBOARDING_REGION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {state.error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200" role="alert">
            {state.error}
          </p>
        ) : null}

        <button
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[#D4450A] px-4 text-sm font-medium text-white hover:bg-[#B83A08] disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving…" : "Continue"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link className="font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200" href="/login">
          Back to login
        </Link>
      </p>
    </div>
  );
}
