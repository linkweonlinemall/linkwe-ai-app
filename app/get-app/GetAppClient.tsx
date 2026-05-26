"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import PublicNav from "@/components/layout/PublicNav";
import { toastPWAInstalled } from "@/components/ui/pwa-installed-toast";
import { usePWAInstall } from "@/lib/hooks/use-pwa-install";

type Platform = "ios" | "android" | "desktop-chrome" | "desktop-edge" | "desktop-other" | "unknown";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/edg\//.test(ua)) return "desktop-edge";
  if (/chrome/.test(ua) && !/edg\//.test(ua)) return "desktop-chrome";
  return "desktop-other";
}

const STEPS: Record<
  Platform,
  { title: string; icon: string; steps: string[]; note?: string }
> = {
  ios: {
    title: "Install on iPhone or iPad",
    icon: "🍎",
    steps: [
      "Open this page in Safari (not Chrome)",
      "Tap the Share button at the bottom of the screen (box with arrow pointing up)",
      'Scroll down and tap "Add to Home Screen"',
      'Tap "Add" in the top right corner',
      "LinkWe will appear on your home screen like any other app",
    ],
    note: "Must use Safari on iOS. Chrome and other browsers do not support installation on iPhone.",
  },
  android: {
    title: "Install on Android",
    icon: "🤖",
    steps: [
      "Open this page in Chrome",
      'Tap the three dots menu (⋮) in the top right',
      'Tap "Add to Home screen" or "Install app"',
      'Tap "Install" to confirm',
      "LinkWe will appear on your home screen and app drawer",
    ],
    note: "Works best in Chrome. Some Android browsers may show a different prompt.",
  },
  "desktop-chrome": {
    title: "Install on your computer (Chrome)",
    icon: "🖥️",
    steps: [
      "Look for the install icon in the address bar (monitor with download arrow) on the right side",
      'Click it and select "Install LinkWe Online Mall"',
      'Click "Install" to confirm',
      "LinkWe will open as a separate app and appear in your Applications folder",
    ],
    note: "You can also go to Chrome menu (⋮) → Cast, Save and Share → Install page as app.",
  },
  "desktop-edge": {
    title: "Install on your computer (Edge)",
    icon: "🖥️",
    steps: [
      'Click the three dots menu (⋯) in the top right',
      'Select "Apps" → "Install this site as an app"',
      'Click "Install" to confirm',
      "LinkWe will open as a separate app and appear in your taskbar",
    ],
  },
  "desktop-other": {
    title: "Install on your computer",
    icon: "🖥️",
    steps: [
      "For the best experience, open this page in Chrome or Edge",
      "Look for an install option in the browser menu",
      'Select "Install" or "Add to Home Screen"',
      "LinkWe will open as a standalone app",
    ],
    note: "Safari on Mac does not support PWA installation. Use Chrome or Edge for the best experience.",
  },
  unknown: {
    title: "Install LinkWe",
    icon: "📱",
    steps: [
      "Open this page on your device",
      "Look for an install or add to home screen option in your browser menu",
      "Follow the prompts to install",
    ],
  },
};

