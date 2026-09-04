"use client";

import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import LinkWeDeliveryTab from "./linkwe-delivery-tab";
import OverviewTab from "./overview-tab";
import OrdersTab from "./orders-tab";
import PayoutsTab from "./payouts-tab";
import VendorsTab from "./vendors-tab";
import CustomersTab from "./customers-tab";
import SettingsTab from "./settings-tab";
import TicketOrdersTab from "./ticket-orders-tab";

const TAB_IDS = [
  "overview",
  "orders",
  "linkwe-delivery",
  "payouts",
  "tickets",
  "vendors",
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
    id: "linkwe-delivery",
    label: "Managed Delivery",
    icon: (
      <svg className="h-4 w-4 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="3" width="15" height="13" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    id: "payouts",
    label: "Payouts",
    icon: (
      <svg className="h-4 w-4 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    id: "tickets",
    label: "Tickets",
    icon: (
      <svg className="h-4 w-4 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9z" />
        <path d="M6 12h.01M10 12h.01" />
        <path d="M2 14v3a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-3" />
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
  const searchParams = useSearchParams();

  const activeTab: TabId = (() => {
    const t = searchParams.get("tab");
    return t && isTabId(t) ? t : "overview";
  })();

  const placeholderIcon = TAB_CONFIG.find((t) => t.id === activeTab)?.icon ?? null;

  return (
    <div className="p-6" style={{ backgroundColor: "var(--surface)" }}>
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "orders" && <OrdersTab />}
        {activeTab === "linkwe-delivery" && <LinkWeDeliveryTab />}
        {activeTab === "payouts" && <PayoutsTab />}
        {activeTab === "tickets" && <TicketOrdersTab />}
        {activeTab === "vendors" && <VendorsTab />}
        {activeTab === "customers" && <CustomersTab />}
        {activeTab === "settings" && <SettingsTab />}
        {activeTab !== "overview" &&
          activeTab !== "orders" &&
          activeTab !== "linkwe-delivery" &&
          activeTab !== "payouts" &&
          activeTab !== "tickets" &&
          activeTab !== "vendors" &&
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
  );
}
