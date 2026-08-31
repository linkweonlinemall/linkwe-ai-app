import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";

import CartProvider from "@/components/cart/CartProvider";
import FooterWrapper from "@/components/layout/FooterWrapper";
import SiteFooter from "@/components/layout/SiteFooter";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import LinkWeToaster from "@/components/providers/LinkWeToaster";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";
import RouteScrollManager from "@/components/layout/RouteScrollManager";

import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LinkWe — We People. We Business. We Marketplace.",
    template: "%s · LinkWe",
  },
  description:
    "We People. We Business. We Marketplace. Shop local vendors, book services, and discover stores and events across Trinidad & Tobago on LinkWe.",
  keywords: ["Trinidad", "Tobago", "marketplace", "shop local", "vendors", "services"],
  authors: [{ name: "LinkWe Online Directory" }],
  creator: "LinkWe Online Directory",
  metadataBase: new URL("https://www.linkweonlinemall.com"),
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" }],
    shortcut: "/favicon-48x48.png",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LinkWe Online Mall",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_TT",
    url: "https://www.linkweonlinemall.com",
    siteName: "LinkWe Online Mall",
    title: "LinkWe — We People. We Business. We Marketplace.",
    description:
      "We People. We Business. We Marketplace. Shop local vendors, services, stores and events across Trinidad & Tobago.",
    images: [
      {
        url: "/linkwe-social-share.png",
        width: 1200,
        height: 630,
        alt: "LinkWe Online Mall",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkWe — We People. We Business. We Marketplace.",
    description: "We People. We Business. We Marketplace. Discover local products, services, stores and events across Trinidad & Tobago.",
    images: ["/linkwe-social-share.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#D4450A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} h-full antialiased`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
  window.__pwaInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    window.__pwaInstallPrompt = e;
  });
`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "LinkWe", url: "https://www.linkweonlinemall.com", logo: "https://www.linkweonlinemall.com/linkwe-logo-mark-on-light.png", slogan: "We People. We Business. We Marketplace.", description: "Trinidad & Tobago's marketplace for local products, services, stores and events." }) }} />
        <ServiceWorkerRegistration />
        <RouteScrollManager />
        <InstallPrompt />
        <CartProvider>
          <LinkWeToaster />
          {children}
        </CartProvider>
        <FooterWrapper>
          <SiteFooter />
        </FooterWrapper>
      </body>
    </html>
  );
}
