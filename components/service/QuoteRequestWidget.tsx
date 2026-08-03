"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { submitQuoteRequest, uploadOnDemandPhotos } from "@/app/actions/on-demand";
import { compressAndUploadImages } from "@/lib/images/upload-images-client";
import { toastFormError } from "@/lib/feedback/toasts";

const SCARLET = "#D4450A";

type Props = {
  serviceId: string;
  storeId: string;
  serviceName: string;
  quotePriceType: "STARTING_FROM" | "CALLOUT_FEE" | "FREE_QUOTE" | null;
  price: number | null;
  minimumQuoteAmount: number | null;
  siteVisitRequired: boolean;
  isLoggedIn: boolean;
  isOwnStore: boolean;
  serviceSlug: string;
};

export default function QuoteRequestWidget({
  serviceId,
  storeId,
  serviceName,
  quotePriceType,
  price,
  minimumQuoteAmount,
  siteVisitRequired,
  isLoggedIn,
  isOwnStore,
  serviceSlug,
}: Props) {
  const [step, setStep] = useState<"form" | "submitted">("form");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; done: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/service/${serviceSlug}`)}`;

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPhotos(true);
    setUploadProgress({ total: files.length, done: 0 });
    const { urls, error: uploadError } = await compressAndUploadImages(Array.from(files), uploadOnDemandPhotos, {
      onProgress: (done) => setUploadProgress((prev) => (prev ? { ...prev, done } : prev)),
    });
    if (urls.length > 0) {
      setPhotos((prev) => [...prev, ...urls].slice(0, 5));
    }
    if (uploadError) setError(uploadError);
    setUploadingPhotos(false);
    setUploadProgress(null);
  }

  async function handleSubmit() {
    setError(null);
    if (!description.trim() || description.trim().length < 20) {
      setError("Please describe what you need in more detail.");
      return;
    }
    setSubmitting(true);
    const result = await submitQuoteRequest({
      serviceId,
      storeId,
      description,
      photos,
    });
    if ("error" in result) {
      if (result.error === "not_logged_in") {
        router.push(loginHref);
        return;
      }
      setError(result.error);
      setSubmitting(false);
      return;
    }
    setStep("submitted");
    setSubmitting(false);
  }

  if (!isLoggedIn) {
    return (
      <Link
        href={loginHref}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: SCARLET }}
      >
        Request quote →
      </Link>
    );
  }

  if (isOwnStore) {
    return (
      <button
        type="button"
        disabled
        onClick={() => toastFormError("This is your store.")}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: SCARLET }}
      >
        This is your store
      </button>
    );
  }

  if (step === "submitted") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <span className="mb-3 block text-4xl">✅</span>
        <p className="text-sm font-bold text-emerald-900">Quote requested</p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-700">
          The provider will respond with a price. You&apos;ll be notified.
        </p>
        <Link
          href="/my-requests"
          className="mt-4 inline-block text-xs font-semibold text-emerald-700 hover:underline"
        >
          View my requests →
        </Link>
      </div>
    );
  }

  const pricingNote =
    quotePriceType === "FREE_QUOTE"
      ? "This provider offers free quotes."
      : quotePriceType === "CALLOUT_FEE"
        ? "A call-out fee may apply; final price after assessment."
        : quotePriceType === "STARTING_FROM" && price && price > 0
          ? `Quotes start around TTD ${price.toFixed(2)} — the provider sets the final price.`
          : null;

  return (
    <div className="flex flex-col gap-4">
      {pricingNote ? <p className="text-xs text-zinc-500">{pricingNote}</p> : null}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
          Describe what you need <span className="text-[#D4450A]">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={`Describe your requirements for ${serviceName}.`}
          rows={4}
          className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
          maxLength={1000}
        />
        <div className="mt-1 flex justify-between">
          <p className="text-xs text-zinc-400">
            {description.length < 20 ? `${20 - description.length} more characters needed` : "✓ Good"}
          </p>
          <p className="text-xs text-zinc-400">{description.length}/1000</p>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
          Photos (optional — up to 5)
        </label>
        {photos.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {photos.map((url, i) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-16 w-16 rounded-xl border border-zinc-200 object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {photos.length < 5 ? (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <button
              type="button"
              disabled={uploadingPhotos}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
            >
              {uploadingPhotos ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                  {uploadProgress
                    ? `Uploading ${uploadProgress.done} of ${uploadProgress.total}…`
                    : "Uploading..."}
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Add photos
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>

      {siteVisitRequired ? (
        <p className="rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-700">
          This provider may require a site visit before finalizing your quote.
        </p>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs font-semibold text-red-700">{error}</p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || description.trim().length < 20}
        className="w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
      >
        {submitting ? "Sending request..." : "Request quote →"}
      </button>
    </div>
  );
}
