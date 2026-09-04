"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReadonlyURLSearchParams } from "next/navigation";
import {
  IconBuildingStore,
  IconCalendarEvent,
  IconChartBar,
  IconClipboardList,
  IconCreditCard,
  IconExternalLink,
  IconLayoutDashboard,
  IconLink,
  IconMessageCircle,
  IconRouteSquare,
  IconPackage,
  IconQrcode,
  IconRefresh,
  IconSettings,
  IconShoppingBag,
  IconStar,
  IconTicket,
  IconTools,
  IconTruck,
  IconUsers,
} from "@tabler/icons-react";

import type { IdVerificationStatus, StoreStatus } from "@prisma/client";

import {
  VENDOR_VENDOR_FINANCE_PATH,
  VENDOR_VENDOR_MESSAGES_PATH,
  VENDOR_VENDOR_ORDERS_PATH,
  VENDOR_VENDOR_REVIEWS_PATH,
} from "@/lib/routes/vendor-dashboard";

type IconType = typeof IconPackage;

function initialsFromStoreName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "LW";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

function isHrefActive(pathname: string, searchParams: ReadonlyURLSearchParams, href: string, exact?: boolean): boolean {
  const u = new URL(href, "http://local.test");
  const wantTab = u.searchParams.get("tab");
  const wantPath = u.pathname;

  if (wantTab != null && wantTab !== "") {
    return pathname === wantPath && searchParams.get("tab") === wantTab;
  }

  if (exact) return pathname === wantPath;

  if (pathname === wantPath) return true;

  return pathname.startsWith(`${wantPath}/`);
}

function storeStatusSubtitle(
  idVerificationStatus: IdVerificationStatus,
  storeStatus: StoreStatus,
): { label: string; dotClass: string } {
  if (idVerificationStatus !== "APPROVED") {
    if (idVerificationStatus === "PENDING") {
      return { label: "Verification pending", dotClass: "bg-amber-400" };
    }
    if (idVerificationStatus === "REJECTED") {
      return { label: "Verification required", dotClass: "bg-red-400" };
    }
    return { label: "Setup in progress", dotClass: "bg-zinc-400" };
  }
  if (storeStatus === "ACTIVE") {
    return { label: "Live on LinkWe", dotClass: "bg-emerald-500" };
  }
  return { label: "Not live yet", dotClass: "bg-amber-400" };
}

export type VendorDashboardSidebarProps = {
  storeName: string;
  storeSlug: string;
  storeLogoUrl: string | null;
  storeStatus: StoreStatus;
  idVerificationStatus: IdVerificationStatus;
  pendingRequestsCount: number;
  activeOrdersCount: number;
};

type NavLeaf = {
  href: string;
  label: string;
  Icon: IconType;
  exact?: boolean;
  badge?: number;
};

