export default function StartupSplashVisual({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#020b22]">
      <picture>
        <source media="(min-width: 640px)" srcSet="/linkwe-startup-splash-desktop.jpg" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/linkwe-startup-splash.jpg"
          alt=""
          loading="eager"
          fetchPriority="high"
          className="lw-app-splash-art absolute inset-0 h-full w-full object-cover object-center"
          draggable={false}
        />
      </picture>
      <div className="lw-app-splash-progress absolute inset-x-0 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))] flex flex-col items-center px-6 sm:bottom-[9%]">
        <p className="mb-3 text-[15px] font-semibold tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] sm:text-lg">{label}</p>
        <div className="h-[18px] w-full max-w-[460px] rounded-full border-2 border-white/85 bg-black/25 p-[3px] shadow-[0_0_22px_rgba(34,211,238,0.28),0_4px_18px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          <div className="lw-app-splash-bar h-full rounded-full bg-[linear-gradient(90deg,#10bff3_0%,#16e0d0_28%,#ffe230_56%,#ff9a16_78%,#ff3f22_100%)] shadow-[0_0_15px_rgba(37,211,245,0.7)]" />
        </div>
      </div>
    </div>
  );
}
