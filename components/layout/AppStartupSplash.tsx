"use client";

import { useEffect, useState } from "react";

const DISPLAY_MS = 2300;
const FADE_MS = 650;

export default function AppStartupSplash() {
  const [phase, setPhase] = useState<"showing" | "leaving" | "gone">("showing");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const leaveTimer = window.setTimeout(() => setPhase("leaving"), DISPLAY_MS);
    const removeTimer = window.setTimeout(() => setPhase("gone"), DISPLAY_MS + FADE_MS);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (phase === "gone") document.body.style.overflow = "";
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div
      className={`lw-app-splash fixed inset-0 z-[1000] overflow-hidden bg-[#020b22] ${phase === "leaving" ? "lw-app-splash-leaving" : ""}`}
      role="status"
      aria-label="Opening LinkWe"
    >
      <div className="absolute inset-0 scale-110 bg-[url('/linkwe-startup-splash.jpg')] bg-cover bg-center opacity-45 blur-2xl" aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/linkwe-startup-splash.jpg"
        alt=""
        className="lw-app-splash-art absolute inset-0 h-full w-full object-cover object-center sm:object-contain"
        draggable={false}
      />
      <div className="lw-app-splash-progress absolute inset-x-0 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))] flex flex-col items-center px-6">
        <p className="mb-3 text-[15px] font-semibold tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] sm:text-lg">Loading…</p>
        <div className="h-[18px] w-full max-w-[460px] rounded-full border-2 border-white/85 bg-black/25 p-[3px] shadow-[0_0_22px_rgba(34,211,238,0.28),0_4px_18px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          <div className="lw-app-splash-bar h-full rounded-full bg-[linear-gradient(90deg,#10bff3_0%,#16e0d0_28%,#ffe230_56%,#ff9a16_78%,#ff3f22_100%)] shadow-[0_0_15px_rgba(37,211,245,0.7)]" />
        </div>
      </div>
      <span className="sr-only">LinkWe is loading</span>
    </div>
  );
}
