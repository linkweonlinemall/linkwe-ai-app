"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { startAITopupCheckout } from "@/app/actions/ai-topup";
import {
  AI_TOPUP_BUNDLES,
  type AITopupBundle,
  type AITopupBundleKey,
} from "@/lib/finance/ai-topup-bundles";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const BUNDLE_ORDER: AITopupBundleKey[] = ["SMALL", "MEDIUM", "LARGE"];

function formatBundlePriceTTD(priceMinor: number): string {
  return `TTD ${(priceMinor / 100).toLocaleString("en-TT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function TopupPaymentForm({
  bundle,
  onSuccess,
  onBack,
}: {
  bundle: AITopupBundle;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const priceLabel = formatBundlePriceTTD(bundle.priceMinor);

  async function handlePay() {
    if (!stripe || !elements) return;
    setPaying(true);
    setPayError(null);

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setPayError(error.message ?? "Payment failed. Please try again.");
      setPaying(false);
      return;
    }

    onSuccess();
  }

  return (
    <div className="mt-3 space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-800"
      >
        <ArrowLeft className="size-3" aria-hidden />
        Back to bundles
      </button>

      <div className="rounded-lg border border-zinc-100 bg-white px-3 py-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-500">
            {bundle.uses} AI use{bundle.uses !== 1 ? "s" : ""}
          </span>
          <span className="font-semibold text-zinc-900">{priceLabel}</span>
        </div>
      </div>

      <PaymentElement />

      {payError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-600">
          {payError}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void handlePay()}
        disabled={paying || !stripe || !elements}
        className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: "#D4450A" }}
      >
        {paying ? "Processing…" : `Pay ${priceLabel}`}
      </button>
    </div>
  );
}

type Props = {
  topupRemaining: number;
};

export default function AITopupCheckout(_props: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<"select" | "payment" | "success">("select");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<AITopupBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (phase === "success") {
      router.refresh();
    }
  }, [phase, router]);

  async function handleSelectBundle(key: AITopupBundleKey) {
    setLoading(true);
    setError(null);

    const result = await startAITopupCheckout(key);

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const bundle = AI_TOPUP_BUNDLES[key];
    setSelectedBundle(bundle);
    setClientSecret(result.clientSecret);
    setPhase("payment");
    setLoading(false);
  }

  function handleBackToSelect() {
    setPhase("select");
    setClientSecret(null);
    setSelectedBundle(null);
    setError(null);
  }

  if (phase === "success") {
    return (
      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
          <p className="text-[11px] font-medium text-emerald-800">
            Payment received — your top-up credits will appear shortly.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "payment" && clientSecret && selectedBundle) {
    return (
      <div className="mt-3">
        <p className="text-[11px] font-medium text-zinc-600">Buy AI uses</p>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <TopupPaymentForm
            bundle={selectedBundle}
            onSuccess={() => setPhase("success")}
            onBack={handleBackToSelect}
          />
        </Elements>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <p className="text-[11px] font-medium text-zinc-600">Buy AI uses</p>
      <p className="mt-0.5 text-[11px] text-zinc-500">
        One-time top-up credits never expire and are used after your monthly plan allowance.
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
              disabled={loading}
              onClick={() => void handleSelectBundle(key)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-[11px] transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
            >
              <span className="block font-semibold text-zinc-900">
                {bundle.uses} uses
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
