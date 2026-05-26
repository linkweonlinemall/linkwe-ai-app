"use client";

import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Styled body for PWA install success — used with Sonner `toast.custom`
 * so it sits in the bottom-centered toast region like a compact card.
 */
export default function PWAInstalledToast() {
  return (
    <div className="fixed bottom-[max(5.5rem,env(safe-area-inset-bottom,0px)+1rem)] left-1/2 z-[200] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-xl border-[0.5px] border-zinc-200/90 bg-white px-4 py-3 shadow-xl sm:bottom-24">
      <CheckCircle2 className="size-7 shrink-0 text-emerald-600" aria-hidden strokeWidth={2} />
      <p className="text-sm font-semibold text-zinc-900">LinkWe has been added to your device</p>
    </div>
  );
}

/** Fires after successful PWA installation (`appinstalled`); bottom-centered card auto-dismiss ~3s. */
export function toastPWAInstalled() {
  toast.custom(() => <PWAInstalledToast />, { duration: 3000 });
}
