"use client";

import { useEffect, useState } from "react";

import { usePWAInstall } from "@/lib/hooks/use-pwa-install";

export default function InstallPrompt() {
  const [showBanner, setShowBanner] = useState(false);
  const [storedDismissed, setStoredDismissed] = useState<boolean | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  const { isInstallable, isInstalled, install } = usePWAInstall();

  useEffect(() => {
    try {
      setStoredDismissed(!!localStorage.getItem("pwa-install-dismissed"));
    } catch {
      setStoredDismissed(false);
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);
  }, []);

  useEffect(() => {
    if (storedDismissed == null || isInstalled || storedDismissed) return;
    if (!(isIOS || isInstallable)) return;

    const t = window.setTimeout(() => setShowBanner(true), 3000);
    return () => window.clearTimeout(t);
  }, [storedDismissed, isInstalled, isIOS, isInstallable]);

  async function handleInstall() {
    const ok = await install();
    if (ok) {
      setShowBanner(false);
    }
  }

  function handleDismiss() {
    setShowBanner(false);
    try {
      localStorage.setItem("pwa-install-dismissed", "true");
    } catch {
      /* ignore */
    }
    setStoredDismissed(true);
  }

  if (!showBanner || isInstalled || storedDismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 sm:bottom-6 sm:left-auto sm:right-6 sm:w-80">
      <div
        className="overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: "#1C1C1A", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <div className="flex items-start gap-3 p-4">
          <img src="/icon-96x96.png" alt="LinkWe" className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">Install LinkWe Online Mall</p>
            <p className="mt-0.5 text-xs text-zinc-400">
              {isIOS
                ? 'Tap the share button then "Add to Home Screen"'
                : "Add to your home screen for the best experience"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {!isIOS ? (
          <div className="flex gap-2 border-t border-white/10 px-4 py-3">
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-1 rounded-xl border border-white/10 py-2 text-xs font-semibold text-zinc-400 transition-colors hover:text-zinc-200"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={() => void handleInstall()}
              className="flex-1 rounded-xl py-2 text-xs font-bold text-white disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
              disabled={!isInstallable}
            >
              Install app
            </button>
          </div>
        ) : (
          <div className="border-t border-white/10 px-4 py-3 text-center">
            <p className="text-xs text-zinc-400">
              Tap <span className="font-bold text-white">Share</span> →{" "}
              <span className="font-bold text-white">Add to Home Screen</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
