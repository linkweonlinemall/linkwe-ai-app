"use client";

import Script from "next/script";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useReportWebVitals } from "next/web-vitals";
import { EVENT_NAMES, safeLabel, safePath, type CleanEvent, type EventName } from "@/lib/analytics/model";

declare global { interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; } }
const configured = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim();
const measurementId = configured && /^G-[A-Z0-9]+$/i.test(configured) ? configured : undefined;
let active = false;
let googleStarted = false;
let queue: CleanEvent[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
const post = (body: unknown) => fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true }).then(response => { if (!response.ok) throw new Error("Analytics unavailable"); return response.json(); });
function flush() {
  if (timer) clearTimeout(timer);
  timer = undefined;
  if (!active || !queue.length) return;
  const events = queue.splice(0, 20);
  void post({ events }).catch(() => { /* Never interrupt a customer's task. */ });
}
export function analyticsEnabled() { return active; }
export function trackGoogleAnalyticsEvent(name: string, parameters: Record<string, unknown> = {}) {
  if (!active || typeof window === "undefined") return;
  const path = safePath(window.location.pathname);
  if (!path) return;
  const item = Array.isArray(parameters.items) ? parameters.items[0] as Record<string, unknown> : null;
  const label = safeLabel(parameters.label ?? parameters.search_term ?? parameters.error_code ?? parameters.method);
  if (EVENT_NAMES.includes(name as EventName)) {
    queue.push({ occurredAt: Date.now(), id: crypto.randomUUID(), name: name as EventName, path, entityId: String(parameters.entity_id ?? item?.item_id ?? "") || null, label, value: typeof parameters.value === "number" ? parameters.value : typeof parameters.result_count === "number" ? parameters.result_count : null });
    if (queue.length >= 20) flush(); else if (!timer) timer = setTimeout(flush, 700);
  }
  if (measurementId) {
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = window.gtag ?? ((...args: unknown[]) => window.dataLayer?.push(args));
    // Forward only deliberately selected, non-personal fields. Raw URLs, titles,
    // errors, search strings and arbitrary caller properties never reach GA.
    const safe: Record<string, unknown> = { page_location: `${window.location.origin}${path}`, page_path: path, page_title: path === "/" ? "LinkWe" : path.split("/")[1] };
    if (label) safe.event_label = label;
    if (typeof parameters.value === "number") safe.value = parameters.value;
    if (parameters.currency === "TTD") safe.currency = "TTD";
    if (typeof parameters.transaction_id === "string" && /^[\w-]{1,100}$/.test(parameters.transaction_id)) safe.transaction_id = parameters.transaction_id;
    if (Array.isArray(parameters.items)) safe.items = parameters.items.slice(0, 100).map((raw: Record<string, unknown>) => ({ item_id: String(raw.item_id ?? "").replace(/[^\w-]/g, "").slice(0, 100), quantity: Number(raw.quantity) || 1, ...(typeof raw.price === "number" ? { price: raw.price } : {}) }));
    window.gtag("event", name, safe);
  }
}
export function AnalyticsSignal({ name, label, value, entityId }: { name: EventName; label?: string; value?: number; entityId?: string }) {
  const pathname = usePathname();
  useEffect(() => {
    let sent = false;
    const send = () => { if (!sent && active) { sent = true; trackGoogleAnalyticsEvent(name, { label, value, entity_id: entityId }); } };
    send(); window.addEventListener("linkwe:analytics-ready", send);
    return () => window.removeEventListener("linkwe:analytics-ready", send);
  }, [name, label, value, entityId, pathname]);
  return null;
}
export function AnalyticsPreferencesButton() {
  return <button type="button" onClick={() => window.dispatchEvent(new Event("linkwe:analytics-preferences"))} className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold">Change analytics preferences</button>;
}
export default function GoogleAnalytics() {
  const pathname = usePathname(), params = useSearchParams();
  const [consent, setConsent] = useState("loading"), [eligible, setEligible] = useState(false), [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const lastPage = useRef("");
  useEffect(() => {
    flush(); active = false; setReady(false); setEligible(false);
    if (measurementId) (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = true;
    let cancelled = false;
    void fetch("/api/analytics", { cache: "no-store" }).then(r => r.json()).then(data => {
      if (!cancelled) { setEligible(data.eligible === true); setConsent(data.consent); if (data.eligible && data.consent === "unset") setOpen(true); }
    }).catch(() => {});
    const preferences = () => setOpen(true);
    window.addEventListener("linkwe:analytics-preferences", preferences);
    const hide = () => { if (document.hidden) flush(); };
    document.addEventListener("visibilitychange", hide);
    return () => { cancelled = true; flush(); active = false; queue = []; window.removeEventListener("linkwe:analytics-preferences", preferences); document.removeEventListener("visibilitychange", hide); };
  }, [pathname]);
  useEffect(() => {
    if (!eligible || consent !== "accepted" || !safePath(pathname)) { active = false; return; }
    let cancelled = false;
    let referrer = "direct";
    try { const url = new URL(document.referrer); if (url.hostname !== window.location.hostname) referrer = url.hostname; } catch {}
    void post({ action: "start", source: params.get("utm_source") || referrer, medium: params.get("utm_medium"), campaign: params.get("utm_campaign") }).then(result => {
      if (cancelled || !result.accepted) return;
      active = true; setReady(true);
      if (measurementId && !googleStarted) {
        googleStarted = true;
        window.dataLayer = window.dataLayer ?? [];
        window.gtag = window.gtag ?? ((...args: unknown[]) => window.dataLayer?.push(args));
        window.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
        window.gtag("js", new Date());
        window.gtag("config", measurementId, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, page_location: window.location.origin + safePath(pathname), page_referrer: "", page_title: "LinkWe" });
      }
      if (measurementId) (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = false;
      const key = `${pathname}?${params}`;
      if (lastPage.current !== key) {
        lastPage.current = key;
        trackGoogleAnalyticsEvent("page_view");
        if (/^\/(product|products|service|services|events)\/[^/]+$/.test(pathname)) trackGoogleAnalyticsEvent("view_item");
        if (/^\/store\/[^/]+$/.test(pathname)) trackGoogleAnalyticsEvent("view_store");
        if (pathname === "/checkout") trackGoogleAnalyticsEvent("begin_checkout");
        if (["customer", "business"].includes(params.get("signup_success") || "")) trackGoogleAnalyticsEvent("sign_up", { label: params.get("signup_success") });
      }
      window.dispatchEvent(new Event("linkwe:analytics-ready"));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [consent, eligible, pathname, params]);
  useEffect(() => {
    const click = (event: MouseEvent) => {
      const anchor = (event.target as Element)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      let channel: string | null = null;
      try {
        const url = new URL(anchor.href);
        if (url.protocol === "tel:") channel = "phone";
        else if (url.protocol === "mailto:") channel = "email";
        else if (["wa.me", "api.whatsapp.com"].includes(url.hostname)) channel = "whatsapp";
        else if (/^(maps\.google\.|maps\.apple\.)/.test(url.hostname) || (url.hostname === "www.google.com" && url.pathname.startsWith("/maps"))) channel = "directions";
        else if (url.origin === location.origin && /\/(messages|chat)(\/|$)/.test(url.pathname)) channel = "message";
      } catch {}
      if (channel) { trackGoogleAnalyticsEvent("contact_click", { label: channel }); flush(); }
    };
    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, []);
  useReportWebVitals(metric => { if (["LCP", "INP", "CLS"].includes(metric.name)) trackGoogleAnalyticsEvent("web_vital", { label: metric.name, value: metric.value }); });
  async function choose(accepted: boolean) {
    setBusy(true); setError("");
    try {
      await post({ action: "consent", accepted });
      setConsent(accepted ? "accepted" : "declined"); setOpen(false);
      if (!accepted) {
        active = false; queue = []; setReady(false);
        if (measurementId) (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = true;
        window.gtag?.("consent", "update", { analytics_storage: "denied" });
        for (const cookie of document.cookie.split(";")) {
          const name = cookie.trim().split("=")[0];
          if (name === "_ga" || name.startsWith("_ga_")) {
            document.cookie = `${name}=; Max-Age=0; path=/`;
            const labels = location.hostname.split(".");
            for (let i = 0; i < labels.length - 1; i++) document.cookie = `${name}=; Max-Age=0; path=/; domain=.${labels.slice(i).join(".")}`;
          }
        }
      } else if (measurementId) {
        (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = false;
        window.gtag?.("consent", "update", { analytics_storage: "granted" });
      }
    } catch { setError("Your preference could not be saved. Please try again."); }
    finally { setBusy(false); }
  }
  return <>
    {ready && measurementId && consent === "accepted" && <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
    </>}
    {open && <section role="dialog" aria-label="Analytics preferences" className="fixed bottom-24 left-4 right-4 z-[70] mx-auto max-w-xl rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-xl">
      <h2 className="text-base font-bold">Help us make LinkWe easier to use</h2><p className="mt-2 text-sm leading-6">Allow optional analytics to measure visits, searches and how people use LinkWe. We keep private messages, passwords and payment details out. Your choice won’t affect shopping. <Link href="/cookies" className="underline">Learn more</Link></p>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-3"><button disabled={busy} onClick={() => void choose(false)} className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold">Decline analytics</button><button disabled={busy} onClick={() => void choose(true)} className="rounded-xl bg-[#17576b] px-4 py-2.5 text-sm font-semibold text-white">Allow analytics</button>{consent !== "unset" && <button onClick={() => setOpen(false)} className="px-3 text-sm">Close</button>}</div>
    </section>}
  </>;
}
