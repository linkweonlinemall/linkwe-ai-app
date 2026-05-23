import type { Metadata } from "next";
import { Playfair_Display, Sora } from "next/font/google";

import CartProvider from "@/components/cart/CartProvider";
import FooterWrapper from "@/components/layout/FooterWrapper";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";

import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  style: ["normal", "italic"],
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
        url: "/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "LinkWe Online Mall",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "LinkWe Online Mall — Shop Local Trinidad & Tobago",
    description: "Trinidad & Tobago's multi-vendor marketplace.",
    images: ["/icon-512x512.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegistration />
        <InstallPrompt />
        <CartProvider>{children}</CartProvider>
        <FooterWrapper>
          <footer className="border-t border-zinc-200 bg-white py-8 pb-16 sm:pb-0">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                <p className="text-xs text-zinc-400">
                  © {new Date().getFullYear()} LinkWe Online Directory. All rights reserved.
                </p>
                <div className="flex items-center gap-6">
                  <a href="/privacy" className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
                    Privacy Policy
                  </a>
                  <a href="/terms" className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
                    Terms of Service
                  </a>
                  <a href="/contact" className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
                    Contact
                  </a>
                  <a href="/get-app" className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
                    Get the app
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </FooterWrapper>
      </body>
    </html>
  );
}
