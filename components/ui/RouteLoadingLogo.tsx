export default function RouteLoadingLogo({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[38vh] flex-col items-center justify-center px-6 text-center" role="status" aria-live="polite">
      <div className="lw-loader-orbit relative flex size-24 items-center justify-center rounded-full bg-white shadow-[0_16px_45px_rgba(28,28,26,0.12)]">
        {/* Generated from the current LinkWe app icon for a consistent branded transition. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/linkwe-loader-mark-v1.png" alt="" className="lw-loader-mark size-[74px] object-contain" />
      </div>
      <p className="mt-4 text-sm font-semibold text-[#1C1C1A]">{label}</p>
      <p className="mt-1 text-xs text-[#7c7b77]">Getting the next page ready…</p>
    </div>
  );
}