export default function GetAppClient() {
  const [platform, setPlatform] = useState<Platform>("unknown");

  const { isInstalled, isInstallable, install } = usePWAInstall({
    onInstalled: () => toastPWAInstalled(),
  });

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  async function handleInstall() {
    await install();
  }

  const current = STEPS[platform];

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-mobile-public lg:pb-0">
      <PublicNav />

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #1C1C1A 0%, #2A1A0E 100%)" }}>
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <img
              src="/icon-192x192.png"
              alt="LinkWe"
              className="h-28 w-28 shrink-0 rounded-3xl shadow-2xl"
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#E8820C]">Free download</p>
              <h1 className="mt-2 font-display text-4xl font-black text-white sm:text-5xl">LinkWe Online Mall</h1>

              {/* PWA prompt: native install when Chromium offers it; badge when standalone / accepted */}
              {isInstalled ? (
                <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-5 py-2.5">
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-400" strokeWidth={2} aria-hidden />
                  <span className="text-sm font-bold text-emerald-400">App installed</span>
                </div>
              ) : isInstallable ? (
                <button
                  type="button"
                  onClick={() => void handleInstall()}
                  className="mt-6 w-full rounded-2xl bg-[#D4450A] px-10 py-4 text-center text-base font-bold text-white shadow-lg transition-colors hover:bg-[#B83A08] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C1C1A] sm:w-auto sm:min-w-[16rem]"
                >
                  Install app now
                </button>
              ) : (
                <p className="mt-6 max-w-xl text-sm leading-6 text-zinc-400">
                  When your browser supports it, you&apos;ll see an install prompt. On iPhone, use Safari and &quot;Add to
                  Home Screen&quot;, or follow the steps below on any device.
                </p>
              )}

              <p className="mt-6 text-sm leading-7 text-zinc-400">
                Shop local, book services, discover vendors across Trinidad & Tobago. Install the app for the best
                experience — works on iPhone, Android, and desktop.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Platform-specific instructions */}
        <div className="mb-10 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="px-6 py-5" style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{current.icon}</span>
              <h2 className="text-lg font-black text-white">{current.title}</h2>
            </div>
          </div>
          <div className="p-6">
            <ol className="flex flex-col gap-4">
              {current.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                    style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
                  >
                    {i + 1}
                  </div>
                  <p className="pt-0.5 text-sm leading-6 text-zinc-700">{step}</p>
                </li>
              ))}
            </ol>
            {current.note ? (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs text-amber-800">
                  <span className="font-bold">Note: </span>
                  {current.note}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* All platforms */}
        <h2 className="mb-4 text-lg font-bold text-zinc-900">Instructions for all devices</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              platform: "ios" as Platform,
              label: "iPhone & iPad",
              icon: "🍎",
              desc: "Safari required",
            },
            {
              platform: "android" as Platform,
              label: "Android",
              icon: "🤖",
              desc: "Chrome recommended",
            },
            {
              platform: "desktop-chrome" as Platform,
              label: "Desktop",
              icon: "🖥️",
              desc: "Chrome or Edge",
            },
          ].map((item) => (
            <button
              key={item.platform}
              type="button"
              onClick={() => setPlatform(item.platform)}
              className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
                platform === item.platform
                  ? "border-[#D4450A] bg-[#D4450A]/5"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <span className="text-3xl">{item.icon}</span>
              <div>
                <p
                  className={`text-sm font-bold ${
                    platform === item.platform ? "text-[#D4450A]" : "text-zinc-900"
                  }`}
                >
                  {item.label}
                </p>
                <p className="text-xs text-zinc-500">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Features */}
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-bold text-zinc-900">Why install the app?</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { icon: "⚡", title: "Faster", desc: "Loads instantly — no browser needed" },
              { icon: "📱", title: "Full screen", desc: "No address bar — feels like a native app" },
              { icon: "🔔", title: "Notifications", desc: "Get notified about orders and requests" },
              { icon: "🔒", title: "Secure", desc: "Encrypted with HTTPS on all connections" },
              { icon: "🆓", title: "Free forever", desc: "No app store fees, no subscriptions" },
              { icon: "🔄", title: "Always updated", desc: "Updates automatically — no manual updates" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-4">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="text-sm font-bold text-zinc-900">{item.title}</p>
                  <p className="text-xs text-zinc-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div
          className="mt-10 overflow-hidden rounded-2xl p-8 text-center"
          style={{ background: "linear-gradient(135deg, #1C1C1A 0%, #2A1A0E 100%)" }}
        >
          <p className="font-display text-2xl font-black text-white">Ready to shop local?</p>
          <p className="mt-2 text-sm text-zinc-400">Join thousands of shoppers discovering Trinidad & Tobago vendors</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/shop"
              className="rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
            >
              Browse the shop
            </Link>
            <Link
              href="/register"
              className="rounded-xl border-2 border-white/20 px-6 py-3 text-sm font-bold text-white transition-colors hover:border-white/40"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
