"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useReportWebVitals } from "next/web-vitals";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const configuredMeasurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim();
const measurementId = configuredMeasurementId && /^G-[A-Z0-9]+$/i.test(configuredMeasurementId)
  ? configuredMeasurementId
  : undefined;

export function trackGoogleAnalyticsEvent(name: string, parameters: Record<string, unknown> = {}) {
  if (!measurementId || typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = window.gtag ?? ((...args: unknown[]) => window.dataLayer?.push(args));
  window.gtag("event", name, parameters);
}

function AnalyticsSignals() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!measurementId) return;
    const query = searchParams.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;
    trackGoogleAnalyticsEvent("page_view", {
      page_title: document.title,
      page_location: window.location.href,
      page_path: pagePath,
    });

    const signup = searchParams.get("signup_success");
    if (signup === "customer" || signup === "business") {
      trackGoogleAnalyticsEvent("sign_up", {
        method: searchParams.get("signup_method") === "google" ? "google" : "email",
        account_type: signup,
      });
    }

    if (searchParams.get("store_created") === "1") {
      trackGoogleAnalyticsEvent("vendor_onboarding_complete");
    }

    if (searchParams.get("product_published") === "1") {
      trackGoogleAnalyticsEvent("product_published");
    }

    if (signup || searchParams.has("store_created") || searchParams.has("product_published")) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("signup_success");
      cleanUrl.searchParams.delete("signup_method");
      cleanUrl.searchParams.delete("store_created");
      cleanUrl.searchParams.delete("product_published");
      window.history.replaceState(window.history.state, "", `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
    }
  }, [pathname, searchParams]);

  useReportWebVitals((metric) => trackGoogleAnalyticsEvent(metric.name, {
    value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
    event_label: metric.id,
    non_interaction: true,
  }));
  return null;
}

export default function GoogleAnalytics() {
  if (!measurementId) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="linkwe-google-analytics" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${measurementId}',{send_page_view:false,anonymize_ip:true});`}
      </Script>
      <AnalyticsSignals />
    </>
  );
}
