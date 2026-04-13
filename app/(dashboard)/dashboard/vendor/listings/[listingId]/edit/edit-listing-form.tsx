"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { ListingStatus } from "@prisma/client";
import { ListingMainImage } from "@/components/listing-main-image";
import { updateListingAction, type EditListingFormState } from "./actions";

type Props = {
  listingId: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  shortDescription: string | null;
  priceMinor: number;
  status: ListingStatus;
};

export function EditListingForm({ listingId, title, slug, imageUrl, shortDescription, priceMinor, status }: Props) {
  const [state, formAction, pending] = useActionState(updateListingAction, {} as EditListingFormState);
  const priceDefault = (priceMinor / 100).toFixed(2);

  return (
    <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Edit listing</h1>
      <p className="mt-1 text-sm">
        <Link className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50" href="/dashboard/vendor">
          ← Back to vendor dashboard
        </Link>
      </p>

      <form className="mt-8 flex flex-col gap-4" action={formAction} encType="multipart/form-data">
        <input name="listingId" type="hidden" value={listingId} />

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Title
          <input
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={title}
            name="title"
            type="text"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Slug
          <input
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={slug}
            name="slug"
            type="text"
          />
          <span className="text-xs font-normal text-zinc-500">Published listings use /listing/your-slug.</span>
        </label>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Current image</p>
          <ListingMainImage
            alt={`${title} main image`}
            aspectClass="aspect-video"
            className="w-full max-w-sm rounded-lg"
            imageUrl={imageUrl}
          />
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Replace image (optional)
          <input
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:file:bg-zinc-700 dark:file:text-zinc-100"
            name="image"
            type="file"
          />
          <span className="text-xs font-normal text-zinc-500">JPEG, PNG, WebP, or GIF — max 5MB.</span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-800 dark:text-zinc-200">
          <input className="mt-1 size-4 rounded border-zinc-300 dark:border-zinc-600 dark:bg-zinc-950" name="removeImage" type="checkbox" />
          <span>Remove current image (only local uploads are deleted from disk; external URLs are cleared from the listing only).</span>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Short description
          <textarea
            required
            className="min-h-[100px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={shortDescription ?? ""}
            name="shortDescription"
            rows={4}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Price (USD)
          <input
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={priceDefault}
            name="price"
            min="0.01"
            placeholder="19.99"
            step="0.01"
            type="number"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Status
          <select
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"}
            name="status"
          >
            <option value="DRAFT">Draft (not on public store)</option>
            <option value="PUBLISHED">Published (visible on public store)</option>
          </select>
        </label>

        {state.error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200" role="alert">
            {state.error}
          </p>
        ) : null}

        <button
          className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