function NavSection({
  heading,
  items,
  pathname,
  searchParams,
}: {
  heading: string;
  items: NavLeaf[];
  pathname: string;
  searchParams: ReadonlyURLSearchParams;
}) {
  return (
    <div className="mt-5 first:mt-0 lg:mt-6">
      <p className="hidden px-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30 lg:block">
        {heading}
      </p>
      <div className="mx-4 mb-3 hidden h-px bg-white/10 lg:hidden" aria-hidden />
      <nav className="flex flex-col gap-0.5 px-2 lg:mt-0">
        {items.map((item) => {
          const { Icon } = item;
          const active = isHrefActive(pathname, searchParams, item.href, item.exact);
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              title={item.label}
              className={[
                "group relative mx-2 flex items-center gap-3 rounded-lg border-l-[3px] border-transparent py-[9px] pl-[9px] pr-3 lg:mx-0 lg:gap-3 lg:py-[9px] lg:pl-4 lg:pr-4",
                "text-[13px] transition-colors lg:justify-start",
                "justify-center lg:justify-start",
                active
                  ? "border-l-[#D4450A] bg-[rgba(212,69,10,0.2)] font-medium text-white lg:pl-[13px]"
                  : "text-[rgba(255,255,255,0.6)] hover:bg-white/[0.05] hover:text-white",
              ].join(" ")}
            >
              <Icon className="size-4 shrink-0" stroke={1.5} aria-hidden />
              <span className="hidden min-w-0 flex-1 truncate lg:inline">{item.label}</span>
              {item.badge != null && item.badge > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 min-w-[1.125rem] rounded-full bg-[#D4450A] px-1 text-center text-[9px] font-bold leading-[1.125rem] text-white lg:static lg:ml-auto lg:text-[10px]">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function VendorDashboardSidebar({
  storeName,
  storeSlug,
  storeStatus,
  idVerificationStatus,
  pendingRequestsCount,
  activeOrdersCount,
}: VendorDashboardSidebarProps) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const statusSubtitle = storeStatusSubtitle(idVerificationStatus, storeStatus);

  const MAIN: NavLeaf[] = [
    { href: "/dashboard/vendor", label: "Dashboard", Icon: IconLayoutDashboard, exact: true },
    { href: "/dashboard/vendor/products", label: "Products", Icon: IconPackage },
    { href: "/dashboard/vendor/services", label: "My Services", Icon: IconTools },
    { href: "/dashboard/vendor/events", label: "Events", Icon: IconTicket },
    { href: "/dashboard/vendor/bookings", label: "Bookings", Icon: IconCalendarEvent },
    { href: "/dashboard/vendor/subscribers", label: "Subscribers", Icon: IconRefresh },
    {
      href: "/dashboard/vendor/requests",
      label: "Requests",
      Icon: IconClipboardList,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
    },
  ];

  const STORE: NavLeaf[] = [
    { href: "/dashboard/vendor/store/edit", label: "Store profile", Icon: IconBuildingStore },
    { href: "/dashboard/vendor/qr-studio", label: "QR Studio", Icon: IconQrcode },
    { href: "/dashboard/vendor/partners", label: "Collab", Icon: IconLink },
    { href: "/dashboard/vendor/shipping", label: "Delivery & pickup", Icon: IconTruck },
    { href: "/dashboard/vendor/staff", label: "Availability", Icon: IconUsers },
  ];

  const FINANCE: NavLeaf[] = [
    {
      href: VENDOR_VENDOR_ORDERS_PATH,
      label: "Orders",
      Icon: IconShoppingBag,
      badge: activeOrdersCount > 0 ? activeOrdersCount : undefined,
    },
    { href: VENDOR_VENDOR_FINANCE_PATH, label: "Finance", Icon: IconCreditCard },
    { href: "/dashboard/vendor/reports", label: "Reports", Icon: IconChartBar },
    { href: VENDOR_VENDOR_MESSAGES_PATH, label: "Messages", Icon: IconMessageCircle },
    { href: VENDOR_VENDOR_REVIEWS_PATH, label: "Reviews", Icon: IconStar },
  ];

  return (
    <aside
      className="fixed left-0 top-0 z-[100] hidden h-dvh max-h-dvh w-[220px] flex-col overflow-hidden bg-[#1C1C1A] md:flex md:w-[60px] lg:w-[220px]"
    >
      {/* Top: logo + store — non-scrolling */}
      <div className="shrink-0 pt-5">
        <div className="px-4">
          <Link href="/" className="flex items-start justify-center gap-2 lg:justify-start lg:gap-2.5">
            <img
              src="/linkwe-logo-mark-on-light.png"
              alt=""
              className="size-8 shrink-0 object-contain"
              aria-hidden
            />
            <div className="min-w-0 hidden lg:block">
              <p className="text-[14px] font-semibold leading-tight text-white">LinkWe</p>
              <p className="text-[10px] font-bold uppercase leading-tight tracking-wider text-[#E8820C]">Vendor</p>
            </div>
          </Link>
        </div>

        <div className="mx-4 mt-5 hidden rounded-xl border border-white/10 bg-white/5 px-3 py-3 lg:block">
          <div className="flex items-start gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#D4450A] text-[11px] font-bold text-white">
              {initialsFromStoreName(storeName)}
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="truncate text-[12px] font-medium leading-tight text-white">{storeName}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[10px] text-[rgba(255,255,255,0.55)]">
                <span className="relative inline-flex size-2">
                  <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${statusSubtitle.dotClass}`} />
                  <span className={`relative inline-flex size-2 rounded-full ring-2 ring-[#1C1C1A] ${statusSubtitle.dotClass}`} />
                </span>
                {statusSubtitle.label}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 hidden justify-center lg:hidden md:flex">
          <div className="flex size-9 items-center justify-center rounded-full bg-[#D4450A] text-[11px] font-bold text-white">
            {initialsFromStoreName(storeName)}
          </div>
        </div>
      </div>

      {/* Middle: nav only — scrolls inside sidebar, hidden scrollbar */}
      <div
        className="vendor-sidebar-nav min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="mt-2 pb-2">
          <NavSection heading="Main" items={MAIN} pathname={pathname} searchParams={searchParams} />
          <NavSection heading="Store" items={STORE} pathname={pathname} searchParams={searchParams} />
          <NavSection heading="Finance" items={FINANCE} pathname={pathname} searchParams={searchParams} />
        </div>
      </div>

      {/* Bottom links — pinned */}
      <div
        className="mt-auto flex shrink-0 flex-col border-t border-[rgba(255,255,255,0.08)] px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom,0px))]"
        style={{ borderTopWidth: "0.5px" }}
      >
        <button
          type="button"
          title="Help and feature tutorials"
          onClick={() => window.dispatchEvent(new CustomEvent("vendor-tour:open-library"))}
          className="mb-1 flex items-center justify-center gap-3 rounded-lg bg-[#D4450A]/15 py-2.5 text-[13px] font-semibold text-[#F08A58] transition-colors hover:bg-[#D4450A]/25 hover:text-white lg:justify-start lg:px-3"
        >
          <IconRouteSquare className="size-4 shrink-0" stroke={1.6} aria-hidden />
          <span className="hidden lg:inline">Help &amp; Tutorials</span>
        </button>
        <Link
          href="/dashboard/vendor/settings"
          title="Settings"
          className="flex items-center justify-center gap-3 rounded-lg py-2.5 text-[13px] text-[rgba(255,255,255,0.5)] transition-colors hover:bg-white/[0.05] hover:text-white lg:justify-start lg:px-0"
        >
          <IconSettings className="size-4 shrink-0" stroke={1.5} aria-hidden />
          <span className="hidden lg:inline">Settings</span>
        </Link>
        <Link
          href={`/store/${storeSlug}`}
          data-tour="public-store"
          title="View public store"
          className="flex items-center justify-center gap-3 rounded-lg py-2.5 text-[13px] text-[rgba(255,255,255,0.5)] transition-colors hover:bg-white/[0.05] hover:text-white lg:justify-start lg:px-0"
        >
          <IconExternalLink className="size-4 shrink-0" stroke={1.5} aria-hidden />
          <span className="hidden lg:inline">View public store</span>
        </Link>
      </div>
    </aside>
  );
}
