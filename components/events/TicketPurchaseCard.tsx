"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Minus,
  Plus,
  ShieldCheck,
} from "lucide-react";

import { createTicketPaymentIntent } from "@/app/actions/ticket-checkout";
import { validatePromoCode } from "@/app/actions/promo-codes";
import { formatTTDPrice } from "@/lib/format/price";
import {
  formatEventDateCard,
  formatEventSaleDate,
  formatEventTimeCard,
} from "@/lib/events/format-datetime";

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

type AppliedPromo = {
  code: string;
  discountType: string;
  discountValue: number;
};

function computeDisplayDiscountMinor(
  subtotalMinor: number,
  discountType: string,
  discountValue: number,
): number {
  if (subtotalMinor <= 0) return 0;
  const discount =
    discountType === "PERCENT"
      ? Math.round((subtotalMinor * discountValue) / 100)
      : discountValue;
  return Math.min(Math.max(0, discount), subtotalMinor);
}

function formatPromoDiscount(promo: AppliedPromo): string {
  if (promo.discountType === "PERCENT") {
    return `${promo.discountValue}% off`;
  }
  const dollars = promo.discountValue / 100;
  return `TTD ${dollars.toFixed(2)} off`;
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
  const [phase, setPhase] = useState<"select" | "success">("select");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== "success") return;

    // Replacing the purchase form with the shorter confirmation can leave the
    // browser pinned to the old bottom position, especially on mobile.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [phase]);
  const [promoApplying, setPromoApplying] = useState(false);

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
  const subtotalMinor = Math.round(total * 100);
  const discountMinor = appliedPromo
    ? computeDisplayDiscountMinor(
        subtotalMinor,
        appliedPromo.discountType,
        appliedPromo.discountValue,
      )
    : 0;
  const finalTotalMinor = subtotalMinor - discountMinor;
  const finalTotal = finalTotalMinor / 100;
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

  async function handleApplyPromo() {
    const code = promoInput.trim();
    if (!code) return;

    setPromoApplying(true);
    setPromoError(null);

    const result = await validatePromoCode(eventId, code);
    setPromoApplying(false);

    if (!result.ok) {
      setAppliedPromo(null);
      setPromoError(result.reason);
      return;
    }

    setAppliedPromo({
      code: result.code,
      discountType: result.discountType,
      discountValue: result.discountValue,
    });
    setPromoInput(result.code);
    setPromoError(null);
  }

  function handleRemovePromo() {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError(null);
  }

  // ── Proceed to payment ───────────────────────────────────────────────────────
  async function handleGetTickets() {
    if (totalTickets === 0) return;
    setLoading(true);
    setError(null);

    const items = lineItems.map((l) => ({
      ticketTypeId: l.id,
      quantity: l.qty,
    }));

    const result = await createTicketPaymentIntent(
      eventId,
      items,
      appliedPromo?.code,
    );

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

    window.location.assign(result.checkoutUrl);
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

        {/* Promo code */}
        {lineItems.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4">
            <p className="text-sm font-semibold text-[#1C1C1A]">Have a promo code?</p>
            {appliedPromo ? (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-zinc-600">
                  <span className="font-mono font-semibold text-[#D4450A]">{appliedPromo.code}</span>
                  {" · "}
                  {formatPromoDiscount(appliedPromo)} applied
                </p>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  className="text-sm font-semibold text-zinc-500 hover:text-[#D4450A]"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => {
                    setPromoInput(e.target.value.toUpperCase());
                    setPromoError(null);
                  }}
                  placeholder="Enter code"
                  autoComplete="off"
                  spellCheck={false}
                  className="min-h-[44px] flex-1 rounded-xl border border-zinc-200 bg-white px-3 font-mono text-sm uppercase tracking-wider text-[#1C1C1A] placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-400 focus:border-[#D4450A] focus:outline-none focus:ring-2 focus:ring-[#D4450A]/20"
                />
                <button
                  type="button"
                  onClick={() => void handleApplyPromo()}
                  disabled={promoApplying || !promoInput.trim()}
                  className="shrink-0 rounded-xl border-2 border-[#D4450A] bg-white px-4 py-2 text-sm font-semibold text-[#D4450A] transition-colors hover:bg-[#FEF0EB] disabled:opacity-50"
                >
                  {promoApplying ? "Checking…" : "Apply"}
                </button>
              </div>
            )}
            {promoError ? (
              <p className="mt-2 text-sm font-medium text-red-600" role="alert">
                {promoError}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Order summary */}
        {lineItems.length > 0 && (
          <div className="mt-4 rounded-2xl bg-[#F5F5F5] p-4">
            <div className="space-y-1.5">
              {lineItems.map((item) => (
                <div key={item.name} className="flex justify-between text-sm text-zinc-600">
                  <span>
                    {item.qty} × {item.name}
                  </span>
                  <span>{formatTTDPrice(item.qty * item.price)}</span>
                </div>
              ))}
            </div>
            {appliedPromo && discountMinor > 0 ? (
              <div className="mt-3 flex items-center justify-between border-t border-zinc-200 pt-3 text-sm text-emerald-700">
                <span>
                  Promo ({appliedPromo.code}) · {formatPromoDiscount(appliedPromo)}
                </span>
                <span>- TTD {(discountMinor / 100).toFixed(2)}</span>
              </div>
            ) : null}
            <div className="mt-3 flex items-center justify-between border-t border-zinc-200 pt-3">
              <span className="text-base font-bold text-[#1C1C1A]">Total</span>
              <span className="text-base font-bold text-[#1C1C1A]">
                {finalTotal === 0 ? "Free" : `TTD ${finalTotal.toFixed(2)}`}
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
            : finalTotal === 0 && totalTickets > 0
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
