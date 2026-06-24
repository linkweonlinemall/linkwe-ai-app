"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  cancelMyServiceSubscription,
  resumeMyServiceSubscription,
  startServiceSubscriptionCheckout,
} from "@/app/actions/service-subscription";

type SubscriptionInfo = {
  id: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | string | null;
};

type Props = {
  productId: string;
  serviceSlug: string;
  isLoggedIn: boolean;
  isOwner: boolean;
  alreadySubscribed: boolean;
  subscription: SubscriptionInfo | null;
};

function errorMessage(error: string): string {
  switch (error) {
    case "not_logged_in":
      return "Sign in to subscribe.";
    case "already_subscribed":
      return "You're already subscribed to this service.";
    case "own_service":
      return "This is your service — you can't subscribe to it.";
    case "store_unavailable":
    case "unavailable":
    case "service_not_found":
      return "This service is no longer available.";
    case "invalid_interval":
    case "invalid_price":
    case "not_subscription":
    case "invalid_service":
      return "This subscription can't be purchased online right now.";
    default:
      return "Could not start checkout. Please try again.";
  }
}

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

function formatPeriodEnd(currentPeriodEnd: Date | string | null): string {
  if (!currentPeriodEnd) return "the end of your billing period";
  const date =
    currentPeriodEnd instanceof Date ? currentPeriodEnd : new Date(currentPeriodEnd);
  if (Number.isNaN(date.getTime())) return "the end of your billing period";
  return date.toLocaleDateString("en-TT", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SubscribeButton({
  productId,
  serviceSlug,
  isLoggedIn,
  isOwner,
  alreadySubscribed,
  subscription,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [manageLoading, setManageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);

  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/service/${serviceSlug}`)}`;

  if (isOwner) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-center text-sm text-zinc-600">
        This is your service — manage it from your vendor dashboard.
      </p>
    );
  }

  if (alreadySubscribed && subscription) {
    const periodEndLabel = formatPeriodEnd(subscription.currentPeriodEnd);

    async function handleCancel() {
      const confirmed = window.confirm(
        `You will keep access to this service until ${periodEndLabel}, then your subscription ends. No refund for the current period.\n\nCancel subscription at period end?`,
      );
      if (!confirmed) return;

      setManageError(null);
      setManageLoading(true);
      const result = await cancelMyServiceSubscription(subscription!.id);
      setManageLoading(false);
      if (result.ok) {
        router.refresh();
        return;
      }
      setManageError(manageErrorMessage(result.error));
    }

    async function handleResume() {
      setManageError(null);
      setManageLoading(true);
      const result = await resumeMyServiceSubscription(subscription!.id);
      setManageLoading(false);
      if (result.ok) {
        router.refresh();
        return;
      }
      setManageError(manageErrorMessage(result.error));
    }

    return (
      <div className="flex flex-col gap-2">
        {subscription.cancelAtPeriodEnd ? (
          <>
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-900">
              Your subscription ends on {periodEndLabel}.
            </p>
            <button
              type="button"
              disabled={manageLoading}
              onClick={() => void handleResume()}
              className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-semibold text-zinc-800 transition-opacity hover:bg-zinc-50 disabled:opacity-50"
            >
              {manageLoading ? "Updating…" : "Resume subscription"}
            </button>
          </>
        ) : (
          <>
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800">
              You&apos;re subscribed to this service.
            </p>
            <button
              type="button"
              disabled={manageLoading}
              onClick={() => void handleCancel()}
              className="w-full text-center text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline disabled:opacity-50"
            >
              {manageLoading ? "Updating…" : "Cancel subscription"}
            </button>
          </>
        )}
        <Link
          href="/dashboard/customer"
          className="text-center text-xs font-semibold text-[#D4450A] underline-offset-2 hover:underline"
        >
          View dashboard →
        </Link>
        {manageError ? <p className="text-center text-xs text-red-600">{manageError}</p> : null}
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col gap-2">
        <Link
          href={loginHref}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#D4450A" }}
        >
          Sign in to subscribe →
        </Link>
        <p className="text-center text-xs text-zinc-500">
          You&apos;ll be returned here after signing in.
        </p>
      </div>
    );
  }

  async function handleSubscribe() {
    setError(null);
    setLoading(true);
    const result = await startServiceSubscriptionCheckout(productId);
    if (result.ok) {
      window.location.href = result.checkoutUrl;
      return;
    }
    setLoading(false);
    setError(errorMessage(result.error));
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleSubscribe()}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: "#D4450A" }}
      >
        {loading ? "Redirecting to checkout…" : "Subscribe →"}
      </button>
      {error ? <p className="text-center text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
