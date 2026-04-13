"use client";

import { useActionState } from "react";
import Link from "next/link";
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

export function BusinessStep3Form({
  defaultName,
  defaultSlug,
  defaultCategoryId,
  defaultRegion,
  defaultTagline,
}: Props) {
  const [state, formAction, pending] = useActionState(saveBusinessOnboardingStep3, {} as BusinessOnboardingState);

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Step 3 of 3</p>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Store identity</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Public name, URL slug, category, and tagline.</p>

      <form className="mt-8 flex flex-col gap-4" action={formAction}>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Store name
          <input
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={defaultName}
            name="name"
            type="text"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Store slug
          <input
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={defaultSlug}
            name="slug"
            placeholder="my-store"
            type="text"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Category
          <select
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={defaultCategoryId}
            name="categoryId"
          >
            <option value="">Select…</option>
            {STORE_CATEGORY_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Store region
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
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Tagline
          <input
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={defaultTagline}
            name="tagline"
            placeholder="Short line shoppers see first"
            type="text"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Logo (optional)
          <input
            accept="image/jpeg,image/png,image/webp"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            name="logo"
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
          {pending ? "Saving…" : "Finish & go to dashboard"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link className="font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200" href="/onboarding/business/step-2">
          ← Back
        </Link>
      </p>
    </div>
  );
}
