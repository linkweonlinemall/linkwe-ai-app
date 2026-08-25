"use client";

import { useState } from "react";
import { IconBolt } from "@tabler/icons-react";

import { toggleVendorAvailability } from "@/app/actions/on-demand";

type Props = {
  initialAvailable: boolean;
  /** `banner` matches vendor dashboard spec (white card, amber icon, compact on mobile). */
  appearance?: "default" | "banner";
};

export default function AvailabilityToggle({ initialAvailable, appearance = "default" }: Props) {
  const [isAvailable, setIsAvailable] = useState(initialAvailable);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    const result = await toggleVendorAvailability();
    if ("ok" in result) {
      setIsAvailable(result.isAvailableNow);
    }
    setLoading(false);
  }

  if (appearance === "banner") {
    return (
      <div className="avail-row flex min-w-0 items-center justify-between gap-3 rounded-[12px] border-[0.5px] border-[rgba(28,28,26,0.12)] bg-white p-3 sm:p-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#FAEEDA] text-[#BA7517]">
            <IconBolt className="size-[18px]" stroke={1.75} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1C1C1A]">On-demand availability</p>
            <p className={`mt-0.5 text-xs ${isAvailable ? "text-[#854F0B]" : "text-[#7c7b77]"}`}>
              {isAvailable ? "You are accepting on-demand requests" : "You are not accepting requests right now"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          className={`relative h-8 w-[52px] shrink-0 overflow-hidden rounded-full transition-colors disabled:opacity-50 ${
            isAvailable ? "bg-emerald-500" : "bg-zinc-200"
          }`}
          aria-pressed={isAvailable}
        >
          <span
            className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              isAvailable ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border-2 p-4 transition-all ${
        isAvailable ? "border-emerald-200 bg-emerald-50" : "border-zinc-200 bg-white"
      }`}
    >
      <div className="flex-1">
        <p className="text-sm font-bold text-zinc-900">On-demand availability</p>
        <p className={`text-xs ${isAvailable ? "text-emerald-600" : "text-zinc-400"}`}>
          {isAvailable ? "You are accepting on-demand requests" : "You are not accepting requests right now"}
        </p>
      </div>
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={`relative h-7 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          isAvailable ? "bg-emerald-500" : "bg-zinc-200"
        }`}
      >
        <div
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            isAvailable ? "translate-x-7" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
