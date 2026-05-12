"use client";

import type { ReactNode } from "react";
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import OverviewTab from "./overview-tab";
import OrdersTab from "./orders-tab";
import CouriersTab from "./couriers-tab";
import VendorsTab from "./vendors-tab";
import WarehouseTab from "./warehouse-tab";
import BayMapTab from "./bay-map-tab";
import MapTab from "./map-tab";
import CustomersTab from "./customers-tab";
import SettingsTab from "./settings-tab";

const TAB_IDS = [
  "overview",
  "orders",
  "warehouse",
  "bays",
  "couriers",
  "vendors",
  "map",
  "customers",
  "settings",
] as const;

type TabId = (typeof TAB_IDS)[number];

function isTabId(value: string): value is TabId {
  return (TAB_IDS as readonly string[]).includes(value);
}

const TAB_CONFIG: { id: TabId; label: string; icon: ReactNode }[] = [
  {
    id: "overview",
    label: "Overview",
    icon: (
      <svg className="h-4 w-4 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: "orders",
    label: "Orders",
    icon: (
      <svg className="h-4 w-4 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    id: "warehouse",
    label: "Warehouse",
    icon: (
      <svg className="h-4 w-4 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
  {
    id: "bays",
    label: "Bay Map",
    icon: (
      <svg className="h-4 w-4 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: "couriers",
    label: "Couriers",
    icon: (
      <svg className="h-4 w-4 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    id: "vendors",
    label: "Vendors",
    icon: (
      <svg className="h-4 w-4 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: "map",
    label: "Map",
    icon: (
      <svg className="h-4 w-4 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
        <line x1="9" y1="3" x2="9" y2="18" />
        <line x1="15" y1="6" x2="15" y2="21" />
      </svg>
    ),
  },
  {
    id: "customers",
    label: "Customers",
    icon: (
      <svg className="h-4 w-4 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    icon: (
      <svg className="h-4 w-4 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
  },
];

type Props = {
  adminName: string;
};

export default function AdminDashboard({ adminName: _adminName }: Props) {
  const pathname = usePathname();
  const productsNavActive = pathname?.startsWith("/dashboard/admin/products") ?? false;
  const storesNavActive = pathname?.startsWith("/dashboard/admin/stores") ?? false;
  const verificationNavActive = pathname?.startsWith("/dashboard/admin/verification") ?? false;
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && isTabId(tab)) {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    const syncTabFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab && isTabId(tab)) setActiveTab(tab);
    };
    window.addEventListener("popstate", syncTabFromUrl);
    return () => window.removeEventListener("popstate", syncTabFromUrl);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeTab);
    window.history.replaceState({}, "", url.toString());
  }, [activeTab]);

  const placeholderIcon = TAB_CONFIG.find((t) => t.id === activeTab)?.icon ?? null;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <nav
        className="flex w-full min-w-0 overflow-x-auto whitespace-nowrap border-b bg-white px-2"
        style={{ borderColor: "var(--card-border)" }}
      >
        <div className="mx-auto flex w-max min-w-0 max-w-7xl items-center gap-1">
          {TAB_CONFIG.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Fragment key={tab.id}>
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 relative"
                  style={{
                    color: isActive ? "var(--scarlet)" : "var(--text-muted)",
                    borderBottom: isActive ? "2px solid var(--scarlet)" : "2px solid transparent",
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
                {tab.id === "overview" ? (
                  <div className="mx-1 h-5 w-px shrink-0 bg-zinc-200" aria-hidden />
                ) : null}
                {tab.id === "orders" ? (
                  <div className="mx-1 h-5 w-px shrink-0 bg-zinc-200" aria-hidden />
                ) : null}
                {tab.id === "vendors" ? (
                  <div className="mx-1 h-5 w-px shrink-0 bg-zinc-200" aria-hidden />
                ) : null}
              </Fragment>
            );
          })}
          <div className="mx-1 h-5 w-px shrink-0 bg-zinc-200" aria-hidden />
          <Link
            href="/dashboard/admin/products"
            className="flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 relative"
            style={{
              color: productsNavActive ? "var(--scarlet)" : "var(--text-muted)",
              borderBottom: productsNavActive
                ? "2px solid var(--scarlet)"
                : "2px solid transparent",
            }}
          >
            <svg
              className="h-4 w-4 shrink-0"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            Products
          </Link>
          <Link
            href="/dashboard/admin/stores"
            className="flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 relative"
            style={{
              color: storesNavActive ? "var(--scarlet)" : "var(--text-muted)",
              borderBottom: storesNavActive
                ? "2px solid var(--scarlet)"
                : "2px solid transparent",
            }}
          >
            <svg
              aria-hidden
              className="h-4 w-4 shrink-0"
              fill="none"
              height="16"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="16"
            >
              <path d="M3 21h18" />
              <path d="M5 21V8l9-6 9 6v13" />
              <path d="M9 21v-6h6v6" />
            </svg>
            Stores
          </Link>
          <Link
            href="/dashboard/admin/verification"
            style={{
              color: verificationNavActive ? "var(--scarlet)" : "var(--text-muted)",
              borderBottom: verificationNavActive ? "2px solid var(--scarlet)" : "2px solid transparent",
            }}
            className="flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 relative"
          >
            <svg
              className="h-4 w-4 shrink-0"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Verification
          </Link>
        </div>
      </nav>

      <div className="p-6" style={{ backgroundColor: "var(--surface)" }}>
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "orders" && <OrdersTab />}
        {activeTab === "warehouse" && <WarehouseTab />}
        {activeTab === "bays" && <BayMapTab />}
        {activeTab === "couriers" && <CouriersTab />}
        {activeTab === "vendors" && <VendorsTab />}
        {activeTab === "map" && <MapTab />}
        {activeTab === "customers" && <CustomersTab />}
        {activeTab === "settings" && <SettingsTab />}
        {activeTab !== "overview" &&
          activeTab !== "orders" &&
          activeTab !== "warehouse" &&
          activeTab !== "bays" &&
          activeTab !== "couriers" &&
          activeTab !== "vendors" &&
          activeTab !== "map" &&
          activeTab !== "customers" &&
          activeTab !== "settings" && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-16 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 [&_svg]:text-zinc-400">
              {placeholderIcon}
            </div>
            <p className="text-base font-semibold capitalize text-zinc-900">{activeTab}</p>
            <p className="mt-1 text-sm text-zinc-500">This section is being built.</p>
          </div>
        )}
      </div>
    </div>
  );
}
