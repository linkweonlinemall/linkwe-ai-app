"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { workspaceGroups, workspaceLinkActive } from "./dashboard-navigation";
import s from "./workspace.module.css";
import { usePathname, useSearchParams } from "next/navigation";
import { IconHome, IconPlus, IconRouteSquare } from "@tabler/icons-react";
import { CalendarDays, ChevronDown, ConciergeBell, Package, Ticket, Tag, Layers3 } from "lucide-react";

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
  const searchParams=useSearchParams();
  const creationType=searchParams.get("type");
  const currentPage = workspaceGroups.flatMap(group => group.items).find(item => workspaceLinkActive(pathname, item.path))?.label ?? "Workspace";
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!addMenu.current?.contains(event.target as Node)) addMenu.current?.removeAttribute("open"); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && addMenu.current?.open) { addMenu.current.removeAttribute("open"); addMenu.current.querySelector("summary")?.focus(); } };
    document.addEventListener("click", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", escape); };
  }, []);
  useEffect(() => { addMenu.current?.removeAttribute("open"); }, [pathname, searchParams]);
  const pageTour: TutorialName | null =
    pathname.startsWith("/dashboard/vendor/photo-studio") ? "photoStudio" :
    pathname.startsWith("/dashboard/vendor/qr-studio") ? "qrStudio" :
    pathname.startsWith("/dashboard/vendor/ai-assistant") ? "rex" :
    pathname.startsWith("/dashboard/vendor/shipping") ? "shipping" :
    pathname.startsWith("/dashboard/vendor/service-desk") ? "serviceDesk" :
    pathname === "/dashboard/vendor" ? "essentials" :
    pathname === "/dashboard/vendor/creation/new" && creationType === "product" ? "productSimple" :
    pathname.startsWith("/dashboard/vendor/products") ? "products" :
    pathname === "/dashboard/vendor/creation/new" && creationType === "service" ? "serviceBooking" :
    pathname.startsWith("/dashboard/vendor/services") ? "services" :
    pathname.startsWith("/dashboard/vendor/orders") ? "orders" :
    pathname.startsWith("/dashboard/vendor/bookings") ? "bookings" :
    pathname.startsWith("/dashboard/vendor/subscribers") ? "subscribers" :
    pathname === "/dashboard/vendor/creation/new" && creationType === "event" ? "eventCreate" :
    pathname.startsWith("/dashboard/vendor/events") ? "events" :
    pathname.startsWith("/dashboard/vendor/creation") ? "creationZone" :
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
          <summary className="inline-flex size-10 cursor-pointer list-none items-center justify-center whitespace-nowrap rounded-lg bg-gradient-to-b from-[#F06A2A] to-[#D4450A] text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.3),0_5px_12px_rgba(212,69,10,.2)] hover:brightness-105 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-4 sm:py-2" aria-label="Create a product, service, event, ticket or coupon">
            <IconPlus className="size-[18px]" stroke={2} aria-hidden />
            <span className="hidden sm:inline">Create</span>
            <ChevronDown className="hidden size-3.5 transition group-open:rotate-180 sm:block" aria-hidden />
          </summary>
          <nav className={s.createDropdown} aria-label="Create and manage">
            <p className={s.createDropdownHeading}>MAKE SOMETHING NEW</p>
            {[
              { href: "/dashboard/vendor/creation/new?type=product", label: "Add product", detail: "Something to sell", icon: Package },
              { href: "/dashboard/vendor/creation/new?type=service", label: "Add service", detail: "Your skills, bookable", icon: ConciergeBell },
              { href: "/dashboard/vendor/creation/new?type=event", label: "Add event", detail: "Bring people together", icon: CalendarDays },
              { href: "/dashboard/vendor/creation/new?type=ticket", label: "Add tickets", detail: "Tickets for your event", icon: Ticket },
              { href: "/dashboard/vendor/creation/coupons", label: "Coupons", detail: "Give customers a little extra", icon: Tag },
            ].map(({ href, label, detail, icon: Icon }) => (
              <Link key={href} href={href} className={s.createDropdownItem}>
                <span className={s.createDropdownIcon}><Icon size={18} aria-hidden /></span>
                <span><strong>{label}</strong><small>{detail}</small></span>
              </Link>
            ))}
            <Link href="/dashboard/vendor/creation" className={s.createDropdownFooter}><Layers3 size={18} aria-hidden /><span>Open Creation Zone</span><span aria-hidden>↗</span></Link>
          </nav>
        </details>

      </div>
    </header>
  );
}
