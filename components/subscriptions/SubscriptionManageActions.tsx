"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  cancelMyServiceSubscription,
  resumeMyServiceSubscription,
} from "@/app/actions/service-subscription";
import { formatSubscriptionPeriodEnd as formatPeriodEnd } from "@/lib/finance/subscription-format";

type Props = {
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | string | null;
  layout?: "card" | "compact";
};

function manageErrorMessage(error: string): string {
  switch (error) {
    case "stripe_failed":
      return "Couldn't update — try again.";
    case "not_logged_in":
      return "Sign in to manage your subscription.";
    case "not_found":
    case "not_active":
    case "no_subscription":
      return "This subscription can't be updated right now.";
    default:
      return "Couldn't update — try again.";
  }
}

export default function SubscriptionManageActions({
  subscriptionId,
  cancelAtPeriodEnd,
  currentPeriodEnd,
  layout = "card",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const periodEndLabel = formatPeriodEnd(currentPeriodEnd);

  async function handleCancel() {
    const confirmed = window.confirm(
      `You will keep access to this service until ${periodEndLabel}, then your subscription ends. No refund for the current period.\n\nCancel subscription at period end?`,
    );
    if (!confirmed) return;

    setError(null);
    setLoading(true);
    const result = await cancelMyServiceSubscription(subscriptionId);
    setLoading(false);
    if (result.ok) {
      router.refresh();
      return;
    }
    setError(manageErrorMessage(result.error));
  }

  async function handleResume() {
    setError(null);
    setLoading(true);
    const result = await resumeMyServiceSubscription(subscriptionId);
    setLoading(false);
    if (result.ok) {
      router.refresh();
      return;
    }
    setError(manageErrorMessage(result.error));
  }

  if (cancelAtPeriodEnd) {
    return (
      <div className={layout === "card" ? "flex flex-col items-end gap-2" : "flex flex-col gap-2"}>
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleResume()}
          className={
            layout === "card"
              ? "rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 transition-colors hover:bg-zinc-50 disabled:opacity-50"
              : "w-full rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-semibold text-zinc-800 transition-opacity hover:bg-zinc-50 disabled:opacity-50"
          }
        >
          {loading ? "Updating…" : "Resume subscription"}
        </button>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className={layout === "card" ? "flex flex-col items-end gap-2" : "flex flex-col gap-2"}>
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleCancel()}
        className={
          layout === "card"
            ? "text-xs font-semibold text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline disabled:opacity-50"
            : "w-full text-center text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline disabled:opacity-50"
        }
      >
        {loading ? "Updating…" : "Cancel subscription"}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
