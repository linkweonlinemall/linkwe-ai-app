"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import StartupSplashVisual from "@/components/layout/StartupSplashVisual";

const DISPLAY_MS = 2300;
const FADE_MS = 650;

export default function AppStartupSplash() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/dashboard/admin") ?? false;
  const [phase, setPhase] = useState<"showing" | "leaving" | "gone">("showing");

  useEffect(() => {
    if (isAdmin) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const leaveTimer = window.setTimeout(() => setPhase("leaving"), DISPLAY_MS);
    const removeTimer = window.setTimeout(() => setPhase("gone"), DISPLAY_MS + FADE_MS);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (phase === "gone") document.body.style.overflow = "";
  }, [phase]);

  if (isAdmin || phase === "gone") return null;

  return (
    <div
      className={`lw-app-splash fixed inset-0 z-[1000] overflow-hidden bg-[#020b22] ${phase === "leaving" ? "lw-app-splash-leaving" : ""}`}
      role="status"
      aria-label="Opening LinkWe"
    >
      <StartupSplashVisual />
      <span className="sr-only">LinkWe is loading</span>
    </div>
  );
}
