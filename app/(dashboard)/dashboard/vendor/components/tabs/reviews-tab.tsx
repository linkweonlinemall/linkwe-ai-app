"use client";
import { useEffect, useState } from "react";
import { getVendorReviews, getVendorReviewStats, replyToReview } from "@/app/actions/vendor-reviews";
import type { VendorReview } from "@/app/actions/vendor-reviews";
import { formatDate } from "@/lib/format/format-display-date-utc";

const CARD =
  "rounded-[20px] border border-white/80 bg-white shadow-[0_12px_35px_rgba(28,28,26,0.08)]";

function StarRating({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <div className="flex shrink-0 items-center gap-px">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={star <= rating ? "#E8820C" : "none"}
          stroke="#E8820C"
          strokeWidth="2"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

export default function ReviewsTab() {
  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    average: number;
    breakdown: Record<number, number>;
    unanswered: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | "product" | "service" | "store">("all");
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void loadData();
  }, [typeFilter, ratingFilter]);

  async function loadData() {
    setLoading(true);
    const [reviewsData, statsData] = await Promise.all([
      getVendorReviews({ type: typeFilter, rating: ratingFilter }),
      getVendorReviewStats(),
    ]);
    setReviews(reviewsData);
    setStats(statsData);
    setLoading(false);
  }

  async function handleReply(reviewId: string) {
    if (!replyText.trim()) return;
    setSubmitting(true);
    const result = await replyToReview(reviewId, replyText);
    if ("ok" in result) {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, vendorReply: replyText, vendorRepliedAt: new Date() } : r,
        ),
      );
      setReplyingId(null);
      setReplyText("");
    }
    setSubmitting(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className={`${CARD} bg-gradient-to-br from-white to-orange-50 p-4`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Total reviews</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">{stats.total}</p>
          </div>
          <div className={`${CARD} p-4`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Average</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-xl font-bold text-zinc-900">{stats.average.toFixed(1)}</p>
              <StarRating rating={Math.round(stats.average)} />
            </div>
          </div>
          <div className={`${CARD} p-4`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Unanswered</p>
            <p className={`mt-1 text-xl font-bold ${stats.unanswered > 0 ? "text-[#D4450A]" : "text-zinc-900"}`}>
              {stats.unanswered}
            </p>
          </div>
          <div className={`${CARD} p-4`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">5★ reviews</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">{stats.breakdown[5] ?? 0}</p>
          </div>
        </div>
      )}

      {stats && stats.total > 0 && (
        <div className={`${CARD} p-4 sm:p-5`}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Rating breakdown</p>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.breakdown[star] ?? 0;
              const percent = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="w-7 text-[10px] text-zinc-500">{star}★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-2 rounded-full bg-gradient-to-r from-[#D4450A] to-[#E8820C] transition-[width] duration-500" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="w-7 text-right text-[10px] text-zinc-400">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(["all", "product", "service", "store"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTypeFilter(t)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
              typeFilter === t
                ? "bg-[#D4450A] text-white"
                : "border-[0.5px] border-[rgba(28,28,26,0.12)] bg-white text-zinc-600 hover:border-[#D4450A] hover:text-[#D4450A]"
            }`}
          >
            {t === "all" ? "All reviews" : `${t} reviews`}
          </button>
        ))}
        <div className="ml-auto">
          <select
            value={ratingFilter ?? ""}
            onChange={(e) => setRatingFilter(e.target.value ? Number(e.target.value) : undefined)}
            className={`rounded-lg border-[0.5px] border-[rgba(28,28,26,0.12)] px-2.5 py-1 text-[11px] text-zinc-600`}
          >
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r} stars
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-zinc-400">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className={`${CARD} py-10 text-center`}>
          <p className="text-2xl">⭐</p>
          <p className="mt-2 text-sm font-medium text-zinc-900">No reviews yet</p>
          <p className="mt-1 text-[11px] text-zinc-500">Reviews from customers will appear here</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {reviews.map((review) => (
            <div key={review.id} className={`${CARD} px-4 py-4 transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(28,28,26,0.11)] sm:px-5`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <StarRating rating={review.rating} />
                    <span className="text-[10px] text-zinc-400">{formatDate(review.createdAt)}</span>
                    {review.isVerifiedPurchase ? (
                      <span className="rounded-full border border-emerald-100 bg-emerald-50 px-1.5 py-0 text-[10px] font-semibold text-emerald-700">
                        Verified
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-[11px] text-zinc-500">
                    <span className="font-medium text-zinc-700">{review.customer.fullName}</span>
                    {review.productName ? <span> · {review.productName}</span> : null}
                    {review.serviceName ? <span> · {review.serviceName}</span> : null}
                    {review.type === "store" ? <span> · Store</span> : null}
                  </p>
                  {review.title ? <p className="mt-1 line-clamp-1 text-[12px] font-semibold text-zinc-900">{review.title}</p> : null}
                  {review.body ? (
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-600">{review.body}</p>
                  ) : null}
                </div>
              </div>

              {review.vendorReply ? (
                <div className="mt-2 rounded-lg border-[0.5px] border-zinc-100 bg-zinc-50 px-2.5 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Your reply</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-600">{review.vendorReply}</p>
                </div>
              ) : null}

              {!review.vendorReply && replyingId !== review.id ? (
                <button
                  type="button"
                  onClick={() => {
                    setReplyingId(review.id);
                    setReplyText("");
                  }}
                  className="mt-2 text-[11px] font-semibold text-[#D4450A] hover:underline"
                >
                  Reply
                </button>
              ) : null}

              {replyingId === review.id ? (
                <div className="mt-2 space-y-1.5">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Professional reply..."
                    rows={2}
                    className="w-full resize-none rounded-lg border-[0.5px] border-[rgba(28,28,26,0.12)] px-2.5 py-2 text-[12px] outline-none focus:border-[#D4450A]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleReply(review.id)}
                      disabled={submitting || !replyText.trim()}
                      className="rounded-lg bg-[#D4450A] px-3 py-1.5 text-[11px] font-bold text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {submitting ? "Posting..." : "Post"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyingId(null)}
                      className="rounded-lg border-[0.5px] border-zinc-200 px-3 py-1.5 text-[11px] text-zinc-500 hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
