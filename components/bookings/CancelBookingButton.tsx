"use client";

import { useState } from "react";
import { toast } from "sonner";

import { cancelMyBooking } from "@/app/actions/bookings";

type Props = {
  bookingId: string;
  storeName: string;
};

export default function CancelBookingButton({ bookingId, storeName }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await cancelMyBooking(bookingId);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
    toast.success(
      result.refundedTTD > 0
        ? `Booking cancelled. TTD ${result.refundedTTD.toFixed(2)} refunded to your card.`
        : "Booking cancelled.",
    );
    window.location.reload();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:border-red-300 hover:text-red-600"
      >
        Cancel booking
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-bold text-zinc-900">Cancel this booking?</h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              This will cancel your booking with {storeName} and refund any payment made. This
              cannot be undone.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Keep booking
              </button>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={loading}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Cancelling…" : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
