"use client"
import { useEffect, useState } from "react"
import { getVendorReviews, getVendorReviewStats, replyToReview } from "@/app/actions/vendor-reviews"
import type { VendorReview } from "@/app/actions/vendor-reviews"

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} width="14" height="14" viewBox="0 0 24 24" fill={star <= rating ? "#E8820C" : "none"} stroke="#E8820C" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  )
}

function formatDate(date: Date): string {
  const d = new Date(date)
  const day = d.getUTCDate()
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  return `${day} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export default function ReviewsTab() {
  const [reviews, setReviews] = useState<VendorReview[]>([])
  const [stats, setStats] = useState<{ total: number; average: number; breakdown: Record<number, number>; unanswered: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<"all" | "product" | "service" | "store">("all")
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined)
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void loadData()
  }, [typeFilter, ratingFilter])

  async function loadData() {
    setLoading(true)
    const [reviewsData, statsData] = await Promise.all([
      getVendorReviews({ type: typeFilter, rating: ratingFilter }),
      getVendorReviewStats()
    ])
    setReviews(reviewsData)
    setStats(statsData)
    setLoading(false)
  }

  async function handleReply(reviewId: string) {
    if (!replyText.trim()) return
    setSubmitting(true)
    const result = await replyToReview(reviewId, replyText)
    if ("ok" in result) {
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, vendorReply: replyText, vendorRepliedAt: new Date() } : r))
      setReplyingId(null)
      setReplyText("")
    }
    setSubmitting(false)
  }

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Total Reviews</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Average Rating</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-2xl font-bold text-zinc-900">{stats.average.toFixed(1)}</p>
              <StarRating rating={Math.round(stats.average)} />
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Unanswered</p>
            <p className={`mt-1 text-2xl font-bold ${stats.unanswered > 0 ? "text-[#D4450A]" : "text-zinc-900"}`}>{stats.unanswered}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">5 Star Reviews</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{stats.breakdown[5] ?? 0}</p>
          </div>
        </div>
      )}

      {stats && stats.total > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Rating Breakdown</p>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(star => {
              const count = stats.breakdown[star] ?? 0
              const percent = stats.total > 0 ? (count / stats.total) * 100 : 0
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="w-4 text-xs text-zinc-500">{star}★</span>
                  <div className="flex-1 rounded-full bg-zinc-100 h-2">
                    <div className="h-2 rounded-full bg-[#E8820C]" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="w-6 text-right text-xs text-zinc-400">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(["all", "product", "service", "store"] as const).map(t => (
          <button key={t} type="button" onClick={() => setTypeFilter(t)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${typeFilter === t ? "bg-[#D4450A] text-white" : "border border-zinc-200 bg-white text-zinc-600 hover:border-[#D4450A] hover:text-[#D4450A]"}`}>
            {t === "all" ? "All reviews" : `${t} reviews`}
          </button>
        ))}
        <div className="ml-auto">
          <select
            value={ratingFilter ?? ""}
            onChange={e => setRatingFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600"
          >
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} stars</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-zinc-400">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center">
          <p className="text-4xl mb-3">⭐</p>
          <p className="text-sm font-medium text-zinc-900">No reviews yet</p>
          <p className="mt-1 text-xs text-zinc-500">Reviews from customers will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <StarRating rating={review.rating} />
                    <span className="text-xs text-zinc-400">{formatDate(review.createdAt)}</span>
                    {review.isVerifiedPurchase && (
                      <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Verified</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    <span className="font-medium text-zinc-700">{review.customer.fullName}</span>
                    {review.productName && <span> · {review.productName}</span>}
                    {review.serviceName && <span> · {review.serviceName}</span>}
                    {review.type === "store" && <span> · Store review</span>}
                  </p>
                  {review.title && <p className="mt-2 text-sm font-semibold text-zinc-900">{review.title}</p>}
                  {review.body && <p className="mt-1 text-sm text-zinc-600">{review.body}</p>}
                </div>
              </div>

              {review.vendorReply && (
                <div className="mt-3 rounded-lg bg-zinc-50 border border-zinc-100 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-1">Your reply</p>
                  <p className="text-xs text-zinc-600">{review.vendorReply}</p>
                </div>
              )}

              {!review.vendorReply && replyingId !== review.id && (
                <button type="button" onClick={() => { setReplyingId(review.id); setReplyText("") }}
                  className="mt-3 text-xs font-medium text-[#D4450A] hover:underline">
                  Reply to this review
                </button>
              )}

              {replyingId === review.id && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Write a professional reply..."
                    rows={3}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#D4450A]"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void handleReply(review.id)} disabled={submitting || !replyText.trim()}
                      className="rounded-lg bg-[#D4450A] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50">
                      {submitting ? "Posting..." : "Post reply"}
                    </button>
                    <button type="button" onClick={() => setReplyingId(null)}
                      className="rounded-lg border border-zinc-200 px-4 py-2 text-xs text-zinc-500 hover:bg-zinc-50">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
