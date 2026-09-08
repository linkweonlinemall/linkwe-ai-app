"use client";

import { useState } from "react";

import { markOrderReceived } from "@/app/actions/order-received";

type Props = { orderId: string; initiallyConfirming?: boolean };

export default function MarkReceivedButton({ orderId, initiallyConfirming = false }: Props) {
  const [confirming, setConfirming] = useState(initiallyConfirming);
  const [submitting, setSubmitting] = useState(false);

  if (confirming) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-900">
          Confirm you&apos;ve received your complete LinkWe order?
        </p>
        <p className="text-xs text-emerald-700">Only confirm after the combined parcel has reached you.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={submitting}
            className="flex-1 rounded-xl border border-zinc-200 bg-white py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            Not yet
          </button>
          <button
            type="button"
            onClick={async () => {
              setSubmitting(true);
              const formData = new FormData();
              formData.set("orderId", orderId);
              const result = await markOrderReceived(formData);
              setSubmitting(false);
              if (result && "error" in result) {
                alert(result.error);
                return;
              }
              window.location.reload();
            }}
            disabled={submitting}
            className="flex-1 rounded-xl py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#059669" }}
          >
            {submitting ? "Confirming..." : "Yes, I received the order ✓"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
      style={{ backgroundColor: "#059669" }}
    >
      ✓ Mark complete order as received
    </button>
  );
}
