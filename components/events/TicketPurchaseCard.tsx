"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Minus,
  Plus,
  ShieldCheck,
} from "lucide-react";

import { createTicketPaymentIntent } from "@/app/actions/ticket-checkout";
import {
  formatEventDateCard,
  formatEventSaleDate,
  formatEventTimeCard,
} from "@/lib/events/format-datetime";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// ── Types ──────────────────────────────────────────────────────────────────────
type TicketType = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  quantitySold: number;
  description: string | null;
  perks: string | null;
  maxPerOrder: number;
  isVisible: boolean;
  saleStartDate: Date | null;
  saleEnds: Date | null;
};

type Props = {
  eventId: string;
  eventSlug: string;
  startDate: Date;
  ticketTypes: TicketType[];
  refundPolicyType: string | null;
  refundCutoffHours: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const INCLUSIONS_LONG_CHAR_THRESHOLD = 140;
const INCLUSIONS_LONG_LINE_THRESHOLD = 4;

function inclusionLineCount(perks: string | null, description: string | null): number {
  const text = [perks?.trim(), description?.trim()].filter(Boolean).join("\n");
  if (!text) return 0;
  return text.split(/\r?\n/).length;
}

function isLongInclusions(perks: string | null, description: string | null): boolean {
  const text = [perks?.trim(), description?.trim()].filter(Boolean).join("\n");
  if (!text) return false;
  return (
    text.length > INCLUSIONS_LONG_CHAR_THRESHOLD ||
    inclusionLineCount(perks, description) > INCLUSIONS_LONG_LINE_THRESHOLD
  );
}

function TicketTypeInclusions({
  perks,
  description,
}: {
  perks: string | null;
  description: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const perksText = perks?.trim() ?? "";
  const descriptionText = description?.trim() ?? "";
  if (!perksText && !descriptionText) return null;

  const long = isLongInclusions(perks, description);
  const collapsed = long && !expanded;

  return (
    <div className="mb-3">
      <div className={collapsed ? "line-clamp-4 overflow-hidden" : undefined}>
        {perksText ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600">{perks}</p>
        ) : null}
        {descriptionText ? (
          <p
            className={`whitespace-pre-line text-xs leading-relaxed text-zinc-500 ${
              perksText ? "mt-2" : ""
            }`}
          >
            {description}
          </p>
        ) : null}
      </div>
      {long ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-xs font-semibold text-[#D4450A] hover:underline"
        >
          {expanded ? "Show less" : "Show all"}
        </button>
      ) : null}
    </div>
  );
}

// ── Stripe payment sub-form ────────────────────────────────────────────────────
function TicketPaymentForm({
  totalTTD,
  ticketCount,
  onSuccess,
  onBack,
}: {
  totalTTD: number;
  ticketCount: number;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

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
    <div className="space-y-4">
      {/* Back link */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-800"
      >
        <ArrowLeft className="size-3.5" />
        Back to selection
      </button>

      {/* Order summary strip */}
      <div className="rounded-xl bg-[#F5F5F5] px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500">
            {ticketCount} ticket{ticketCount !== 1 ? "s" : ""}
          </span>
          <span className="text-sm font-bold text-[#1C1C1A]">
            {totalTTD === 0 ? "Free" : `TTD ${totalTTD.toFixed(2)}`}
          </span>
        </div>
      </div>

      {/* Stripe card form */}
      <PaymentElement />

      {/* Payment error */}
      {payError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {payError}
        </div>
      )}

      {/* Pay button */}
      <button
        type="button"
        onClick={() => void handlePay()}
        disabled={paying || !stripe || !elements}
        className="w-full rounded-2xl bg-[#D4450A] py-4 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {paying
          ? "Processing…"
          : `Pay TTD ${totalTTD.toFixed(2)}`}
      </button>
    </div>
  );
}

