"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingBag, MessageCircle, Grid2X2 } from "lucide-react";
import { workspaceHref, workspaceLinkActive } from "./dashboard-navigation";
import s from "./workspace.module.css";

const items = [
  { path: "", label: "Overview", Icon: LayoutDashboard },
  { path: "/products", label: "Products", Icon: Package },
  { path: "/orders", label: "Orders", Icon: ShoppingBag },
  { path: "/messages", label: "Messages", Icon: MessageCircle },
];
export default function VendorMobileBottomNav({ activeOrdersCount = 0, pendingRequestsCount = 0 }: { activeOrdersCount?: number; pendingRequestsCount?: number }) {
  const pathname = usePathname() ?? "";
  const isMore = !items.some(item => workspaceLinkActive(pathname, item.path));
  return <nav className={s.bottomNav} aria-label="Vendor navigation">
    {items.map(({ path, label, Icon }) => <Link key={path} href={workspaceHref(path)} aria-current={workspaceLinkActive(pathname, path) ? "page" : undefined}><span><Icon size={21}/>{path === "/orders" && activeOrdersCount > 0 && <b>{activeOrdersCount > 99 ? "99+" : activeOrdersCount}</b>}</span>{label}</Link>)}
    <button type="button" data-active={isMore} aria-label="More tools and pages" aria-haspopup="dialog" onClick={() => window.dispatchEvent(new CustomEvent("vendor-workspace:open-menu"))}><span><Grid2X2 size={21}/>{pendingRequestsCount > 0 && <b>{pendingRequestsCount > 99 ? "99+" : pendingRequestsCount}</b>}</span>More</button>
  </nav>;
}
