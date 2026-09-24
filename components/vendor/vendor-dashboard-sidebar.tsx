"use client";

import Link from "next/link";
import NextImage from "next/image";
import { usePathname } from "next/navigation";
import type { IdVerificationStatus, StoreStatus } from "@prisma/client";
import { ArrowUpRight, CircleHelp, Search } from "lucide-react";
import { workspaceGroups, workspaceHref, workspaceLinkActive } from "./dashboard-navigation";
import s from "./workspace.module.css";

export type VendorDashboardSidebarProps = {
  storeName: string; storeSlug: string; storeLogoUrl: string | null;
  storeStatus: StoreStatus; idVerificationStatus: IdVerificationStatus;
  pendingRequestsCount: number; activeOrdersCount: number;
};
export default function VendorDashboardSidebar(props: VendorDashboardSidebarProps) {
  const pathname = usePathname() ?? "";
  const live = props.storeStatus === "ACTIVE" && props.idVerificationStatus === "APPROVED";
  return <aside className={s.sidebar}>
    <Link href="/" className={s.brand} aria-label="LinkWe homepage"><NextImage src="/linkwe-logo-mark-on-dark.png" alt="" width={43} height={43} unoptimized/><span>Link<span>We</span><small>VENDOR WORKSPACE</small></span></Link>
    <Link href="/dashboard/vendor/store/edit" className={s.sidebarStore} title={`Edit ${props.storeName}`}>
      <span className={s.storeAvatar}>{props.storeLogoUrl ? <NextImage src={props.storeLogoUrl} alt="" width={38} height={38} unoptimized/> : props.storeName.slice(0, 1)}</span>
      <span className={s.sidebarStoreText}><strong>{props.storeName}</strong><small><i data-live={live}/>{live ? "Live on LinkWe" : props.storeStatus === "PENDING_APPROVAL" ? "Awaiting store approval" : "Setup in progress"}</small></span>
    </Link>
    <button className={s.sidebarSearch} onClick={() => window.dispatchEvent(new CustomEvent("vendor-workspace:open-menu"))} aria-label="Find a dashboard tool"><Search size={17}/><span>Find a tool</span><kbd>⌘ K</kbd></button>
    <nav className={s.sidebarNav} aria-label="Vendor workspace">
      {workspaceGroups.map(group => <div key={group.label} className={s.navGroup}><p>{group.label}</p>{group.items.map(item => {
        const count = item.badge === "orders" ? props.activeOrdersCount : item.badge === "requests" ? props.pendingRequestsCount : 0;
        return <Link key={item.path} href={workspaceHref(item.path)} title={item.label} aria-current={workspaceLinkActive(pathname, item.path) ? "page" : undefined} className={s.navLink}><item.icon size={18}/><span>{item.label}</span>{count > 0 && <b>{count > 99 ? "99+" : count}</b>}</Link>;
      })}</div>)}
    </nav>
    <div className={s.sidebarFoot}><button onClick={() => window.dispatchEvent(new CustomEvent("vendor-tour:open-library"))} title="Help & tutorials"><CircleHelp size={18}/><span>Help & tutorials</span></button><Link href={`/store/${props.storeSlug}`} data-tour="public-store" title="View public store"><ArrowUpRight size={18}/><span>View public store</span></Link></div>
  </aside>;
}
