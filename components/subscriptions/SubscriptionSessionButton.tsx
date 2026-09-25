"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { recordServiceSubscriptionSession } from "@/app/actions/service-subscription";

export default function SubscriptionSessionButton({
  subscriptionId,
  remaining,
}: {
  subscriptionId: string;
  remaining: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function recordSession() {
    if (!window.confirm("Record one completed session for this subscriber?")) return;
    setError(false);
    setLoading(true);
    const result = await recordServiceSubscriptionSession(subscriptionId);
    setLoading(false);
    if (result.ok) return router.refresh();
    setError(true);
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={loading || remaining < 1}
        onClick={() => void recordSession()}
        className="rounded-lg border border-[#D4450A]/25 bg-orange-50 px-2.5 py-1.5 text-[11px] font-bold text-[#D4450A] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Recording…" : "Use 1 session"}
      </button>
      {error ? <span className="text-[10px] text-red-600">Couldn&apos;t record session.</span> : null}
    </div>
  );
}
