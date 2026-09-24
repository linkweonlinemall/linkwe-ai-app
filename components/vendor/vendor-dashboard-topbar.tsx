"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { workspaceGroups, workspaceLinkActive } from "./dashboard-navigation";
import s from "./workspace.module.css";
import { usePathname } from "next/navigation";
import { IconHome, IconPlus, IconRouteSquare } from "@tabler/icons-react";
import { CalendarDays, ChevronDown, ConciergeBell, Package } from "lucide-react";

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
  const addMenu = useRef<HTMLDetailsElement>(null);
  const now = new Date(renderedAt);
  const pathname = usePathname() ?? "";
  const currentPage = workspaceGroups.flatMap(group => group.items).find(item => workspaceLinkActive(pathname, item.path))?.label ?? "Workspace";
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!addMenu.current?.contains(event.target as Node)) addMenu.current?.removeAttribute("open"); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && addMenu.current?.open) { addMenu.current.removeAttribute("open"); addMenu.current.querySelector("summary")?.focus(); } };
    document.addEventListener("click", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", escape); };
  }, []);
  useEffect(() => { addMenu.current?.removeAttribute("open"); }, [pathname]);
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
    <header className={s.topbar}>
      <div className={s.topbarTitle}>
        <p>{currentPage}</p>
        <small>{greetingLine(firstName || "there", now)} <span>· {formatVendorDate(now)}</span></small>
      </div>
      <div className={s.topbarActions}>
        <button type="button" className={s.topbarSearch} aria-label="Search dashboard" aria-haspopup="dialog" onClick={() => window.dispatchEvent(new CustomEvent("vendor-workspace:open-menu"))}><Search size={18}/><span>Find a tool…</span></button>
        {pageTour ? (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("vendor-tour:start", { detail: pageTour }))}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#D4450A]/20 bg-[#FFF8F4] px-2 text-[11px] font-bold text-[#B83A09] shadow-[inset_0_1px_0_white,0_3px_8px_rgba(28,28,26,.06)] transition hover:bg-[#FFF1E9] sm:px-3"
            aria-label="Tour this page"
          >
            <IconRouteSquare className="size-4" />
            <span className="hidden sm:inline">Tour</span>
          </button>
        ) : null}
        <Link
          href="/"
          className="flex size-10 items-center justify-center rounded-lg border border-black/10 bg-white text-[#6B6A66] shadow-sm transition-colors hover:bg-[#F7F5F2] hover:text-[#D4450A] md:hidden"
          aria-label="Back to LinkWe homepage"
          title="Home"
        >
          <IconHome className="size-[18px]" stroke={1.75} aria-hidden />
        </Link>
        <MessageNavBadge
          href="/dashboard/vendor/messages"
          enabled
          className="relative flex size-10 items-center justify-center rounded-lg border border-black/10 bg-white text-[#6B6A66] shadow-sm transition-colors hover:bg-[#F7F5F2] hover:text-[#D4450A]"
          iconClassName="size-[18px] shrink-0"
        />
        <div className="flex size-10 items-center justify-center rounded-lg border border-black/10 bg-white shadow-sm">
          <NotificationBell compactToolbar initialUnreadCount={unreadCount} variant="light" />
        </div>
        <details ref={addMenu} className="group relative">
          <summary className="inline-flex size-10 cursor-pointer list-none items-center justify-center whitespace-nowrap rounded-lg bg-gradient-to-b from-[#F06A2A] to-[#D4450A] text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.3),0_5px_12px_rgba(212,69,10,.2)] hover:brightness-105 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-4 sm:py-2" aria-label="Add product, service or event">
            <IconPlus className="size-[18px]" stroke={2} aria-hidden />
            <span className="hidden sm:inline">Create</span>
            <ChevronDown className="hidden size-3.5 transition group-open:rotate-180 sm:block" aria-hidden />
          </summary>
          <div className="absolute right-0 top-[calc(100%+.55rem)] z-[80] w-56 overflow-hidden rounded-2xl border border-orange-100 bg-white p-2 shadow-[0_18px_55px_rgba(28,28,26,.20)]">
            <Link href="/dashboard/vendor/products/new" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-zinc-800 hover:bg-orange-50 hover:text-[#D4450A]"><span className="flex size-9 items-center justify-center rounded-xl bg-orange-100 text-[#D4450A]"><Package className="size-4" /></span>Add product</Link>
            <Link href="/dashboard/vendor/services/new" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-zinc-800 hover:bg-amber-50 hover:text-amber-700"><span className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><ConciergeBell className="size-4" /></span>Add service</Link>
            <Link href="/dashboard/vendor/events/new" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-zinc-800 hover:bg-rose-50 hover:text-rose-700"><span className="flex size-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700"><CalendarDays className="size-4" /></span>Add event</Link>
          </div>
        </details>

      </div>
    </header>
  );
}
