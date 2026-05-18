"use client";

import { useState } from "react";

import { toggleVendorAvailability } from "@/app/actions/on-demand";

type Props = {
  initialAvailable: boolean;
};

export default function AvailabilityToggle({ initialAvailable }: Props) {
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
