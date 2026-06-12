"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { IconTruck } from "@tabler/icons-react";

import {
  setShippingRates,
  updateShippingMode,
} from "@/app/actions/vendor-shipping";
import { toastChangesSaved, toastFormError } from "@/lib/feedback/toasts";
import { ttdToMinor } from "@/lib/finance/commission";
import {
  SHIPPING_ZONES,
  ZONE_DEFINITIONS,
  type LinkWeRateDisplay,
  type VendorShippingZone,
} from "@/lib/shipping/vendor-shipping-types";

type RateRecord = {
  zone: string;
  rateMinor: number;
  active: boolean;
};

type ZoneRowState = {
  zone: VendorShippingZone;
  priceInput: string;
  active: boolean;
};

type Props = {
  initialMode: "SELF" | "LINKWE";
  initialRates: RateRecord[];
  linkweRates: LinkWeRateDisplay[];
};

function formatTtd(minor: number): string {
  return `TTD ${(minor / 100).toFixed(2)}`;
}

function buildZoneRows(rates: RateRecord[]): ZoneRowState[] {
  return SHIPPING_ZONES.map((zone) => {
    const existing = rates.find((r) => r.zone === zone);
    return {
      zone,
      priceInput: existing ? (existing.rateMinor / 100).toFixed(2) : "",
      active: existing?.active ?? true,
    };
  });
}

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        checked ? "bg-[#D4450A]" : "bg-zinc-200",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block size-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}

