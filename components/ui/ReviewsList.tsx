"use client";

import { useState, type ReactNode } from "react";

import { markReviewHelpful } from "@/app/actions/reviews";

import StarRating from "./StarRating";

type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: Date | string;
  user: { fullName: string | null };
  product?: { name: string; slug: string; isService: boolean } | null;
};

type Props = {
  reviews: Review[];
  count: number;
  average: number;
  showProductName?: boolean;
  /** Default stacked layout — `pdp` uses summary column + cards column (+ optional aside from parent). */
  layoutDensity?: "default" | "pdp";
  /** PDP only: renders in third column alongside summary + reviews (e.g. write review form). */
  trailingAside?: ReactNode;
};

function ReviewSummaryCard({
  average,
  count,
  reviews,
}: {
  average: number;
  count: number;
  reviews: Review[];
}) {
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: Math.round((reviews.filter((r) => r.rating === star).length / count) * 100),
  }));

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 lg:sticky lg:top-28">
      <div className="text-center lg:text-left">
        <p className="font-sans text-4xl font-black text-zinc-900">{average.toFixed(1)}</p>
        <StarRating value={Math.round(average)} readonly size="md" />
        <p className="mt-1 font-sans text-xs text-zinc-400">
          {count} review{count !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        {dist.map((d) => (
          <div key={d.star} className="flex items-center gap-2">
            <span className="w-4 text-right font-sans text-xs font-semibold text-zinc-500">{d.star}</span>
            <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 fill-[#E8820C] stroke-[#E8820C]" strokeWidth="1" aria-hidden>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <div className="flex-1 overflow-hidden rounded-full bg-zinc-100">
              <div className="h-2 rounded-full bg-[#E8820C] transition-all" style={{ width: `${d.pct}%` }} />
            </div>
            <span className="w-8 text-right font-sans text-xs text-zinc-400">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReviewsList({
  reviews,
  count,
  average,
  showProductName = false,
  layoutDensity = "default",
  trailingAside,
}: Props) {
  const [helpfulClicked, setHelpfulClicked] = useState<Set<string>>(new Set());
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>(
    Object.fromEntries(reviews.map((r) => [r.id, r.helpfulCount])),
  );

  async function handleHelpful(reviewId: string) {
    if (helpfulClicked.has(reviewId)) return;
    setHelpfulClicked((prev) => new Set([...prev, reviewId]));
    setHelpfulCounts((prev) => ({ ...prev, [reviewId]: (prev[reviewId] ?? 0) + 1 }));
    await markReviewHelpful(reviewId);
  }

  function formatDate(d: Date | string) {
    return new Date(d).toLocaleDateString("en-TT", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  if (count === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-12 text-center font-sans">
        <span className="mb-3 text-4xl">⭐</span>
        <p className="text-sm font-semibold text-zinc-700">No reviews yet</p>
        <p className="mt-1 text-xs text-zinc-400">Be the first to leave a review</p>
      </div>
    );
  }

  const reviewCards = (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-2xl border border-zinc-200 bg-white p-5 font-sans">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StarRating value={review.rating} readonly size="sm" />
                {review.isVerifiedPurchase ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    ✓ Verified
                  </span>
                ) : null}
              </div>
              {review.title ? <p className="mt-1.5 text-sm font-bold text-zinc-900">{review.title}</p> : null}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-semibold text-zinc-700">{review.user.fullName ?? "Anonymous"}</p>
              <p className="text-xs text-zinc-400">{formatDate(review.createdAt)}</p>
            </div>
          </div>

          {showProductName && review.product ? (
            <p className="mb-2 text-xs text-zinc-400">
              {review.product.isService ? "Service: " : "Product: "}
              {review.product.name}
            </p>
          ) : null}

          {review.body ? <p className="text-sm leading-7 text-zinc-600">{review.body}</p> : null}

          <div className="mt-3 flex items-center gap-3 border-t border-zinc-100 pt-3">
            <button
              type="button"
              onClick={() => handleHelpful(review.id)}
              disabled={helpfulClicked.has(review.id)}
              className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                helpfulClicked.has(review.id) ? "text-emerald-600" : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
              Helpful {helpfulCounts[review.id] > 0 ? `(${helpfulCounts[review.id]})` : ""}
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  if (layoutDensity === "pdp") {
    return (
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="min-w-0 lg:col-span-4">
          <ReviewSummaryCard average={average} count={count} reviews={reviews} />
        </div>
        <div className={`min-w-0 ${trailingAside ? "lg:col-span-5" : "lg:col-span-8"}`}>{reviewCards}</div>
        {trailingAside ? <div className="min-w-0 lg:col-span-3">{trailingAside}</div> : null}
      </div>
    );
  }

  /* default: original stacked horizontal summary strip + cards below */
  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 sm:flex-row sm:items-center sm:gap-8">
        <div className="text-center sm:text-left">
          <p className="text-5xl font-black text-zinc-900">{average.toFixed(1)}</p>
          <StarRating value={Math.round(average)} readonly size="md" />
          <p className="mt-1 text-xs text-zinc-400">
            {count} review{count !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const cnt = reviews.filter((r) => r.rating === star).length;
            const pct = Math.round((cnt / count) * 100);
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="w-4 text-right text-xs font-semibold text-zinc-500">{star}</span>
                <svg viewBox="0 0 24 24" className="h-3 w-3 fill-[#E8820C] stroke-[#E8820C]" strokeWidth="1" aria-hidden>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <div className="flex-1 overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-2 rounded-full bg-[#E8820C] transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 text-right text-xs text-zinc-400">{cnt}</span>
              </div>
            );
          })}
        </div>
      </div>
      {reviewCards}
    </div>
  );
}
