"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { ListingStatus } from "@prisma/client";
import { ListingMainImage } from "@/components/listing-main-image";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
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
    <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Edit listing</h1>
      <p className="mt-1 text-sm">
        <Link className="font-medium text-zinc-900 underline-offset-4 hover:underline" href="/dashboard/vendor">
          ← Back to vendor dashboard
        </Link>
      </p>

      <form className="mt-8 flex flex-col gap-4" action={formAction}>
        <input name="listingId" type="hidden" value={listingId} />

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800">
          Title
          <input
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
            defaultValue={title}
            name="title"
            type="text"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800">
          Slug
          <input
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
            defaultValue={slug}
            name="slug"
            type="text"
          />
          <span className="text-xs font-normal text-zinc-500">Published listings use /listing/your-slug.</span>
        </label>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-zinc-800">Current image</p>
          <ListingMainImage
            alt={`${title} main image`}
            aspectClass="aspect-video"
            className="w-full max-w-sm rounded-lg"
            imageUrl={imageUrl}
          />
        </div>

        <Input
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900"
          helperText="JPEG, PNG, WebP, or GIF — max 5MB."
          label="Replace image (optional)"
          name="image"
          type="file"
        />

        <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-800">
          <input className="mt-1 size-4 rounded border-zinc-300" name="removeImage" type="checkbox" />
          <span>Remove current image (only local uploads are deleted from disk; external URLs are cleared from the listing only).</span>
        </label>

        <Textarea
          required
          className="min-h-[100px] text-base"
          defaultValue={shortDescription ?? ""}
          label="Short description"
          name="shortDescription"
          rows={4}
        />

        <Input
          required
          className="text-base"
          defaultValue={priceDefault}
          label="Price (USD)"
          min="0.01"
          name="price"
          placeholder="19.99"
          step="0.01"
          type="number"
        />

        <Select
          className="text-base"
          defaultValue={status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"}
          label="Status"
          name="status"
        >
          <option value="DRAFT">Draft (not on public store)</option>
          <option value="PUBLISHED">Published (visible on public store)</option>
        </Select>

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
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
