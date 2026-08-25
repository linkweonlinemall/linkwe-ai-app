"use client";

import { useState } from "react";

import { startAITopupCheckout } from "@/app/actions/ai-topup";
import { AI_TOPUP_BUNDLES, type AITopupBundleKey } from "@/lib/finance/ai-topup-bundles";

const BUNDLE_ORDER: AITopupBundleKey[] = ["SMALL", "MEDIUM", "LARGE"];

function formatBundlePriceTTD(priceMinor: number): string {
  return `TTD ${(priceMinor / 100).toLocaleString("en-TT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

type Props = { topupRemaining: number };

export default function AITopupCheckout({ topupRemaining }: Props) {
  const [loadingKey, setLoadingKey] = useState<AITopupBundleKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelectBundle(key: AITopupBundleKey) {
    setLoadingKey(key);
    setError(null);
    const result = await startAITopupCheckout(key);
    if (!result.ok) {
      setError(result.error);
      setLoadingKey(null);
      return;
    }
    window.location.assign(result.checkoutUrl);
  }

  return (
    <div className="mt-3">
      <p className="text-[11px] font-medium text-zinc-600">Buy AI uses</p>
      <p className="mt-0.5 text-[11px] text-zinc-500">
        {topupRemaining > 0 ? `${topupRemaining} top-up uses remaining. ` : ""}
        One-time credits never expire.
      </p>
      {error ? (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-600">
          {error}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {BUNDLE_ORDER.map((key) => {
          const bundle = AI_TOPUP_BUNDLES[key];
          return (
            <button
              key={key}
              type="button"
              disabled={loadingKey !== null}
              onClick={() => void handleSelectBundle(key)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-[11px] transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
            >
              <span className="block font-semibold text-zinc-900">
                {loadingKey === key ? "Redirecting…" : `${bundle.uses} uses`}
              </span>
              <span className="mt-0.5 block text-zinc-500">
                {formatBundlePriceTTD(bundle.priceMinor)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
