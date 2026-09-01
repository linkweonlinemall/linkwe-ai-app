export default function RouteLoadingLogo({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,rgba(232,130,12,0.10),transparent_34%),#F8F7F5] px-6 text-center" role="status" aria-live="polite">
      <div className="lw-route-loader relative flex size-32 items-center justify-center sm:size-36">
        <span className="absolute inset-1 rounded-full bg-gradient-to-br from-cyan-300/25 via-amber-300/20 to-rose-400/25 blur-2xl" aria-hidden />
        {/* Transparent logo mark: route changes stay light instead of replaying the startup artwork. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/linkwe-loader-mark-v1.png" alt="" className="lw-loader-mark relative z-10 size-28 object-contain drop-shadow-[0_16px_26px_rgba(0,42,80,0.22)] sm:size-32" />
        <span className="lw-route-loader-ring absolute inset-0 rounded-full border border-[#D4450A]/15" aria-hidden />
      </div>
      <p className="mt-5 text-sm font-bold tracking-wide text-[#1C1C1A]">{label.endsWith("…") ? label : `${label}…`}</p>
      <div className="mt-3 h-1.5 w-32 overflow-hidden rounded-full bg-zinc-200/80" aria-hidden>
        <span className="lw-route-loader-bar block h-full w-1/2 rounded-full bg-gradient-to-r from-cyan-500 via-amber-400 to-[#D4450A]" />
      </div>
    </div>
  );
}
