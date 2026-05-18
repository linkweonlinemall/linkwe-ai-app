"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SIDEBAR_ITEM =
  "mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-zinc-600 transition-colors duration-150 hover:bg-zinc-50 hover:text-zinc-900";
const SIDEBAR_ITEM_ACTIVE = "bg-[#D4450A]/10 font-medium text-[#D4450A]";

const NAV_ITEMS = [
  { href: "/dashboard/vendor", label: "Dashboard", icon: "⚡", exact: true },
  { href: "/dashboard/vendor/products", label: "Products", icon: "📦", exact: false },
  { href: "/dashboard/vendor/services", label: "My Services", icon: "🛎️", exact: false },
  { href: "/dashboard/vendor/bookings", label: "Bookings", icon: "🗓️", exact: false },
  { href: "/dashboard/vendor/requests", label: "Requests", icon: "⚡", exact: false },
  { href: "/dashboard/vendor/staff", label: "Staff", icon: "👥", exact: false },
  { href: "/dashboard/vendor?tab=store", label: "Store", icon: "🏪", exact: false },
  { href: "/dashboard/vendor?tab=listings", label: "Listings", icon: "📋", exact: false },
  { href: "/dashboard/vendor?tab=orders", label: "Orders", icon: "🛍️", exact: false },
  { href: "/dashboard/vendor?tab=finance", label: "Finance", icon: "💳", exact: false },
  { href: "/dashboard/vendor?tab=messages", label: "Messages", icon: "💬", exact: false },
  { href: "/dashboard/vendor?tab=reviews", label: "Reviews", icon: "⭐", exact: false },
  { href: "/dashboard/vendor?tab=settings", label: "Settings", icon: "⚙️", exact: false },
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
              src="/linkwe-new-log-dark.png"
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
            <span aria-hidden>{item.icon}</span>
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
              "inline-block shrink-0 whitespace-nowrap px-3 py-3 text-sm",
              isActive(item)
                ? "border-b-2 border-[#D4450A] font-medium text-[#D4450A]"
                : "text-zinc-500 hover:text-zinc-800",
            ].join(" ")}
          >
            <span aria-hidden>{item.icon} </span>
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