// ── Card header (reused across phases) ────────────────────────────────────────
function CardHeader({
  startDate,
  subtitle,
  badge,
}: {
  startDate: Date;
  subtitle: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="bg-[#1C1C1A] px-6 py-5">
      <div className="flex items-center gap-2 text-sm text-white/70">
        <CalendarDays className="size-4 shrink-0" aria-hidden />
        <span>
          {formatEventDateCard(startDate)} · {formatEventTimeCard(startDate)}
        </span>
      </div>
      <p className="mt-2 text-base font-bold text-white">{subtitle}</p>
      {badge}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function TicketPurchaseCard({
  eventId,
  startDate,
  ticketTypes,
  refundPolicyType,
  refundCutoffHours,
}: Props) {
  const now = new Date();

  // Quantity state — one entry per ticket type, default 0
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(ticketTypes.map((t) => [t.id, 0])),
  );

  // Flow state
  const [phase, setPhase] = useState<"select" | "payment" | "success">("select");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleTypes = ticketTypes.filter((t) => t.isVisible);

  function getStatus(t: TicketType): "on_sale" | "sold_out" | "not_started" | "ended" {
    const remaining = t.quantity - t.quantitySold;
    if (remaining <= 0) return "sold_out";
    if (t.saleStartDate && new Date(t.saleStartDate) > now) return "not_started";
    if (t.saleEnds && new Date(t.saleEnds) < now) return "ended";
    return "on_sale";
  }

  function adjust(id: string, delta: number, max: number) {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, Math.min(max, (prev[id] ?? 0) + delta)),
    }));
  }

  const lineItems = visibleTypes
    .filter((t) => (quantities[t.id] ?? 0) > 0)
    .map((t) => ({ id: t.id, name: t.name, qty: quantities[t.id]!, price: t.price }));

  const total = lineItems.reduce((s, l) => s + l.qty * l.price, 0);
  const totalTickets = Object.values(quantities).reduce((s, v) => s + v, 0);

  const totalRemaining = visibleTypes.reduce(
    (s, t) => s + Math.max(0, t.quantity - t.quantitySold),
    0,
  );

  const refundLabel =
    refundPolicyType === "FULL"
      ? `Full refund up to ${refundCutoffHours}h before event`
      : refundPolicyType === "PARTIAL"
        ? `Partial refund up to ${refundCutoffHours}h before event`
        : "No refunds";

  // ── Proceed to payment ───────────────────────────────────────────────────────
  async function handleGetTickets() {
    if (totalTickets === 0) return;
    setLoading(true);
    setError(null);

    const items = lineItems.map((l) => ({
      ticketTypeId: l.id,
      quantity: l.qty,
    }));

    const result = await createTicketPaymentIntent(eventId, items);

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.free) {
      // Free ticket: order already confirmed server-side
      setPhase("success");
      setLoading(false);
      return;
    }

    setClientSecret(result.clientSecret);
    setPhase("payment");
    setLoading(false);
  }

  // ── Phase: success ───────────────────────────────────────────────────────────
  if (phase === "success") {
    return (
      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-lg">
        <CardHeader startDate={startDate} subtitle="Tickets confirmed" />
        <div className="px-6 py-10 text-center">
          <CheckCircle2
            className="mx-auto mb-4 size-14 text-emerald-500"
            aria-hidden
            strokeWidth={1.5}
          />
          <p className="text-lg font-extrabold text-[#1C1C1A]">Payment successful!</p>
          <p className="mt-2 text-sm text-zinc-500">
            Your tickets are confirmed and saved to your account.
          </p>
          <Link
            href="/my-tickets"
            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[#D4450A]/8 px-5 py-2.5 text-sm font-semibold text-[#D4450A] transition-colors hover:bg-[#D4450A]/15"
          >
            View my tickets →
          </Link>
        </div>
      </div>
    );
  }

  // ── Phase: payment (Stripe Elements) ────────────────────────────────────────
  if (phase === "payment" && clientSecret) {
    return (
      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-lg">
        <CardHeader startDate={startDate} subtitle="Complete your purchase" />
        <div className="px-6 py-5">
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <TicketPaymentForm
              totalTTD={total}
              ticketCount={totalTickets}
              onSuccess={() => setPhase("success")}
              onBack={() => {
                setPhase("select");
                setClientSecret(null);
              }}
            />
          </Elements>
        </div>
      </div>
    );
  }

  // ── Phase: select (quantity steppers) ───────────────────────────────────────
  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-lg">
      {/* Dark header */}
      <CardHeader
        startDate={startDate}
        subtitle="Select your tickets"
        badge={
          totalRemaining > 0 ? (
            <div className="mt-2.5 inline-flex items-center rounded-full border border-[#D4450A]/30 bg-[#D4450A]/20 px-3 py-1 text-xs font-semibold text-[#ff7043]">
              {totalRemaining} ticket{totalRemaining !== 1 ? "s" : ""} remaining
            </div>
          ) : visibleTypes.length > 0 ? (
            <div className="mt-2.5 inline-flex items-center rounded-full border border-red-500/30 bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">
              Sold out
            </div>
          ) : undefined
        }
      />

      {/* Body */}
      <div className="px-6 py-4">
        {visibleTypes.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">No tickets available yet.</p>
        ) : (
          <div>
            {visibleTypes.map((t, idx) => {
              const status = getStatus(t);
              const remaining = t.quantity - t.quantitySold;
              const maxQty = Math.min(t.maxPerOrder, remaining);
              const qty = quantities[t.id] ?? 0;
              const isSoldOut = status === "sold_out";

              return (
                <div
                  key={t.id}
                  className={`relative py-4 ${
                    idx < visibleTypes.length - 1 ? "border-b border-zinc-100" : ""
                  }`}
                >
                  {/* Sold-out grey overlay */}
                  {isSoldOut && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80">
                      <span className="rounded-full bg-zinc-100 px-4 py-1.5 text-sm font-semibold text-zinc-400">
                        Sold out
                      </span>
                    </div>
                  )}

                  {/* Name + price row */}
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 text-base font-bold text-[#1C1C1A]">{t.name}</p>
                    <div className="shrink-0 text-right">
                      <p className="text-xl font-extrabold text-[#1C1C1A]">
                        {t.price === 0 ? "Free" : `TTD ${t.price.toFixed(2)}`}
                      </p>
                      {t.price > 0 && <p className="text-xs text-zinc-400">per ticket</p>}
                    </div>
                  </div>

                  <TicketTypeInclusions perks={t.perks} description={t.description} />

                  {/* Status / stepper row */}
                  {status === "not_started" && (
                    <p className="text-xs font-semibold text-amber-600">
                      Sales open{" "}
                      {formatEventSaleDate(new Date(t.saleStartDate!))}
                    </p>
                  )}
                  {status === "ended" && (
                    <p className="text-xs font-semibold text-zinc-400">Sales closed</p>
                  )}
                  {status === "on_sale" && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-zinc-400">
                        Quantity <span className="text-zinc-500">(max {t.maxPerOrder})</span>
                      </p>
                      <div className="flex items-center overflow-hidden rounded-full border border-zinc-200">
                        <button
                          onClick={() => adjust(t.id, -1, maxQty)}
                          disabled={qty === 0}
                          className="flex h-8 w-8 items-center justify-center text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="min-w-[28px] text-center text-sm font-semibold tabular-nums text-zinc-900">
                          {qty}
                        </span>
                        <button
                          onClick={() => adjust(t.id, 1, maxQty)}
                          disabled={qty >= maxQty}
                          className="flex h-8 w-8 items-center justify-center text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40"
                          aria-label="Increase quantity"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                  {status === "on_sale" && remaining <= 20 && remaining > 0 && (
                    <p className="mt-1.5 text-right text-xs font-medium text-amber-600">
                      Only {remaining} left
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Order summary */}
        {lineItems.length > 0 && (
          <div className="mt-4 rounded-2xl bg-[#F5F5F5] p-4">
            <div className="space-y-1.5">
              {lineItems.map((item) => (
                <div key={item.name} className="flex justify-between text-sm text-zinc-600">
                  <span>
                    {item.qty} × {item.name}
                  </span>
                  <span>TTD {(item.qty * item.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-zinc-200 pt-3">
              <span className="text-base font-bold text-[#1C1C1A]">Total</span>
              <span className="text-base font-bold text-[#1C1C1A]">
                {total === 0 ? "Free" : `TTD ${total.toFixed(2)}`}
              </span>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* CTA button */}
        <button
          onClick={() => void handleGetTickets()}
          disabled={totalTickets === 0 || loading}
          className="mt-4 w-full rounded-2xl bg-[#D4450A] py-4 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Preparing payment…"
            : total === 0 && totalTickets > 0
              ? "Register free"
              : "Get tickets"}
        </button>

        {/* Refund note */}
        <div className="mb-1 mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-zinc-400">
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
          <span>{refundLabel}</span>
        </div>
      </div>
    </div>
  );
}
