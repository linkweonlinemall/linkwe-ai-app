"use client";

import { useState } from "react";

import { markBookingComplete } from "@/app/actions/bookings";

type Props = {
  bookingId: string;
  storeName: string;
};

export default function MarkBookingCompleteButton({ bookingId, storeName }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const result = await markBookingComplete(bookingId);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setOpen(false);
    window.location.reload();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-[#D4450A] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
      >
        Mark as complete
      </button>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

      {open ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-bold text-zinc-900">Confirm completion</h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              Confirm you received this service from {storeName}. This will release payment to
              the vendor.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={loading}
                className="flex-1 rounded-xl bg-[#D4450A] py-2.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Completing…" : "Confirm & complete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
