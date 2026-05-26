"use client";

import { useState } from "react";

import ReviewForm from "@/components/ui/ReviewForm";
import ReviewsList from "@/components/ui/ReviewsList";
import StarRating from "@/components/ui/StarRating";

import { tw } from "@/lib/design-system";

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: Date | string;
  user: { fullName: string | null };
};

function ReviewSidebarCard({
  userReview,
}: {
  userReview: { rating: number; title: string | null; body: string | null };
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 font-sans">
      <p className="mb-3 text-sm font-bold text-zinc-700">Your review</p>
      <StarRating value={userReview.rating} readonly size="md" />
      {userReview.title ? <p className="mt-2 text-sm font-semibold text-zinc-900">{userReview.title}</p> : null}
      {userReview.body ? <p className="mt-1 text-sm text-zinc-600">{userReview.body}</p> : null}
    </div>
  );
}

export default function ProductReviewsSection({
  productId,
  productName,
  count,
  average,
  reviews,
  userReview,
  canWriteReview,
  className = "",
  /** Wide product page: summary | reviews | sidebar in one grid. */
  fullWidthLayout = false,
}: {
  productId: string;
  productName: string;
  count: number;
  average: number;
  reviews: ReviewRow[];
  userReview:
    | { rating: number; title: string | null; body: string | null }
    | null
    | undefined;
  canWriteReview: boolean;
  className?: string;
  fullWidthLayout?: boolean;
}) {
  const [showForm, setShowForm] = useState(false);

  const showSideColumn = Boolean(userReview || (count > 0 && canWriteReview));

  const sidebarWhenReviews =
    count > 0 && showSideColumn
      ? userReview
        ? <ReviewSidebarCard userReview={userReview} />
        : canWriteReview
          ? <ReviewForm type="product" targetId={productId} targetName={productName} />
          : null
      : null;

  const emptyState = (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center font-sans">
      <p className="text-sm font-semibold text-zinc-800">
        No reviews yet. Be the first to review this product.
      </p>
      {canWriteReview && !userReview ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className={`mt-5 inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-bold text-white transition-opacity hover:opacity-92 ${tw.bgScarlet}`}
        >
          Write a review
        </button>
      ) : null}
      {showForm && canWriteReview && !userReview ? (
        <div className="mx-auto mt-8 max-w-md text-left">
          <ReviewForm
            type="product"
            targetId={productId}
            targetName={productName}
            onSuccess={() => setShowForm(false)}
          />
        </div>
      ) : null}
    </div>
  );

  return (
    <div id="reviews" className={`font-sans ${className}`}>
      <h2 className="font-sans text-2xl font-semibold tracking-tight text-zinc-900">
        Reviews
        {count > 0 ? <span className="ml-2 text-base font-normal text-zinc-400">({count})</span> : null}
      </h2>

      <div className="mt-6">
        {fullWidthLayout ? (
          count > 0 ? (
            <ReviewsList
              reviews={reviews}
              count={count}
              average={average}
              layoutDensity="pdp"
              trailingAside={sidebarWhenReviews ?? undefined}
            />
          ) : (
            emptyState
          )
        ) : (
          <div className={`grid grid-cols-1 gap-6 ${showSideColumn ? "lg:grid-cols-3" : ""}`}>
            <div className={showSideColumn ? "lg:col-span-2" : ""}>
              {count > 0 ? (
                <ReviewsList reviews={reviews} count={count} average={average} layoutDensity="default" />
              ) : (
                emptyState
              )}
            </div>
            {showSideColumn && count > 0 ? (
              <div className="lg:col-span-1">{sidebarWhenReviews}</div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
