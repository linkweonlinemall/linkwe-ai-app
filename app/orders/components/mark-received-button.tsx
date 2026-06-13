"use client";

import { useState } from "react";

import { markSplitReceived } from "@/app/actions/order-received";

type Props = { splitOrderId: string; storeName?: string };

export default function MarkReceivedButton({ splitOrderId, storeName }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const storeLabel = storeName ?? "this store";

  if (confirming) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-900">
          Confirm you&apos;ve received your items from {storeLabel}?
        </p>
        <p className="text-xs text-emerald-700">This releases their payment.</p>
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
              const result = await markSplitReceived(splitOrderId);
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
            {submitting ? "Confirming..." : "Yes, I received it ✓"}
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
      ✓ Mark as Received
    </button>
  );
}
