"use client";

import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  ClipboardList,
  ConciergeBell,
  CreditCard,
  LayoutDashboard,
  MessageCircle,
  Package,
  RefreshCw,
  Settings,
  ShoppingBag,
  Star,
  Store,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  VENDOR_VENDOR_FINANCE_PATH,
  VENDOR_VENDOR_MESSAGES_PATH,
  VENDOR_VENDOR_ORDERS_PATH,
  VENDOR_VENDOR_REVIEWS_PATH,
} from "@/lib/routes/vendor-dashboard";

const SIDEBAR_ITEM =
  "mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-zinc-600 transition-colors duration-150 hover:bg-zinc-50 hover:text-zinc-900";
const SIDEBAR_ITEM_ACTIVE = "bg-[#D4450A]/10 font-medium text-[#D4450A]";

const NAV_ITEMS: { href: string; label: string; Icon: LucideIcon; exact: boolean }[] = [
  { href: "/dashboard/vendor", label: "Dashboard", Icon: LayoutDashboard, exact: true },
  { href: "/dashboard/vendor/products", label: "Products", Icon: Package, exact: false },
  { href: "/dashboard/vendor/services", label: "My Services", Icon: ConciergeBell, exact: false },
  { href: "/dashboard/vendor/bookings", label: "Bookings", Icon: Calendar, exact: false },
  { href: "/dashboard/vendor/subscribers", label: "Subscribers", Icon: RefreshCw, exact: false },
  { href: "/dashboard/vendor/requests", label: "Requests", Icon: ClipboardList, exact: false },
  { href: "/dashboard/vendor/staff", label: "Availability", Icon: Users, exact: false },
  { href: "/dashboard/vendor/store/edit", label: "Store profile", Icon: Store, exact: false },
  { href: VENDOR_VENDOR_ORDERS_PATH, label: "Orders", Icon: ShoppingBag, exact: false },
  { href: VENDOR_VENDOR_FINANCE_PATH, label: "Finance", Icon: CreditCard, exact: false },
  { href: VENDOR_VENDOR_MESSAGES_PATH, label: "Messages", Icon: MessageCircle, exact: false },
  { href: VENDOR_VENDOR_REVIEWS_PATH, label: "Reviews", Icon: Star, exact: false },
  { href: "/dashboard/vendor/settings", label: "Settings", Icon: Settings, exact: false },
];

export default function VendorSidebarWrapper() {
  const pathname = usePathname();

  function isActive(item: (typeof NAV_ITEMS)[0]): boolean {
    if (item.exact) return pathname === item.href;
    if (item.href.includes("?tab=")) return false;
    return pathname.startsWith(item.href);
  }

  return (
    <>
      <aside className="hidden min-h-screen w-56 shrink-0 flex-col border-r border-zinc-100 bg-white pb-6 pt-4 md:flex">
        <div className="mb-4 px-4">
          <Link href="/" className="block">
            <img
              src="/linkwe-logo-on-light.png"
              alt="LinkWe"
              className="h-7 w-auto object-contain"
            />
          </Link>
        </div>
        <div className="mb-2 px-4 py-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Vendor</span>
        </div>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={[SIDEBAR_ITEM, isActive(item) ? SIDEBAR_ITEM_ACTIVE : ""].filter(Boolean).join(" ")}
          >
            <item.Icon className="size-4 shrink-0 stroke-[2] text-current" aria-hidden />
            <span>{item.label}</span>
          </Link>
        ))}
      </aside>

      <nav className="fixed top-0 left-0 right-0 z-40 flex w-full overflow-x-auto whitespace-nowrap border-b border-zinc-200 bg-white md:hidden">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap px-3 py-3 text-sm",
              isActive(item)
                ? "border-b-2 border-[#D4450A] font-medium text-[#D4450A]"
                : "text-zinc-500 hover:text-zinc-800",
            ].join(" ")}
          >
            <item.Icon className="size-4 shrink-0 stroke-[2] text-current" aria-hidden />{" "}
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
