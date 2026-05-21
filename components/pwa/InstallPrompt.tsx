"use client";
import { useEffect, useState } from "react";
import { setDeferredPrompt as syncDeferredPromptToSharedStore } from "@/lib/pwa/install-prompt-store";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Check if dismissed before
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) return;

    if (ios) {
      // Show iOS instructions after 3 seconds
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    // Listen for Chrome/Android install prompt
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      syncDeferredPromptToSharedStore(e);
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 3000);
    });
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  }

  if (!showBanner || isInstalled) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 sm:bottom-6 sm:left-auto sm:right-6 sm:w-80">
      <div
        className="overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: "#1C1C1A", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <div className="flex items-start gap-3 p-4">
          <img
            src="/icon-96x96.png"
            alt="LinkWe"
            className="h-12 w-12 shrink-0 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">
              Install LinkWe Online Mall
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">
              {isIOS
                ? 'Tap the share button then "Add to Home Screen"'
                : "Add to your home screen for the best experience"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors"
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
              className="flex-1 rounded-xl border border-white/10 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={handleInstall}
              className="flex-1 rounded-xl py-2 text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
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
