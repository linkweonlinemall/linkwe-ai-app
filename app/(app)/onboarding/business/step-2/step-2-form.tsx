"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveBusinessOnboardingStep2, type BusinessOnboardingState } from "../actions";

export function BusinessStep2Form() {
  const [state, formAction, pending] = useActionState(saveBusinessOnboardingStep2, {} as BusinessOnboardingState);

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Step 2 of 3</p>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">ID verification</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Upload a clear photo or PDF of government-issued ID.</p>

      <form className="mt-8 flex flex-col gap-4" action={formAction} encType="multipart/form-data">
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          ID document
          <input
            required
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            name="document"
            type="file"
          />
        </label>

        {state.error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200" role="alert">
            {state.error}
          </p>
        ) : null}

        <button
          className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          disabled={pending}
          type="submit"
        >
          {pending ? "Uploading…" : "Continue"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link className="font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200" href="/onboarding/business/step-1">
          ← Back
        </Link>
      </p>
    </div>
  );
}
