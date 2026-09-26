import Link from "next/link";

export default function RexUsageMeter({ allowance, remaining, topupRemaining = 0, lifetime = false, compact = false }: { allowance: number | null; remaining: number | null; topupRemaining?: number; lifetime?: boolean; compact?: boolean }) {
  if (allowance === null || remaining === null) return <span className="text-[10px] text-zinc-400">Checking Rex allowance…</span>;
  const percent = allowance > 0 ? Math.max(0, Math.min(100, Math.round(remaining / allowance * 100))) : 0;
  return <div className={compact ? "w-40 max-w-full" : "w-48 max-w-full"}>
    <div className="mb-1 flex items-center justify-between gap-3 text-[10px]"><span className="text-zinc-400">{lifetime ? "Starter gift" : "Plan allowance"}</span><strong className={percent > 20 ? "text-emerald-300" : "text-amber-300"}>{percent}% left</strong></div>
    <div role="progressbar" aria-label={`${lifetime ? "Starter gift" : "Plan allowance"} remaining`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full transition-[width] ${percent > 20 ? "bg-gradient-to-r from-emerald-400 to-lime-200" : "bg-amber-400"}`} style={{ width: `${percent}%` }}/></div>
    {topupRemaining > 0 ? <p className="mt-1 text-[9px] text-emerald-200">Top-up reserve available</p> : percent === 0 ? <Link href="/dashboard/vendor/finance" className="mt-1 block text-[9px] text-amber-200 underline">Refill Rex in Finance</Link> : null}
  </div>;
}
