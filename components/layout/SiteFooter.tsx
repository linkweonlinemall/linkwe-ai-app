import Link from "next/link";
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconDownload,
} from "@tabler/icons-react";

const SCARLET = "#D4450A";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  const linkClass =
    "block rounded px-1 py-[4px] text-[12px] text-[rgba(255,255,255,0.6)] transition-colors hover:text-white";

  return (
    <footer className="border-t-[0.5px] border-white/[0.08] pb-mobile-public lg:pb-0" style={{ backgroundColor: "#1C1C1A" }}>
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-8 sm:px-8 lg:px-10">
        <div className="pt-2">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl font-black text-white"
              style={{ backgroundColor: SCARLET }}
              aria-hidden
            >
              L
            </span>
            <div>
              <p className="text-[17px] font-bold text-white">LinkWe</p>
              <p className="mt-1 text-[11px] leading-snug text-[rgba(255,255,255,0.4)]">
                Trinidad & Tobago&apos;s local marketplace
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border-[0.5px] border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] px-4 py-3.5 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div>
              <p className="text-[12px] font-semibold text-white">Get the app</p>
              <p className="mt-0.5 text-[10px] text-[rgba(255,255,255,0.4)]">iPhone · Android · Desktop</p>
            </div>
            <Link
              href="/get-app"
              className="mt-3 inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] px-5 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-92 sm:mt-0"
              style={{ backgroundColor: SCARLET }}
            >
              <IconDownload className="size-4" stroke={1.75} aria-hidden />
              Install free
            </Link>
          </div>
        </div>

        <nav className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4" aria-label="Footer">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white">Shop</p>
            <ul className="mt-3 flex flex-col gap-1">
              <li><Link href="/shop" className={linkClass}>All products</Link></li>
              <li><Link href="/services" className={linkClass}>All services</Link></li>
              <li><Link href="/stores" className={linkClass}>Browse stores</Link></li>
              <li><Link href="/events" className={linkClass}>Events</Link></li>
              <li><Link href="/shipping-info" className={linkClass}>Shipping</Link></li>
              <li><Link href="/returns" className={linkClass}>Returns</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white">Sell</p>
            <ul className="mt-3 flex flex-col gap-1">
              <li><Link href="/register?role=vendor" className={linkClass}>Become a vendor</Link></li>
              <li><Link href="/dashboard/vendor" className={linkClass}>Vendor dashboard</Link></li>
              <li><Link href="/dashboard/vendor/services/new" className={linkClass}>List a service</Link></li>
              <li><Link href="/pricing" className={linkClass}>Pricing</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white">Company</p>
            <ul className="mt-3 flex flex-col gap-1">
              <li><Link href="/about" className={linkClass}>About LinkWe</Link></li>
              <li><Link href="/faq" className={linkClass}>FAQ</Link></li>
              <li><Link href="/contact" className={linkClass}>Contact us</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white">Legal</p>
            <ul className="mt-3 flex flex-col gap-1">
              <li><Link href="/privacy" className={linkClass}>Privacy policy</Link></li>
              <li><Link href="/terms" className={linkClass}>Terms of use</Link></li>
              <li><Link href="/privacy" className={linkClass}>Cookie policy</Link></li>
            </ul>
          </div>
        </nav>

        <div className="mt-8 flex flex-col gap-4 border-t-[0.5px] border-[rgba(255,255,255,0.08)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-[10px] text-[rgba(255,255,255,0.3)] sm:text-left">
            © {year} LinkWe. All rights reserved.
          </p>
          <div className="flex items-center justify-center gap-2 sm:justify-end">
            <a
              href="https://www.instagram.com/linkweonlinemall"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-[28px] w-[28px] items-center justify-center rounded-[7px] bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.7)] transition-colors hover:bg-[#D4450A] hover:text-white"
              aria-label="Instagram"
            >
              <IconBrandInstagram className="size-4" stroke={1.75} aria-hidden />
            </a>
            <a
              href="https://www.facebook.com/linkweonlinemall"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-[28px] w-[28px] items-center justify-center rounded-[7px] bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.7)] transition-colors hover:bg-[#D4450A] hover:text-white"
              aria-label="Facebook"
            >
              <IconBrandFacebook className="size-4" stroke={1.75} aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
