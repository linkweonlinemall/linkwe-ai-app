"use client";
import { useCallback, useEffect, useState } from "react";
export type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
declare global { interface Window { __pwaInstallPrompt?: Event | null; } }
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let attached = false, installed = false, installing = false;
const subscribers = new Set<() => void>(), installedCallbacks = new Set<() => void>();
const notify = () => subscribers.forEach(fn => fn());
const standalone = () => typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
function attach() {
  if (attached || typeof window === "undefined") return;
  attached = true;
  deferredPrompt = window.__pwaInstallPrompt as BeforeInstallPromptEvent | null ?? null;
  window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); deferredPrompt = event as BeforeInstallPromptEvent; window.__pwaInstallPrompt = event; notify(); });
  window.addEventListener("appinstalled", () => { installed = true; deferredPrompt = null; window.__pwaInstallPrompt = null; notify(); installedCallbacks.forEach(fn => fn()); });
  window.matchMedia("(display-mode: standalone)").addEventListener("change", notify);
}
export type UsePWAInstallOptions = { onInstalled?: () => void };
export function usePWAInstall(options?: UsePWAInstallOptions) {
  const [ready, setReady] = useState(false), [, tick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const bump = useCallback(() => tick(n => n + 1), []);
  useEffect(() => { subscribers.add(bump); attach(); setReady(true); return () => { subscribers.delete(bump); }; }, [bump]);
  const onInstalled = options?.onInstalled;
  useEffect(() => { if (!onInstalled) return; installedCallbacks.add(onInstalled); return () => { installedCallbacks.delete(onInstalled); }; }, [onInstalled]);
  const install = useCallback(async () => {
    if (!deferredPrompt || installed || standalone() || installing) return false;
    const event = deferredPrompt;
    installing = true; deferredPrompt = null; window.__pwaInstallPrompt = null; setError(null); notify();
    try { await event.prompt(); const choice = await event.userChoice; return choice.outcome === "accepted"; }
    catch { setError("The install prompt could not open. Use the browser steps below to add LinkWe."); return false; }
    finally { installing = false; notify(); }
  }, []);
  const isInstalled = ready && (installed || standalone());
  return { isInstalled, isInstallable: ready && !!deferredPrompt && !isInstalled, isInstalling: ready && installing, error, install };
}
