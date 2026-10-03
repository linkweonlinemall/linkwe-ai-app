"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, X } from "lucide-react";
import { usePWAInstall } from "@/lib/hooks/use-pwa-install";
import { detectInstallPlatform } from "@/lib/pwa/install";
export default function InstallPrompt() {
  const path = usePathname();
  const [show, setShow] = useState(false), [dismissed, setDismissed] = useState(true), [ios, setIos] = useState(false);
  const { isInstallable, isInstalled, isInstalling, error, install } = usePWAInstall();
  const quiet = /^\/(get-app|checkout|cart|dashboard|onboarding|login|register|reset-password|scan|tickets\/checkout)/.test(path);
  useEffect(() => { try { const previous = localStorage.getItem("pwa-install-dismissed"); const until = Number(localStorage.getItem("linkwe-install-dismissed-until")); setDismissed(previous === "true" || until > Date.now()); } catch { setDismissed(false); } setIos(detectInstallPlatform(navigator.userAgent, navigator.maxTouchPoints) === "ios"); }, []);
  useEffect(() => { setShow(false); if (quiet || dismissed || isInstalled || !(ios || isInstallable)) return; const timer = window.setTimeout(() => setShow(true), 16000); return () => window.clearTimeout(timer); }, [quiet, path, dismissed, isInstalled, ios, isInstallable]);
  function dismiss() { setDismissed(true); setShow(false); try { localStorage.setItem("linkwe-install-dismissed-until", String(Date.now() + 7 * 86400000)); } catch { /* Optional preference. */ } }
  if (!show || quiet || dismissed || isInstalled) return null;
  return <aside aria-label="Install LinkWe" className="fixed bottom-24 left-4 right-4 z-40 rounded-2xl border border-white/20 bg-[#123c56] p-5 text-white shadow-2xl sm:bottom-6 sm:left-auto sm:right-6 sm:w-[340px]"><div className="flex items-start gap-3"><img src="/branding/v2/app-96.png" alt="" className="size-12 rounded-xl"/><div className="flex-1"><p className="text-sm font-bold">Your local world. One tap away.</p><p className="mt-1 text-xs leading-5 text-sky-100/80">Keep LinkWe close on your Home Screen.</p></div><button onClick={dismiss} aria-label="Dismiss app installation reminder" className="p-1"><X size={17}/></button></div><div className="mt-4 flex items-center gap-3"><button onClick={dismiss} className="flex-1 rounded-xl border border-white/20 py-2.5 text-xs font-semibold">Later</button>{isInstallable ? <button disabled={isInstalling} onClick={async () => { if (await install()) dismiss(); }} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#d85016] py-2.5 text-xs font-bold disabled:opacity-50"><Download size={15}/>{isInstalling ? "Opening…" : "Install app"}</button> : <Link onClick={dismiss} href="/get-app" className="flex-1 rounded-xl bg-[#d85016] py-2.5 text-center text-xs font-bold">Show me how</Link>}</div>{error && <p className="mt-2 text-xs" role="status"><Link href="/get-app">Open the installation guide</Link></p>}</aside>;
}
