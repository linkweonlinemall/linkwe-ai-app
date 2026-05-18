"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { submitOnDemandRequest, uploadOnDemandPhotos } from "@/app/actions/on-demand";
import StoreLocationPicker from "@/components/storefront/StoreLocationPicker";

type Props = {
  serviceId: string;
  storeId: string;
  serviceName: string;
  estimatedResponseMins: number | null;
  travelFee: number | null;
  serviceRadius: number | null;
  isAvailableNow: boolean;
};

export default function OnDemandRequestWidget({
  serviceId,
  storeId,
  serviceName,
  estimatedResponseMins,
  travelFee,
  serviceRadius,
  isAvailableNow,
}: Props) {
  const [step, setStep] = useState<"info" | "form" | "submitted">("info");
  const [description, setDescription] = useState("");
  const [locationKey, setLocationKey] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const locationPickerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  function readCustomerLocation() {
    const root = locationPickerRef.current;
    if (!root) {
      return {};
    }
    const addrEl = root.querySelector<HTMLInputElement>('input[name="locationAddress"]');
    const latEl = root.querySelector<HTMLInputElement>('input[name="locationLat"]');
    const lngEl = root.querySelector<HTMLInputElement>('input[name="locationLng"]');
    const customerAddress = addrEl?.value?.trim() || undefined;
    const latStr = latEl?.value?.trim();
    const lngStr = lngEl?.value?.trim();
    const customerLat = latStr ? parseFloat(latStr) : undefined;
    const customerLng = lngStr ? parseFloat(lngStr) : undefined;
    return {
      customerAddress,
      customerLat: Number.isFinite(customerLat) ? customerLat : undefined,
      customerLng: Number.isFinite(customerLng) ? customerLng : undefined,
    };
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPhotos(true);
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("images", f));
    try {
      const result = await uploadOnDemandPhotos(formData);
      if (result.ok) {
        setPhotos((prev) => [...prev, ...result.urls].slice(0, 5));
      }
    } catch {
      // silent
    }
    setUploadingPhotos(false);
  }

  async function handleSubmit() {
    setError(null);
    if (!description.trim() || description.trim().length < 20) {
      setError("Please describe what you need in more detail.");
      return;
    }
    setSubmitting(true);
    const { customerAddress, customerLat, customerLng } = readCustomerLocation();
    const result = await submitOnDemandRequest({
      serviceId,
      storeId,
      description,
      photos,
      customerAddress,
      customerLat,
      customerLng,
    });
    if ("error" in result) {
      if (result.error === "not_logged_in") {
        router.push("/login");
        return;
      }
      setError(result.error);
      setSubmitting(false);
      return;
    }
    setStep("submitted");
    setSubmitting(false);
  }

  if (step === "submitted") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <span className="mb-3 block text-4xl">✅</span>
        <p className="text-sm font-bold text-emerald-900">Request sent!</p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-700">
          {estimatedResponseMins
            ? `The provider typically responds within ${estimatedResponseMins >= 60 ? `${Math.floor(estimatedResponseMins / 60)} hour${Math.floor(estimatedResponseMins / 60) > 1 ? "s" : ""}` : `${estimatedResponseMins} minutes`}.`
            : "The provider will review your request and respond shortly."}
        </p>
        <button
          type="button"
          onClick={() => {
            setStep("info");
            setDescription("");
            setLocationKey((k) => k + 1);
            setPhotos([]);
            setError(null);
          }}
          className="mt-4 text-xs font-semibold text-emerald-700 hover:underline"
        >
          Send another request
        </button>
      </div>
    );
  }

  if (step === "form") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            Request — {serviceName}
          </p>
          <button type="button" onClick={() => setStep("info")} className="text-xs text-zinc-400 hover:text-zinc-600">
            ← Back
          </button>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
            Describe what you need <span className="text-[#D4450A]">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. My kitchen sink is leaking under the cabinet. Water is pooling on the floor. I need someone to come urgently."
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

        <div ref={locationPickerRef}>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Your location</label>
          <p className="mb-2 text-xs text-zinc-500">
            Search for your address or use your current location so we can confirm you are within the service area.
          </p>
          <StoreLocationPicker key={locationKey} initialAddress="" initialLat={null} initialLng={null} />
          {serviceRadius ? (
            <p className="mt-2 text-xs text-zinc-400">This provider covers a {serviceRadius} km radius</p>
          ) : null}
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
                    Uploading...
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
          {submitting ? "Sending request..." : "Send request ⚡"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
          isAvailableNow ? "border-emerald-200 bg-emerald-50" : "border-zinc-200 bg-zinc-50"
        }`}
      >
        <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${isAvailableNow ? "animate-pulse bg-emerald-500" : "bg-zinc-300"}`} />
        <div>
          <p className={`text-xs font-bold ${isAvailableNow ? "text-emerald-800" : "text-zinc-600"}`}>
            {isAvailableNow ? "Available now" : "Currently unavailable"}
          </p>
          <p className={`text-[11px] ${isAvailableNow ? "text-emerald-600" : "text-zinc-400"}`}>
            {isAvailableNow
              ? "Provider is accepting on-demand requests"
              : "Provider is not taking requests right now"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {estimatedResponseMins ? (
          <div className="flex items-center gap-3 rounded-xl bg-zinc-50 px-4 py-2.5">
            <span className="text-lg">⚡</span>
            <div>
              <p className="text-xs font-semibold text-zinc-900">
                Responds{" "}
                {estimatedResponseMins >= 60
                  ? `within ${Math.floor(estimatedResponseMins / 60)} hour${Math.floor(estimatedResponseMins / 60) > 1 ? "s" : ""}`
                  : `within ${estimatedResponseMins} minutes`}
              </p>
            </div>
          </div>
        ) : null}
        {travelFee && travelFee > 0 ? (
          <div className="flex items-center gap-3 rounded-xl bg-zinc-50 px-4 py-2.5">
            <span className="text-lg">🚗</span>
            <p className="text-xs font-semibold text-zinc-900">TTD {travelFee.toFixed(2)} travel fee</p>
          </div>
        ) : null}
        {serviceRadius ? (
          <div className="flex items-center gap-3 rounded-xl bg-zinc-50 px-4 py-2.5">
            <span className="text-lg">📍</span>
            <p className="text-xs font-semibold text-zinc-900">Covers {serviceRadius} km radius</p>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setStep("form")}
        disabled={!isAvailableNow}
        className="w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: isAvailableNow ? "linear-gradient(135deg, #D4450A, #E8820C)" : undefined,
          backgroundColor: isAvailableNow ? undefined : "#a1a1aa",
        }}
      >
        {isAvailableNow ? "Request now ⚡" : "Not available right now"}
      </button>

      {!isAvailableNow ? (
        <p className="text-center text-xs text-zinc-400">Check back later or contact the provider directly</p>
      ) : null}
    </div>
  );
}
