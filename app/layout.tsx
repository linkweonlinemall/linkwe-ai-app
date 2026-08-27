import type { Metadata } from "next";
import { Sora } from "next/font/google";

import CartProvider from "@/components/cart/CartProvider";
import FooterWrapper from "@/components/layout/FooterWrapper";
import SiteFooter from "@/components/layout/SiteFooter";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import LinkWeToaster from "@/components/providers/LinkWeToaster";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";

import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LinkWe Online Mall — Shop Local Trinidad & Tobago",
    template: "%s · LinkWe",
  },
  description:
    "Trinidad & Tobago's multi-vendor marketplace. Shop local vendors, book services, discover stores across T&T.",
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
  themeColor: "#D4450A",
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
    title: "LinkWe Online Mall — Shop Local Trinidad & Tobago",
    description:
      "Trinidad & Tobago's multi-vendor marketplace. Shop local vendors, book services, discover stores across T&T.",
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
    title: "LinkWe Online Mall — Shop Local Trinidad & Tobago",
    description: "Trinidad & Tobago's multi-vendor marketplace.",
    images: ["/linkwe-social-share.png"],
  },
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
        <ServiceWorkerRegistration />
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
