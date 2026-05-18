"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { submitProductReview, submitStoreReview } from "@/app/actions/reviews";

import StarRating from "./StarRating";

type Props = {
  type: "product" | "store";
  targetId: string;
  targetName: string;
  orderId?: string;
  bookingId?: string;
  onSuccess?: () => void;
};

export default function ReviewForm({ type, targetId, targetName, orderId, bookingId, onSuccess }: Props) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit() {
    if (rating === 0) {
      setError("Please select a star rating");
      return;
    }
    setError(null);
    setSubmitting(true);

    const result =
      type === "product"
        ? await submitProductReview({ productId: targetId, rating, title, body, orderId, bookingId })
        : await submitStoreReview({ storeId: targetId, rating, title, body });

    if ("error" in result) {
      if (result.error === "not_logged_in") {
        router.push("/login");
        return;
      }
      setError(result.error);
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
    onSuccess?.();
    router.refresh();
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <span className="mb-2 block text-3xl">⭐</span>
        <p className="text-sm font-bold text-emerald-900">Thank you for your review!</p>
        <p className="mt-1 text-xs text-emerald-700">Your review has been published.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-bold text-zinc-900">Write a review for {targetName}</h3>

      <div className="mb-4">
        <label className="mb-2 block text-xs font-semibold text-zinc-700">
          Your rating <span className="text-[#D4450A]">*</span>
        </label>
        <div className="flex items-center gap-3">
          <StarRating value={rating} onChange={setRating} size="lg" />
          {rating > 0 ? (
            <span className="text-xs font-semibold text-zinc-500">
              {["", "Poor", "Fair", "Good", "Very good", "Excellent"][rating]}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
          Review title (optional)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          maxLength={100}
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
        />
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
          Your review (optional)
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tell others about your experience — what did you like or dislike?"
          rows={4}
          maxLength={1000}
          className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
        />
        <p className="mt-1 text-right text-xs text-zinc-400">{body.length}/1000</p>
      </div>

      {error ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs font-semibold text-red-700">{error}</p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || rating === 0}
        className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
      >
        {submitting ? "Submitting..." : "Submit review"}
      </button>
    </div>
  );
}
