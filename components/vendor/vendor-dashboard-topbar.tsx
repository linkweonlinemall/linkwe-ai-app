"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconPlus, IconRouteSquare } from "@tabler/icons-react";

import MessageNavBadge from "@/components/messages/MessageNavBadge";
import NotificationBell from "@/components/ui/NotificationBell";
import type { TutorialName } from "@/lib/vendor/tutorial-catalog";

const VENDOR_TIME_ZONE = "America/Port_of_Spain";

function formatVendorDate(now: Date) {
  return now.toLocaleDateString("en-TT", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: VENDOR_TIME_ZONE,
  });
}

function vendorHour(now: Date) {
  return Number(
    new Intl.DateTimeFormat("en-TT", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: VENDOR_TIME_ZONE,
    }).format(now),
  );
}

function greetingLine(firstName: string, now: Date) {
  const h = vendorHour(now);
  const label = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${label}, ${firstName}`;
}

/** Mobile spec: "Morning, John" (no leading "Good"). */
function shortGreeting(firstName: string, now: Date) {
  const h = vendorHour(now);
  const word = h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";
  return `${word}, ${firstName}`;
}

export type VendorDashboardTopbarProps = {
  firstName: string;
  unreadCount: number;
  renderedAt: string;
};

export default function VendorDashboardTopbar({
  firstName,
  unreadCount,
  renderedAt,
}: VendorDashboardTopbarProps) {
  const now = new Date(renderedAt);
  const pathname = usePathname() ?? "";
  const pageTour: TutorialName | null =
    pathname === "/dashboard/vendor" ? "essentials" :
    pathname === "/dashboard/vendor/products/new" ? "productSimple" :
    pathname.startsWith("/dashboard/vendor/products") ? "products" :
    pathname === "/dashboard/vendor/services/new" ? "serviceBooking" :
    pathname.startsWith("/dashboard/vendor/services") ? "services" :
    pathname.startsWith("/dashboard/vendor/orders") ? "orders" :
    pathname.startsWith("/dashboard/vendor/bookings") ? "bookings" :
    pathname.startsWith("/dashboard/vendor/subscribers") ? "subscribers" :
    pathname === "/dashboard/vendor/events/new" ? "eventCreate" :
    pathname.startsWith("/dashboard/vendor/events") ? "events" :
    pathname.startsWith("/dashboard/vendor/requests") ? "requests" :
    pathname.startsWith("/dashboard/vendor/store") ? "store" :
    pathname.startsWith("/dashboard/vendor/partners") ? "partners" :
    pathname.startsWith("/dashboard/vendor/staff") ? "staff" :
    pathname.startsWith("/dashboard/vendor/finance") ? "finance" :
    pathname.startsWith("/dashboard/vendor/reports") ? "reports" :
    pathname.startsWith("/dashboard/vendor/messages") ? "messages" :
    pathname.startsWith("/dashboard/vendor/reviews") ? "reviews" :
    pathname.startsWith("/dashboard/vendor/settings") ? "settings" : null;

  return (
    <header
      className="vendor-premium-topbar sticky top-0 z-50 flex h-14 min-w-0 shrink-0 items-center justify-between gap-2 border-b border-black/[0.07] bg-white/95 px-3 backdrop-blur-xl sm:gap-3 sm:px-6"
      style={{ borderBottomWidth: "0.5px", height: "56px" }}
    >
      <div className="hidden min-w-0 sm:block">
        <p className="truncate text-[15px] font-bold tracking-tight text-[#1C1C1A]">{greetingLine(firstName || "there", now)}</p>
        <p className="mt-0.5 hidden truncate text-[11px] text-[#7C7B77] md:block">{formatVendorDate(now)}</p>
      </div>
      <div className="min-w-0 flex-1 sm:hidden">
        <p className="truncate text-[15px] font-bold tracking-tight text-[#1C1C1A]">{shortGreeting(firstName || "there", now)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {pageTour ? (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("vendor-tour:start", { detail: pageTour }))}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D4450A]/20 bg-[#FFF8F4] px-2 text-[11px] font-bold text-[#B83A09] shadow-[inset_0_1px_0_white,0_3px_8px_rgba(28,28,26,.06)] transition hover:bg-[#FFF1E9] sm:px-3"
            aria-label="Tour this page"
          >
            <IconRouteSquare className="size-4" />
            <span className="hidden sm:inline">Tour</span>
          </button>
        ) : null}
        <Link
          href="/"
          className="flex size-8 items-center justify-center rounded-lg border border-black/10 bg-white text-[#6B6A66] shadow-sm transition-colors hover:bg-[#F7F5F2] hover:text-[#D4450A] md:hidden"
          aria-label="Back to LinkWe homepage"
          title="Home"
        >
          <IconHome className="size-[18px]" stroke={1.75} aria-hidden />
        </Link>
        <MessageNavBadge
          href="/dashboard/vendor/messages"
          enabled
          className="relative flex size-8 items-center justify-center rounded-lg border border-black/10 bg-white text-[#6B6A66] shadow-sm transition-colors hover:bg-[#F7F5F2] hover:text-[#D4450A]"
          iconClassName="size-[18px] shrink-0"
        />
        <div className="flex size-8 items-center justify-center rounded-lg border border-black/10 bg-white shadow-sm">
          <NotificationBell compactToolbar initialUnreadCount={unreadCount} variant="light" />
        </div>
        <Link
          href="/dashboard/vendor/products/new"
          className="inline-flex size-8 items-center justify-center whitespace-nowrap rounded-lg bg-gradient-to-b from-[#F06A2A] to-[#D4450A] text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.3),0_5px_12px_rgba(212,69,10,.2)] hover:brightness-105 sm:h-auto sm:w-auto sm:px-4 sm:py-2"
          aria-label="Add product"
        >
          <IconPlus className="size-[18px] sm:hidden" stroke={2} aria-hidden />
          <span className="hidden sm:inline">Add product</span>
        </Link>
          <Link
            href="/dashboard/vendor/reports"
            className="hidden items-center justify-center whitespace-nowrap rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#343330] shadow-sm hover:bg-[#F8F7F5] md:inline-flex"
          >
            Reports
          </Link>
      </div>
    </header>
  );
}
