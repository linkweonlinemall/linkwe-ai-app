"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { toggleVendorAvailability } from "@/app/actions/on-demand";

type Props = { initialAvailable: boolean; appearance?: "default" | "banner" };
export default function AvailabilityToggle({ initialAvailable }: Props) {
  const [isAvailable, setIsAvailable] = useState(initialAvailable);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function handleToggle() {
    setLoading(true); setError("");
    try {
      const result = await toggleVendorAvailability();
      if ("ok" in result) setIsAvailable(result.isAvailableNow);
      else setError("Could not update availability. Please try again.");
    } catch { setError("Could not update availability. Please try again."); }
    finally { setLoading(false); }
  }
  return <section className="avail-row rounded-[20px] border border-[#dfe8d7] bg-white p-5">
    <div className="flex items-center justify-between gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#edf3df] text-[#6b864a]"><Zap size={21}/></span><button type="button" role="switch" aria-checked={isAvailable} aria-label="Accept on-demand requests" onClick={handleToggle} disabled={loading} className={`relative h-8 w-[54px] shrink-0 rounded-full transition-colors disabled:opacity-50 ${isAvailable ? "bg-[#397754]" : "bg-[#dce2d5]"}`}><span className={`absolute left-1 top-1 size-6 rounded-full bg-white shadow transition-transform ${isAvailable ? "translate-x-[22px]" : "translate-x-0"}`}/></button></div>
    <h2 className="mt-4 text-[15px] font-bold tracking-tight text-[#244633]">Open for on-demand requests?</h2><p className="mt-2 text-xs leading-relaxed text-[#7c8d70]" role="status">{loading ? "Updating your availability…" : isAvailable ? "You’re available. Customers can send you on-demand requests." : "You’re paused. Turn this on when you’re ready for on-demand customers."}</p>{error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
  </section>;
}