export default function ShippingSettingsClient({
  initialMode,
  initialRates,
  linkweRates,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"SELF" | "LINKWE">(initialMode);
  const [zoneRows, setZoneRows] = useState<ZoneRowState[]>(() => buildZoneRows(initialRates));
  const [isModePending, startModeTransition] = useTransition();
  const [isRatesPending, startRatesTransition] = useTransition();

  const linkweByZone = useMemo(() => {
    const map = new Map<VendorShippingZone, number>();
    for (const row of linkweRates) {
      map.set(row.zone, row.rateMinor);
    }
    return map;
  }, [linkweRates]);

  function handleModeChange(next: "SELF" | "LINKWE") {
    if (next === mode || isModePending) return;
    startModeTransition(async () => {
      const result = await updateShippingMode(next);
      if (!result.ok) {
        toastFormError(result.error ?? "Could not update shipping mode.");
        return;
      }
      setMode(next);
      toastChangesSaved("Shipping mode updated");
      router.refresh();
    });
  }

  function updateZoneRow(zone: VendorShippingZone, patch: Partial<ZoneRowState>) {
    setZoneRows((rows) => rows.map((r) => (r.zone === zone ? { ...r, ...patch } : r)));
  }

  function handleSaveRates() {
    const payload = zoneRows.map((row) => {
      const parsed = Number.parseFloat(row.priceInput);
      const rateMinor = Number.isFinite(parsed) && parsed >= 0 ? ttdToMinor(parsed) : 0;
      return { zone: row.zone, rateMinor, active: row.active };
    });

    startRatesTransition(async () => {
      const result = await setShippingRates(payload);
      if (!result.ok) {
        toastFormError(result.error ?? "Could not save rates.");
        return;
      }
      toastChangesSaved("Shipping rates saved");
      router.refresh();
    });
  }

  const saving = isModePending || isRatesPending;

  return (
    <div className="flex flex-col gap-6">
      {/* Mode toggle */}
      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-bold text-[#1C1C1A]">Delivery method</h2>
          <p className="mt-0.5 text-xs text-[#7c7b77]">
            How should orders from your store reach customers?
          </p>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {(
            [
              {
                value: "SELF" as const,
                title: "I deliver myself",
                description: "Set your own rates by zone. You handle packing and delivery.",
              },
              {
                value: "LINKWE" as const,
                title: "Let LinkWe handle delivery",
                description: "LinkWe coordinates couriers. You pack and mark orders ready.",
              },
            ] as const
          ).map((option) => {
            const selected = mode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={isModePending}
                onClick={() => handleModeChange(option.value)}
                className={[
                  "rounded-xl border-2 p-4 text-left transition-colors",
                  selected
                    ? "border-[#D4450A] bg-[#FEF0EB]"
                    : "border-zinc-200 bg-white hover:border-zinc-300",
                  isModePending ? "cursor-wait opacity-70" : "",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={[
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                      selected ? "border-[#D4450A]" : "border-zinc-300",
                    ].join(" ")}
                  >
                    {selected ? (
                      <span className="size-2.5 rounded-full bg-[#D4450A]" />
                    ) : null}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1C1C1A]">{option.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#7c7b77]">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* SELF mode */}
      {mode === "SELF" ? (
        <section className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="font-bold text-[#1C1C1A]">Your delivery rates</h2>
            <p className="mt-0.5 text-xs text-[#7c7b77]">
              Set a price per zone. Turn off zones you do not deliver to.
            </p>
          </div>

          <ul className="divide-y divide-zinc-50">
            {ZONE_DEFINITIONS.map((def) => {
              const row = zoneRows.find((r) => r.zone === def.zone)!;
              return (
                <li
                  key={def.zone}
                  className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#1C1C1A]">
                      {def.label}
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                        {def.zone}
                      </span>
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#7c7b77]">
                      {def.regionsPreview}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:shrink-0">
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                        Rate
                      </span>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                          TTD
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          inputMode="decimal"
                          disabled={!row.active || isRatesPending}
                          value={row.priceInput}
                          onChange={(e) => updateZoneRow(def.zone, { priceInput: e.target.value })}
                          placeholder="0.00"
                          className="w-full min-w-[7.5rem] rounded-lg border border-zinc-200 py-2 pl-11 pr-3 text-sm text-[#1C1C1A] outline-none focus:border-[#D4450A] focus:ring-1 focus:ring-[#D4450A] disabled:bg-zinc-50 disabled:text-zinc-400 sm:w-32"
                        />
                      </div>
                    </label>

                    <div className="flex items-center gap-2">
                      <Toggle
                        checked={row.active}
                        disabled={isRatesPending}
                        label={`Deliver to ${def.label}`}
                        onChange={(active) => updateZoneRow(def.zone, { active })}
                      />
                      <span className="text-xs text-[#7c7b77]">Deliver here</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-zinc-100 px-5 py-4">
            <button
              type="button"
              disabled={isRatesPending}
              onClick={handleSaveRates}
              className="inline-flex w-full items-center justify-center rounded-lg bg-[#D4450A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#B83A08] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            >
              {isRatesPending ? "Saving…" : "Save rates"}
            </button>
          </div>
        </section>
      ) : null}

      {/* LINKWE mode */}
      {mode === "LINKWE" ? (
        <section className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60">
          <div className="border-b border-zinc-100 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF0EB] text-[#D4450A]">
                <IconTruck className="size-5" stroke={1.5} aria-hidden />
              </div>
              <div>
                <h2 className="font-bold text-[#1C1C1A]">LinkWe delivery rates</h2>
                <p className="mt-1 text-xs leading-relaxed text-[#7c7b77]">
                  LinkWe coordinates delivery for these orders. You just pack and mark the order
                  ready — we handle the courier and customer tracking.
                </p>
                <p className="mt-2 text-[10px] text-zinc-400">
                  Shown rates are entry-tier (up to 20 lbs) customer prices including LinkWe
                  handling.
                </p>
              </div>
            </div>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-3">Zone</th>
                  <th className="px-5 py-3">Coverage</th>
                  <th className="px-5 py-3 text-right">Customer pays</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {ZONE_DEFINITIONS.map((def) => (
                  <tr key={def.zone}>
                    <td className="px-5 py-3 font-medium text-[#1C1C1A]">{def.label}</td>
                    <td className="max-w-md px-5 py-3 text-xs text-[#7c7b77]">
                      {def.regionsPreview}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-[#1C1C1A]">
                      {formatTtd(linkweByZone.get(def.zone) ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-zinc-50 md:hidden">
            {ZONE_DEFINITIONS.map((def) => (
              <li key={def.zone} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1C1C1A]">{def.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#7c7b77]">
                      {def.regionsPreview}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-[#1C1C1A]">
                    {formatTtd(linkweByZone.get(def.zone) ?? 0)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {saving ? (
        <p className="text-center text-xs text-zinc-400" aria-live="polite">
          Saving changes…
        </p>
      ) : null}
    </div>
  );
}
