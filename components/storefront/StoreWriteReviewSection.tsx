"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconCircleCheck, IconStarFilled } from "@tabler/icons-react";

import { submitStoreReview, updateStoreReview } from "@/app/actions/reviews";

import StarRating from "@/components/ui/StarRating";

const SCARLET = "#D4450A";
const STAR_AMBER = "#E8820C";

type UserReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
};

type Props = {
  storeId: string;
  storeName: string;
  isLoggedIn: boolean;
  userReview: UserReview | null;
};

function InteractiveStars({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (n: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const display = hover || rating;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="cursor-pointer transition-transform hover:scale-110"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          aria-label={`Rate ${star} stars`}
        >
          <IconStarFilled
            className="size-6"
            style={{
              color: star <= display ? STAR_AMBER : "var(--text-secondary)",
            }}
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({
  storeName,
  rating,
  setRating,
  body,
  setBody,
  error,
  submitting,
  isEdit,
  onSubmit,
  onCancel,
}: {
  storeName: string;
  rating: number;
  setRating: (n: number) => void;
  body: string;
  setBody: (s: string) => void;
  error: string | null;
  submitting: boolean;
  isEdit: boolean;
  onSubmit: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="rounded-xl border border-[0.5px] border-[var(--color-border-tertiary)] bg-white p-4">
      <h3 className="mb-3 text-[13px] font-medium text-[var(--text-primary)]">
        {isEdit ? "Edit your review" : `Share your experience with ${storeName}`}
      </h3>

      <InteractiveStars rating={rating} onChange={setRating} />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Tell others about your experience..."
        rows={4}
        maxLength={1000}
        className="mt-3 w-full resize-none rounded-lg border border-[0.5px] border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[#D4450A]"
      />
      <p className="mt-1 text-right text-[10px] text-[var(--text-muted)]">{body.length}/1000</p>

      {error ? (
        <p className="mb-2 text-[11px] font-medium text-red-600">{error}</p>
      ) : null}

      <div className={`mt-3 flex gap-2 ${isEdit ? "" : "flex-col"}`}>
        <button
          type="button"
          disabled={submitting || rating === 0}
          onClick={onSubmit}
          className={`flex h-9 items-center justify-center rounded-lg text-[13px] font-semibold text-white disabled:opacity-50 ${
            isEdit ? "flex-1" : "w-full"
          }`}
          style={{ backgroundColor: SCARLET }}
        >
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Submit review"}
        </button>
        {isEdit && onCancel ? (
          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            className="flex h-9 flex-1 items-center justify-center rounded-lg border border-[0.5px] border-[var(--color-border-tertiary)] bg-white text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--color-background-secondary)] disabled:opacity-50"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function StoreWriteReviewSection({
  storeId,
  storeName,
  isLoggedIn,
  userReview,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(userReview?.rating ?? 0);
  const [body, setBody] = useState(userReview?.body ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function startEditing() {
    if (!userReview) return;
    setEditing(true);
    setRating(userReview.rating);
    setBody(userReview.body ?? "");
    setError(null);
  }

  function cancelEditing() {
    if (!userReview) return;
    setEditing(false);
    setRating(userReview.rating);
    setBody(userReview.body ?? "");
    setError(null);
  }

  async function handleSubmit() {
    if (rating === 0) {
      setError("Please select a star rating");
      return;
    }
    setError(null);
    setSubmitting(true);

    const result =
      userReview && editing
        ? await updateStoreReview({ reviewId: userReview.id, rating, body })
        : await submitStoreReview({ storeId, rating, body });

    if ("error" in result) {
      if (result.error === "not_logged_in") {
        router.push("/login");
        return;
      }
      setError(result.error);
      setSubmitting(false);
      return;
    }

    const wasNewReview = !userReview;
    if (wasNewReview) {
      setSuccess(true);
    } else {
      setEditing(false);
    }
    setSubmitting(false);
    router.refresh();
  }

  if (!isLoggedIn) {
    return (
      <div className="rounded-xl border border-[0.5px] border-[var(--color-border-tertiary)] bg-white p-4 text-center">
        <p className="text-[13px] text-[var(--text-secondary)]">Sign in to leave a review</p>
        <Link
          href="/login"
          className="mt-2 inline-block text-[13px] font-semibold hover:underline"
          style={{ color: SCARLET }}
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
        <IconCircleCheck className="size-5 shrink-0 text-emerald-600" stroke={1.75} aria-hidden />
        <p className="text-[13px] font-medium text-emerald-900">
          Review submitted! Thank you.
        </p>
      </div>
    );
  }

  if (userReview && editing) {
    return (
      <ReviewForm
        storeName={storeName}
        rating={rating}
        setRating={setRating}
        body={body}
        setBody={setBody}
        error={error}
        submitting={submitting}
        isEdit
        onSubmit={() => void handleSubmit()}
        onCancel={cancelEditing}
      />
    );
  }

  if (userReview) {
    return (
      <div className="rounded-xl border border-[0.5px] border-[var(--color-border-tertiary)] bg-white p-4">
        <StarRating value={userReview.rating} readonly size="md" />
        {userReview.body ? (
          <p className="mt-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">
            {userReview.body}
          </p>
        ) : (
          <p className="mt-3 text-[13px] italic text-[var(--text-muted)]">No written review</p>
        )}
        <button
          type="button"
          className="mt-3 inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--color-background-secondary)]"
          onClick={startEditing}
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <ReviewForm
      storeName={storeName}
      rating={rating}
      setRating={setRating}
      body={body}
      setBody={setBody}
      error={error}
      submitting={submitting}
      isEdit={false}
      onSubmit={() => void handleSubmit()}
    />
  );
}
