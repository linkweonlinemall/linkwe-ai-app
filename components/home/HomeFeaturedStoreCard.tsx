"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Package, Star, StarHalf } from "lucide-react";

import SaveStoreButton from "@/components/ui/SaveStoreButton";
import { colors } from "@/lib/design-system";

export type FeaturedStoreCardData = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  regionLabel: string;
  productCount: number;
  tags: string[];
  reviewAvg: number | null;
  reviewCount: number;
  initialSaved: boolean;
};

function productCountPhrase(n: number): string {
  if (n === 1) return "1 product";
  return `${n} products`;
}

function reviewCountPhrase(n: number): string {
  if (n === 1) return "1 review";
  return `${n} reviews`;
}

function RatingStars({ rating }: { rating: number }) {
  const clamped = Math.min(5, Math.max(0, rating));
  const halfUnits = Math.round(clamped * 2);
  const nodes: ReactNode[] = [];
  let remainder = halfUnits;
  const amber = colors.amber;

  for (let i = 0; i < 5; i++) {
    if (remainder >= 2) {
      remainder -= 2;
      nodes.push(
        <Star
          key={i}
          className="size-3.5 shrink-0"
          aria-hidden
          strokeWidth={0}
          fill={amber}
          color={amber}
        />,
      );
    } else if (remainder >= 1) {
      remainder -= 1;
      nodes.push(
        <StarHalf key={i} className="size-3.5 shrink-0 fill-[#E8820C] text-[#E8820C]" aria-hidden strokeWidth={0} />,
      );
    } else {
      nodes.push(<Star key={i} className="size-3.5 shrink-0 fill-none text-gray-300" aria-hidden strokeWidth={1.75} />);
    }
  }

  return <span className="flex items-center gap-0.5">{nodes}</span>;
}

export default function HomeFeaturedStoreCard({ store }: { store: FeaturedStoreCardData }) {
  const hasReviews = store.reviewCount > 0 && store.reviewAvg != null && store.reviewAvg > 0;
  const topTags = store.tags.slice(0, 3);

  return (
    <Link
      href={`/store/${store.slug}`}
      className="group block cursor-pointer rounded-xl border border-gray-100 bg-white shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-xl">
          {store.coverPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote vendor URLs
            <img
              src={store.coverPhotoUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div
              className="h-full w-full"
              style={{
                background: `linear-gradient(135deg, ${colors.dark} 0%, rgba(212,69,10,0.18) 100%)`,
              }}
            />
          )}
          <SaveStoreButton storeId={store.id} initialSaved={store.initialSaved} variant="iconOverlay" />
        </div>

        <div className="rounded-b-xl bg-white p-6">
          <div className="flex items-start gap-4">
            <div className="-mt-8 relative z-10 size-16 shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow-sm">
              {store.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={store.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex size-full items-center justify-center bg-[#D4450A] font-sans text-xl font-semibold uppercase text-white"
                  aria-hidden
                >
                  {store.name[0]?.toUpperCase() ?? ""}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <h3 className="mb-1 font-sans text-xl font-semibold leading-snug tracking-tight text-[#1C1C1A]">{store.name}</h3>
              {store.tagline ? (
                <p className="mb-3 line-clamp-1 font-sans text-sm text-gray-600">{store.tagline}</p>
              ) : (
                <div className="mb-3" aria-hidden />
              )}

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[13px] text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-[14px] shrink-0" strokeWidth={2} aria-hidden />
                  <span>{store.regionLabel}</span>
                </span>
                <span className="text-gray-400" aria-hidden>
                  •
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Package className="size-[14px] shrink-0" strokeWidth={2} aria-hidden />
                  <span>{productCountPhrase(store.productCount)}</span>
                </span>
              </div>

              {topTags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {topTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-amber-50 px-3 py-1 font-sans text-xs font-medium text-amber-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <div className="min-w-0">
              {hasReviews ? (
                <div className="flex flex-wrap items-center gap-2 font-sans text-[13px] text-gray-500">
                  <RatingStars rating={store.reviewAvg!} />
                  <span>{reviewCountPhrase(store.reviewCount)}</span>
                </div>
              ) : (
                <p className="font-sans text-[13px] text-gray-400">No reviews yet</p>
              )}
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 font-sans text-sm font-semibold text-[#D4450A] transition-colors group-hover:underline">
              Visit store
              <ChevronRight className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
            </span>
          </footer>
        </div>
      </div>
    </Link>
  );
}
