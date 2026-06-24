"use client";

import Link from "next/link";
import { useState } from "react";

import { startServiceSubscriptionCheckout } from "@/app/actions/service-subscription";

type Props = {
  productId: string;
  serviceSlug: string;
  isLoggedIn: boolean;
  isOwner: boolean;
  alreadySubscribed: boolean;
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

export default function SubscribeButton({
  productId,
  serviceSlug,
  isLoggedIn,
  isOwner,
  alreadySubscribed,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/service/${serviceSlug}`)}`;

  if (isOwner) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-center text-sm text-zinc-600">
        This is your service — manage it from your vendor dashboard.
      </p>
    );
  }

  if (alreadySubscribed) {
    return (
      <div className="flex flex-col gap-2">
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800">
          You&apos;re subscribed to this service.
        </p>
        <Link
          href="/dashboard/customer"
          className="text-center text-xs font-semibold text-[#D4450A] underline-offset-2 hover:underline"
        >
          View dashboard →
        </Link>
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
