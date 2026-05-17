import Link from "next/link";

import type { PublicStoreCard as PublicStoreCardType } from "@/app/actions/public-stores";
import { getRegionLabel } from "@/lib/regions/tt-regions";

function formatCategoryLabel(categoryId: string): string {
  return categoryId.replace(/_/g, " ");
}

function StarRow({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const frac = rating - full >= 0.5 ? 1 : 0;
  const rounded = frac ? full + 1 : full;
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={i < rounded ? "text-amber-400" : "text-zinc-200"}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function PublicStoreCard({ store }: { store: PublicStoreCardType }) {
  const initials =
    store.name
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .map((w) => w[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || store.name.charAt(0).toUpperCase();

  const hasRating =
    store.reviewCount > 0 && store.averageRating != null && store.averageRating > 0;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md">
      <Link href={`/store/${store.slug}`} className="relative block shrink-0">
        <div className="relative aspect-[21/10] overflow-hidden bg-zinc-100">
          {store.coverPhotoUrl ? (
            <img
              src={store.coverPhotoUrl}
              alt=""
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2E2D2A] to-[#1C1C1A]">
              <span className="text-xl font-semibold text-white/80">{initials}</span>
            </div>
          )}
        </div>
        <div className="absolute bottom-3 left-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border-2 border-white bg-white shadow-md">
          {store.logoUrl ? (
            <img src={store.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-[#D4450A]">{initials.slice(0, 1)}</span>
          )}
        </div>
      </Link>

      <div className="flex min-h-[10rem] flex-1 flex-col p-4 pt-5">
        <div className="min-h-[3rem]">
          <Link href={`/store/${store.slug}`}>
            <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-zinc-900 underline-offset-4 hover:text-[#D4450A] hover:underline">
              {store.name}
            </h2>
          </Link>
          {store.tagline ? (
            <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{store.tagline}</p>
          ) : store.descriptionPreview ? (
            <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{store.descriptionPreview}</p>
          ) : (
            <p className="mt-1 text-xs text-zinc-400">Discover products from this vendor.</p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium capitalize text-zinc-600 ring-1 ring-zinc-200/80">
            {formatCategoryLabel(store.categoryId)}
          </span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 ring-1 ring-zinc-200/80">
            {getRegionLabel(store.region)}
          </span>
          {store.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-[#c43d09] ring-1 ring-orange-100"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3">
          <div className="min-w-0">
            {hasRating ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <StarRow rating={store.averageRating!} />
                <span className="font-medium tabular-nums text-zinc-700">
                  {store.averageRating!.toFixed(1)}
                </span>
                <span className="text-zinc-400">
                  ({store.reviewCount} review{store.reviewCount !== 1 ? "s" : ""})
                </span>
              </div>
            ) : (
              <span className="text-xs text-zinc-400">No reviews yet</span>
            )}
          </div>
          <Link
            href={`/store/${store.slug}`}
            className="rounded-lg bg-[#D4450A] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            Visit store
          </Link>
        </div>
      </div>
    </article>
  );
}
