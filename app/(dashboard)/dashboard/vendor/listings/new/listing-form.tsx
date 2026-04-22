"use client";

import { useActionState } from "react";
import Link from "next/link";

import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { createListingAction, type ListingFormState } from "./actions";

export function ListingCreateForm() {
  const [state, formAction, pending] = useActionState(createListingAction, {} as ListingFormState);

  return (
    <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Create listing</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Public URL will be <span className="font-mono text-zinc-800">/listing/your-slug</span> when published.
      </p>
      <p className="mt-1 text-sm">
        <Link className="font-medium text-zinc-900 underline-offset-4 hover:underline" href="/dashboard/vendor">
          ← Back to vendor dashboard
        </Link>
      </p>

      <form className="mt-8 flex flex-col gap-4" action={formAction}>
        <Input
          required
          className="text-base"
          label="Title"
          name="title"
          type="text"
        />

        <Input
          required
          className="font-mono text-base"
          helperText="Lowercase letters, numbers, hyphens (min 3)."
          label="Slug"
          name="slug"
          placeholder="handmade-mug"
          type="text"
        />

        <Input
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900"
          helperText="JPEG, PNG, WebP, or GIF — max 5MB. Stored on the server for local dev."
          label="Main image (optional)"
          name="image"
          type="file"
        />

        <Textarea
          required
          className="min-h-[100px] text-base"
          label="Short description"
          name="shortDescription"
          rows={4}
        />

        <Input
          required
          className="text-base"
          label="Price (USD)"
          min="0.01"
          name="price"
          placeholder="19.99"
          step="0.01"
          type="number"
        />

        <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-800">
          <input className="mt-1 size-4 rounded border-zinc-300" name="publish" type="checkbox" />
          <span>Publish immediately (visible on the public listing page and your store). Leave unchecked to save as draft.</span>
        </label>

        {state.error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {state.error}
          </p>
        ) : null}

        <button
          className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving…" : "Create listing"}
        </button>
      </form>
    </div>
  );
}
