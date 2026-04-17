import Link from "next/link";

import { ListingMainImage } from "@/components/listing-main-image";

type ListingRow = {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  status: string;
  createdAt: Date | string;
};

type Props = {
  listings: ListingRow[];
};

export default function ListingsTab({ listings }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[#D4450A] px-4 text-sm font-medium text-white hover:bg-[#B83A08] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          href="/dashboard/vendor/listings/new"
        >
          Create listing
        </Link>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Your listings</h2>
        {listings.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">No listings yet. Create one above.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-700">
            {listings.map((listing) => (
              <li
                key={listing.id}
                className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 gap-4">
                  <ListingMainImage
                    alt={`${listing.title} main image`}
                    aspectClass="aspect-square"
                    className="w-24 shrink-0 rounded-lg"
                    imageUrl={listing.imageUrl}
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">{listing.title}</p>
                    <p className="mt-0.5 font-mono text-xs text-zinc-500">{listing.slug}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {listing.status} ·{" "}
                      {new Date(listing.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:self-center">
                  <Link
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-900 hover:bg-white dark:border-zinc-600 dark:text-zinc-50 dark:hover:bg-zinc-900"
                    href={`/dashboard/vendor/listings/${listing.id}/edit`}
                  >
                    Edit
                  </Link>
                  <Link
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-900 hover:bg-white dark:border-zinc-600 dark:text-zinc-50 dark:hover:bg-zinc-900"
                    href={`/listing/${listing.slug}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
