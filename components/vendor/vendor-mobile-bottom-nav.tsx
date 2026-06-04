"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import {
  IconBolt,
  IconBuildingStore,
  IconCalendarEvent,
  IconClock,
  IconCoin,
  IconDots,
  IconHome,
  IconLayoutDashboard,
  IconLayoutList,
  IconLogout,
  IconMessageCircle,
  IconPackage,
  IconSettings,
  IconShoppingBag,
  IconStar,
  IconTicket,
  IconTools,
} from "@tabler/icons-react";

import { logoutAction } from "@/app/(auth)/auth-actions";

const SCARLET = "#D4450A";

type TablerIcon = typeof IconTools;

type MoreNavItem = {
  href: string;
  label: string;
  Icon: TablerIcon;
  exact?: boolean;
};

const MORE_ITEMS: MoreNavItem[] = [
  { href: "/dashboard/vendor/services", label: "My Services", Icon: IconTools },
  { href: "/dashboard/vendor/bookings", label: "Bookings", Icon: IconCalendarEvent },
  { href: "/dashboard/vendor/events", label: "Events", Icon: IconTicket },
  { href: "/dashboard/vendor/requests", label: "Requests", Icon: IconBolt },
  { href: "/dashboard/vendor/staff", label: "Staff/Availability", Icon: IconClock },
  { href: "/dashboard/vendor?tab=store", label: "Store", Icon: IconBuildingStore },
  { href: "/dashboard/vendor?tab=listings", label: "Listings", Icon: IconLayoutList },
  { href: "/dashboard/vendor/finance", label: "Finance", Icon: IconCoin },
  { href: "/dashboard/vendor?tab=reviews", label: "Reviews", Icon: IconStar },
  { href: "/dashboard/vendor/settings", label: "Settings", Icon: IconSettings },
  { href: "/", label: "Home", Icon: IconHome, exact: true },
];

function activeStyle(on: boolean) {
  return on ? "text-[#D4450A]" : "text-[#7c7b77]";
}

function isHrefActive(
  pathname: string,
  searchParams: ReadonlyURLSearchParams,
  href: string,
  exact?: boolean,
): boolean {
  const u = new URL(href, "http://local.test");
  const wantTab = u.searchParams.get("tab");
  const wantPath = u.pathname;

  if (wantTab != null && wantTab !== "") {
    if (pathname === wantPath && searchParams.get("tab") === wantTab) return true;
    if (wantTab === "reviews" && pathname.startsWith("/dashboard/vendor/reviews")) return true;
    if (wantTab === "store" && pathname.startsWith("/dashboard/vendor/store")) return true;
    if (wantTab === "listings" && pathname.startsWith("/dashboard/vendor/listings")) return true;
    return false;
  }

  if (exact) return pathname === wantPath;
  if (pathname === wantPath) return true;
  return pathname.startsWith(`${wantPath}/`);
}

function isMoreSectionActive(pathname: string, searchParams: ReadonlyURLSearchParams): boolean {
  return MORE_ITEMS.some((item) => isHrefActive(pathname, searchParams, item.href, item.exact));
}

function VendorMoreSheet({
  open,
  onClose,
  pathname,
  searchParams,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  searchParams: ReadonlyURLSearchParams;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[110] bg-[rgba(0,0,0,0.5)] md:hidden"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="fixed inset-x-0 bottom-0 z-[111] max-h-[min(85vh,520px)] overflow-y-auto rounded-t-2xl bg-white pb-[calc(env(safe-area-inset-bottom,0px)+16px)] shadow-[0_-8px_32px_rgba(0,0,0,0.12)] md:hidden"
      >
        <div className="flex justify-center pt-3 pb-1">
          <span className="h-1 w-10 rounded-full bg-[rgba(28,28,26,0.15)]" aria-hidden />
        </div>

        <p className="px-4 pb-3 text-center text-[13px] font-medium text-[#1C1C1A]">Menu</p>

        <div className="grid grid-cols-3 gap-2 px-4">
          {MORE_ITEMS.map((item) => {
            const active = isHrefActive(pathname, searchParams, item.href, item.exact);
            const { Icon } = item;
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                onClick={onClose}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 transition-colors ${
                  active ? "bg-[#FEF0EB]" : "hover:bg-[#F7F7F6]"
                }`}
              >
                <Icon className="size-[22px] shrink-0" style={{ color: SCARLET }} stroke={1.75} aria-hidden />
                <span
                  className={`text-center text-[10px] leading-tight ${
                    active ? "font-semibold text-[#D4450A]" : "font-medium text-[#1C1C1A]"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        <form action={logoutAction} className="mt-4 px-4">
          <button
            type="submit"
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border text-[13px] font-semibold transition-colors hover:bg-[#FEF0EB]"
            style={{ borderColor: SCARLET, color: SCARLET }}
            onClick={onClose}
          >
            <IconLogout className="size-[18px]" stroke={1.75} aria-hidden />
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}

export default function VendorMobileBottomNav() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const [moreOpen, setMoreOpen] = useState(false);

  const closeMore = useCallback(() => setMoreOpen(false), []);

  const tab = searchParams.get("tab");

  const dash = pathname === "/dashboard/vendor" && !tab;
  const products = pathname.startsWith("/dashboard/vendor/products");
  const orders = pathname.startsWith("/dashboard/vendor/orders");
  const messages = pathname.startsWith("/dashboard/vendor/messages");
  const more = moreOpen || isMoreSectionActive(pathname, searchParams);

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-[101] grid grid-cols-5 border-t border-[rgba(28,28,26,0.12)] bg-white pb-safe pt-2 md:hidden"
        aria-label="Vendor navigation"
      >
        <Link
          href="/dashboard/vendor"
          className={`flex flex-col items-center gap-1 py-2 text-[10px] font-medium ${activeStyle(dash)}`}
        >
          <IconLayoutDashboard className="size-5" stroke={1.75} aria-hidden />
          Dashboard
        </Link>
        <Link
          href="/dashboard/vendor/products"
          className={`flex flex-col items-center gap-1 py-2 text-[10px] font-medium ${activeStyle(products)}`}
        >
          <IconPackage className="size-5" stroke={1.75} aria-hidden />
          Products
        </Link>
        <Link
          href="/dashboard/vendor/orders"
          className={`flex flex-col items-center gap-1 py-2 text-[10px] font-medium ${activeStyle(orders)}`}
        >
          <IconShoppingBag className="size-5" stroke={1.75} aria-hidden />
          Orders
        </Link>
        <Link
          href="/dashboard/vendor/messages"
          className={`flex flex-col items-center gap-1 py-2 text-[10px] font-medium ${activeStyle(messages)}`}
        >
          <IconMessageCircle className="size-5" stroke={1.75} aria-hidden />
          Messages
        </Link>
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center gap-1 py-2 text-[10px] font-medium ${activeStyle(more)}`}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
        >
          <IconDots className="size-5" stroke={1.75} aria-hidden />
          More
        </button>
      </nav>

      <VendorMoreSheet
        open={moreOpen}
        onClose={closeMore}
        pathname={pathname}
        searchParams={searchParams}
      />
    </>
  );
}
