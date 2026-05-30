"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Minus, Plus, ShieldCheck } from "lucide-react";

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

function formatCardDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-TT", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCardTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-TT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function TicketPurchaseCard({
  eventSlug,
  startDate,
  ticketTypes,
  refundPolicyType,
  refundCutoffHours,
}: Props) {
  const router = useRouter();
  const now = new Date();

  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(ticketTypes.map((t) => [t.id, 0])),
  );

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
    .map((t) => ({ name: t.name, qty: quantities[t.id]!, price: t.price }));

  const total = lineItems.reduce((s, l) => s + l.qty * l.price, 0);
  const totalTickets = Object.values(quantities).reduce((s, v) => s + v, 0);

  const totalRemaining = visibleTypes.reduce(
    (s, t) => s + Math.max(0, t.quantity - t.quantitySold),
    0,
  );

  function handleGetTickets() {
    const params = new URLSearchParams();
    params.set("event", eventSlug);
    for (const item of lineItems) {
      params.append("item", `${item.name}:${item.qty}:${item.price}`);
    }
    params.set("total", total.toFixed(2));
    router.push(`/checkout?${params.toString()}`);
  }

  const refundLabel =
    refundPolicyType === "FULL"
      ? `Full refund up to ${refundCutoffHours}h before event`
      : refundPolicyType === "PARTIAL"
        ? `Partial refund up to ${refundCutoffHours}h before event`
        : "No refunds";

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-lg">
      {/* ── Dark header ── */}
      <div className="bg-[#1C1C1A] px-6 py-5">
        <div className="flex items-center gap-2 text-sm text-white/70">
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          <span>
            {formatCardDate(startDate)} · {formatCardTime(startDate)}
          </span>
        </div>
        <p className="mt-2 text-base font-bold text-white">Select your tickets</p>
        {totalRemaining > 0 && (
          <div className="mt-2.5 inline-flex items-center rounded-full border border-[#D4450A]/30 bg-[#D4450A]/20 px-3 py-1 text-xs font-semibold text-[#ff7043]">
            {totalRemaining} ticket{totalRemaining !== 1 ? "s" : ""} remaining
          </div>
        )}
        {totalRemaining === 0 && visibleTypes.length > 0 && (
          <div className="mt-2.5 inline-flex items-center rounded-full border border-red-500/30 bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">
            Sold out
          </div>
        )}
      </div>

      {/* ── Body ── */}
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
                  className={`relative py-4 ${idx < visibleTypes.length - 1 ? "border-b border-zinc-100" : ""}`}
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
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-[#1C1C1A]">{t.name}</p>
                      {t.perks && (
                        <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{t.perks}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xl font-extrabold text-[#1C1C1A]">
                        {t.price === 0 ? "Free" : `TTD ${t.price.toFixed(2)}`}
                      </p>
                      {t.price > 0 && (
                        <p className="text-xs text-zinc-400">per ticket</p>
                      )}
                    </div>
                  </div>

                  {/* Quantity / status row */}
                  {status === "not_started" && (
                    <p className="text-xs font-semibold text-amber-600">
                      Sales open{" "}
                      {new Date(t.saleStartDate!).toLocaleDateString("en-TT", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  )}
                  {status === "ended" && (
                    <p className="text-xs font-semibold text-zinc-400">Sales closed</p>
                  )}
                  {status === "on_sale" && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-zinc-400">
                        Quantity{" "}
                        <span className="text-zinc-500">(max {t.maxPerOrder})</span>
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

        {/* CTA button */}
        <button
          onClick={handleGetTickets}
          disabled={totalTickets === 0}
          className="mt-4 w-full rounded-2xl bg-[#D4450A] py-4 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {total === 0 && totalTickets > 0 ? "Register free" : "Get tickets"}
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
