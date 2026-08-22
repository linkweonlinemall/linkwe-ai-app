"use client";

import { useCallback, useState, useTransition } from "react";

import {
  createPromoCode,
  listPromoCodes,
  togglePromoCode,
  type PromoCodeRow,
} from "@/app/actions/promo-codes";
import { TRINIDAD_TIMEZONE } from "@/lib/timezone/trinidad";

type Props = {
  eventId: string;
  initialCodes: PromoCodeRow[];
};

type DiscountType = "PERCENT" | "FIXED";

function formatDiscount(code: PromoCodeRow): string {
  if (code.discountType === "PERCENT") {
    return `${code.discountValue}% off`;
  }
  const dollars = code.discountValue / 100;
  const formatted =
    dollars % 1 === 0 ? dollars.toFixed(0) : dollars.toFixed(2).replace(/\.?0+$/, "");
  return `$${formatted} off`;
}

function formatUses(code: PromoCodeRow): string {
  const max = code.maxUses == null ? "∞" : String(code.maxUses);
  return `${code.usedCount} / ${max}`;
}

function formatExpiry(iso: string | null): string {
  if (!iso) return "No expiry";
  return new Date(iso).toLocaleDateString("en-TT", {
    timeZone: TRINIDAD_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PromoCodesPanel({ eventId, initialCodes }: Props) {
  const [codes, setCodes] = useState(initialCodes);
  const [codeInput, setCodeInput] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("PERCENT");
  const [valueInput, setValueInput] = useState("");
  const [maxUsesInput, setMaxUsesInput] = useState("");
  const [expiresInput, setExpiresInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const refreshList = useCallback(async () => {
    const result = await listPromoCodes(eventId);
    if (result.ok) setCodes(result.codes);
  }, [eventId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const submittedExpiry = String(formData.get("expiresAt") ?? "").trim();
    setFormError(null);
    setFormSuccess(null);

    const rawValue = valueInput.trim();
    const parsedValue = parseFloat(rawValue);
    if (!rawValue || !Number.isFinite(parsedValue) || parsedValue <= 0) {
      setFormError("Enter a valid discount value.");
      return;
    }

    const discountValue =
      discountType === "FIXED" ? Math.round(parsedValue * 100) : Math.trunc(parsedValue);

    const maxUsesRaw = maxUsesInput.trim();
    let maxUses: number | null = null;
    if (maxUsesRaw) {
      const n = parseInt(maxUsesRaw, 10);
      if (!Number.isFinite(n) || n <= 0) {
        setFormError("Max uses must be a positive number, or leave blank for unlimited.");
        return;
      }
      maxUses = n;
    }

    startTransition(async () => {
      const result = await createPromoCode(eventId, {
        code: codeInput,
        discountType,
        discountValue,
        maxUses,
        expiresAt: submittedExpiry || null,
      });

      if (!result.ok) {
        setFormError(result.reason);
        return;
      }

      setFormSuccess("Promo code created.");
      setCodeInput("");
      setValueInput("");
      setMaxUsesInput("");
      setExpiresInput("");
      await refreshList();
    });
  }

  function handleToggle(promoCodeId: string, nextActive: boolean) {
    setToggleError(null);
    setTogglingId(promoCodeId);
    startTransition(async () => {
      const result = await togglePromoCode(promoCodeId, nextActive);
      setTogglingId(null);
      if (!result.ok) {
        setToggleError(result.reason);
        return;
      }
      await refreshList();
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm text-[#1C1C1A]">
      <h2 className="text-lg font-bold">Promo codes</h2>
      <p className="mt-1 text-sm leading-relaxed text-zinc-600">
        Create discount codes for this event. Buyers can redeem them during ticket checkout.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
        <div>
          <label htmlFor="promo-code" className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Code
          </label>
          <input
            id="promo-code"
            type="text"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            placeholder="SUMMER20"
            autoComplete="off"
            spellCheck={false}
            className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-200 bg-white px-3 font-mono text-sm uppercase tracking-wider text-[#1C1C1A] placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-400 focus:border-[#D4450A] focus:outline-none focus:ring-2 focus:ring-[#D4450A]/20"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Discount type
            </span>
            <div className="mt-1 flex rounded-xl border border-zinc-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setDiscountType("PERCENT")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  discountType === "PERCENT"
                    ? "bg-[#D4450A] text-white"
                    : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                Percent
              </button>
              <button
                type="button"
                onClick={() => setDiscountType("FIXED")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  discountType === "FIXED"
                    ? "bg-[#D4450A] text-white"
                    : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                Fixed
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="promo-value" className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {discountType === "PERCENT" ? "% off" : "$ off"}
            </label>
            <input
              id="promo-value"
              type="number"
              min={discountType === "PERCENT" ? 1 : 0.01}
              max={discountType === "PERCENT" ? 100 : undefined}
              step={discountType === "PERCENT" ? 1 : 0.01}
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              placeholder={discountType === "PERCENT" ? "20" : "50.00"}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-[#1C1C1A] focus:border-[#D4450A] focus:outline-none focus:ring-2 focus:ring-[#D4450A]/20"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="promo-max-uses" className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Max uses (optional)
            </label>
            <input
              id="promo-max-uses"
              type="number"
              min={1}
              step={1}
              value={maxUsesInput}
              onChange={(e) => setMaxUsesInput(e.target.value)}
              placeholder="Unlimited"
              className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-[#1C1C1A] focus:border-[#D4450A] focus:outline-none focus:ring-2 focus:ring-[#D4450A]/20"
            />
          </div>

          <div>
            <label htmlFor="promo-expires" className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Expiry (optional)
            </label>
            <input
              id="promo-expires"
              name="expiresAt"
              type="date"
              value={expiresInput}
              onChange={(e) => setExpiresInput(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-[#1C1C1A] focus:border-[#D4450A] focus:outline-none focus:ring-2 focus:ring-[#D4450A]/20"
            />
          </div>
        </div>

        {formError ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800" role="alert">
            {formError}
          </p>
        ) : null}
        {formSuccess ? (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">
            {formSuccess}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#D4450A] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
        >
          {isPending ? "Creating…" : "Create promo code"}
        </button>
      </form>

      {toggleError ? (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800" role="alert">
          {toggleError}
        </p>
      ) : null}

      {codes.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {codes.map((code) => (
            <li
              key={code.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3 ${
                code.active ? "bg-white" : "bg-zinc-50 opacity-60"
              }`}
            >
              <div className="min-w-0">
                <p className="font-mono text-sm font-bold tracking-wider text-[#D4450A]">{code.code}</p>
                <p className="mt-0.5 text-sm text-zinc-700">
                  {formatDiscount(code)} · Uses {formatUses(code)} · {formatExpiry(code.expiresAt)}
                </p>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-zinc-600">
                <span>{code.active ? "Active" : "Inactive"}</span>
                <input
                  type="checkbox"
                  checked={code.active}
                  disabled={isPending && togglingId === code.id}
                  onChange={(e) => handleToggle(code.id, e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-[#D4450A] focus:ring-[#D4450A]/20"
                />
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-zinc-400">No promo codes yet.</p>
      )}
    </section>
  );
}
