"use client";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { isCatalogueFixturePath } from "@/lib/storefront/catalogue-preview";
import CartProvider from "@/components/cart/CartProvider";
import FooterWrapper from "@/components/layout/FooterWrapper";
import SiteFooter from "@/components/layout/SiteFooter";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import LinkWeToaster from "@/components/providers/LinkWeToaster";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";
import RouteScrollManager from "@/components/layout/RouteScrollManager";
import AppStartupSplash from "@/components/layout/AppStartupSplash";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import OneSignalProvider from "@/components/notifications/OneSignalProvider";

export default function ApplicationRuntime({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isCatalogueFixturePath(pathname)) return <>{children}</>;
  return <>
    <AppStartupSplash />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "LinkWe", url: "https://www.linkweonlinemall.com", logo: "https://www.linkweonlinemall.com/branding/v2/mark-192.png", slogan: "We People. We Business. We Marketplace.", description: "Trinidad & Tobago's marketplace for local products, services, stores and events." }) }} />
    <ServiceWorkerRegistration /><OneSignalProvider /><RouteScrollManager />
    <Suspense fallback={null}><GoogleAnalytics /></Suspense><InstallPrompt />
    <CartProvider><LinkWeToaster />{children}</CartProvider>
    <FooterWrapper><SiteFooter /></FooterWrapper>
  </>;
}
