"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  IconDots,
  IconLayoutDashboard,
  IconMessageCircle,
  IconPackage,
  IconShoppingBag,
} from "@tabler/icons-react";

function activeStyle(on: boolean) {
  return on ? "text-[#D4450A]" : "text-[#7c7b77]";
}

export default function VendorMobileBottomNav() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();

  const tab = searchParams.get("tab");

  const dash = pathname === "/dashboard/vendor" && !tab;
  const products = pathname.startsWith("/dashboard/vendor/products");
  const orders = pathname.startsWith("/dashboard/vendor/orders");
  const messages = pathname.startsWith("/dashboard/vendor/messages");
  const more = tab === "settings" || pathname.startsWith("/dashboard/vendor/settings");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[101] grid grid-cols-5 border-t border-[rgba(28,28,26,0.12)] bg-white pb-safe pt-2 md:hidden"
      aria-label="Vendor navigation"
    >
      <Link href="/dashboard/vendor" className={`flex flex-col items-center gap-1 py-2 text-[10px] font-medium ${activeStyle(dash)}`}>
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
      <Link href="/dashboard/vendor/settings" className={`flex flex-col items-center gap-1 py-2 text-[10px] font-medium ${activeStyle(more)}`}>
        <IconDots className="size-5" stroke={1.75} aria-hidden />
        More
      </Link>
    </nav>
  );
}
