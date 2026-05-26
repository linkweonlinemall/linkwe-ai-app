"use client";

import { useCallback, useEffect, useState } from "react";

/** Chromium `BeforeInstallPromptEvent` (minimal surface for our usage). */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;

type WindowWithFlag = Window & { __linkwePwaInstallAttached?: boolean };

const bumpers = new Set<() => void>();
const installedCallbacks = new Set<() => void>();

function notifyBumpers(): void {
  bumpers.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore subscriber errors */
    }
  });
}

function notifyInstalled(): void {
  installedCallbacks.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

function readStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (typeof nav.standalone === "boolean" && nav.standalone === true)
  );
}

/** True after Chromium install flow confirms "Install" — before display-mode switches. */
let installAcceptedByUser = false;

function readInstalled(): boolean {
  return readStandalone() || installAcceptedByUser;
}

function attachGlobalListenersOnce(): void {
  if (typeof window === "undefined") return;
  const w = window as WindowWithFlag;
  if (w.__linkwePwaInstallAttached) return;
  w.__linkwePwaInstallAttached = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notifyBumpers();
  });

  window.addEventListener("appinstalled", () => {
    installAcceptedByUser = true;
    deferredPrompt = null;
    notifyBumpers();
    notifyInstalled();
  });

  const standaloneMql = window.matchMedia("(display-mode: standalone)");
  standaloneMql.addEventListener("change", () => notifyBumpers());
}

export type UsePWAInstallOptions = {
  /** Runs when `appinstalled` fires (successful add to home screen / install). */
  onInstalled?: () => void;
};

export function usePWAInstall(options?: UsePWAInstallOptions): {
  isInstallable: boolean;
  isInstalled: boolean;
  install: () => Promise<boolean>;
} {
  const { onInstalled } = options ?? {};
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    attachGlobalListenersOnce();
    bump();
    bumpers.add(bump);
    return () => {
      bumpers.delete(bump);
    };
  }, [bump]);

  useEffect(() => {
    if (!onInstalled) return;
    installedCallbacks.add(onInstalled);
    return () => {
      installedCallbacks.delete(onInstalled);
    };
  }, [onInstalled]);

  const isInstalled = readInstalled();
  const isInstallable = Boolean(deferredPrompt) && !isInstalled;

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt || readInstalled()) return false;
    const promptEvent = deferredPrompt;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    deferredPrompt = null;
    if (outcome === "accepted") {
      installAcceptedByUser = true;
    }
    notifyBumpers();
    return outcome === "accepted";
  }, []);

  return { isInstallable, isInstalled, install };
}
