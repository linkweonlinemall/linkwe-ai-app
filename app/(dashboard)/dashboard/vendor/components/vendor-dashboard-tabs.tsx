"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type {
  LedgerEntryType,
  ListingStatus,
  PayoutStatus,
  Prisma,
  StoreStatus,
  VendorLedgerEntryType,
} from "@prisma/client";

import BookingsTab from "./tabs/bookings-tab";
import FinanceTab from "./tabs/finance-tab";
import ListingsTab from "./tabs/listings-tab";
import MessagesTab from "./tabs/messages-tab";
import OrdersTab, { type VendorSplitOrder } from "./tabs/orders-tab";
import ReviewsTab from "./tabs/reviews-tab";
import SettingsTab from "./tabs/settings-tab";
import StoreTab from "./tabs/store-tab";

const TABS = [
  { id: "store", label: "Store", icon: "🏪" },
  { id: "listings", label: "Listings", icon: "📋" },
  { id: "orders", label: "Orders", icon: "🛍️" },
  { id: "finance", label: "Finance", icon: "💳" },
  { id: "bookings", label: "Bookings", icon: "📅" },
  { id: "messages", label: "Messages", icon: "💬" },
  { id: "reviews", label: "Reviews", icon: "⭐" },
  { id: "settings", label: "Settings", icon: "⚙️" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const SIDEBAR_ITEM =
  "mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-zinc-600 transition-colors duration-150 hover:bg-zinc-50 hover:text-zinc-900";
const SIDEBAR_ITEM_ACTIVE = "bg-[#D4450A]/10 font-medium text-[#D4450A]";

export type VendorDashboardStore = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  region: string;
  categoryId: string;
  status: StoreStatus;
  onboardingStep: number;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  coverPhotoUrl: string | null;
  description: string | null;
  openingHours: Prisma.JsonValue | null;
  tags: string[];
  amenities: string[];
  policies: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  socialLinks: Prisma.JsonValue | null;
  images: { id: string }[];
  ledgerEntries: {
    id: string;
    amountMinor: number;
    entryType: VendorLedgerEntryType;
    ledgerEntryType: LedgerEntryType | null;
    description: string | null;
    createdAt: Date;
  }[];
  payoutRequests: {
    id: string;
    amountMinor: number;
    status: PayoutStatus;
    requestedAt: Date;
  }[];
};

export type VendorDashboardListing = {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  status: ListingStatus;
  createdAt: Date;
};

export type VendorBankDetailsPayload = {
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  accountType: string | null;
} | null;

type CompletenessItem = { label: string; done: boolean; detail?: string };

export type VendorDashboardTabsProps = {
  store: VendorDashboardStore;
  listings: VendorDashboardListing[];
  splitOrders: VendorSplitOrder[];
  bankDetails: VendorBankDetailsPayload;
  completenessItems: CompletenessItem[];
  completedCount: number;
  totalCount: number;
  completionPercent: number;
  dashboardSuccessMessage: string | null;
  dashboardErrorMessage: string | null;
  ledgerEntries: VendorDashboardStore["ledgerEntries"];
  payoutRequests: VendorDashboardStore["payoutRequests"];
};

function SidebarNavLink({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={[SIDEBAR_ITEM, active ? SIDEBAR_ITEM_ACTIVE : ""].filter(Boolean).join(" ")}
    >
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export default function VendorDashboardTabs({
  store,
  listings,
  splitOrders,
  bankDetails,
  completenessItems,
  completedCount,
  totalCount,
  completionPercent,
  dashboardSuccessMessage,
  dashboardErrorMessage,
  ledgerEntries,
  payoutRequests,
}: VendorDashboardTabsProps) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<TabId>("store");
  const productsActive = pathname === "/dashboard/vendor/products";

  return (
    <>
      <nav className="flex overflow-x-auto whitespace-nowrap border-b border-zinc-200 bg-white md:hidden">
        <Link
          href="/dashboard/vendor/products"
          className={[
            "inline-block px-4 py-3 text-sm",
            productsActive
              ? "border-b-2 border-[#D4450A] font-medium text-[#D4450A]"
              : "text-zinc-500 hover:text-zinc-800",
          ].join(" ")}
        >
          <span aria-hidden>📦 </span>Products
        </Link>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              "inline-block px-4 py-3 text-sm",
              activeTab === tab.id
                ? "border-b-2 border-[#D4450A] font-medium text-[#D4450A]"
                : "text-zinc-500 hover:text-zinc-800",
            ].join(" ")}
          >
            <span aria-hidden>{tab.icon} </span>
            {tab.label}
          </button>
        ))}
      </nav>

      <aside className="hidden min-h-screen w-56 shrink-0 flex-col border-r border-zinc-100 bg-white pb-6 pt-4 md:flex">
        <SidebarNavLink href="/dashboard/vendor/products" active={productsActive} icon="📦" label="Products" />
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[SIDEBAR_ITEM, activeTab === tab.id ? SIDEBAR_ITEM_ACTIVE : "", "text-left"].join(" ")}
          >
            <span aria-hidden>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </aside>

      <main className="min-w-0 flex-1 bg-[#F5F5F5] px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900">Vendor dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage your store and listings.</p>
        </div>

        {dashboardSuccessMessage ? (
          <p
            className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            role="status"
          >
            {dashboardSuccessMessage}
          </p>
        ) : null}

        {dashboardErrorMessage ? (
          <p
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {dashboardErrorMessage}
          </p>
        ) : null}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            {activeTab === "store" && (
              <StoreTab
                completedCount={completedCount}
                completenessItems={completenessItems}
                completionPercent={completionPercent}
                store={store}
                totalCount={totalCount}
              />
            )}
            {activeTab === "orders" && <OrdersTab splitOrders={splitOrders} />}
            {activeTab === "listings" && <ListingsTab listings={listings} />}
            {activeTab === "finance" && (
              <FinanceTab
                bankDetails={bankDetails}
                ledgerEntries={ledgerEntries}
                payoutRequests={payoutRequests}
              />
            )}
            {activeTab === "bookings" && <BookingsTab />}
            {activeTab === "messages" && <MessagesTab />}
            {activeTab === "reviews" && <ReviewsTab />}
            {activeTab === "settings" && <SettingsTab />}
          </div>

          <div className="flex w-full shrink-0 flex-col gap-6 lg:w-72">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Your store</p>
              <div className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-zinc-900">{store.name}</span>
                <span className="text-zinc-500">{store.slug}</span>
                {store.tagline ? <span className="text-xs text-zinc-400">{store.tagline}</span> : null}
              </div>
              <div className="mt-3 flex flex-col gap-2">
                <a
                  href={`/store/${store.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  View public store
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">Quick stats</p>
              <ul className="space-y-3">
                <li className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Listings</span>
                  <span className="font-medium text-zinc-900">{listings.length}</span>
                </li>
                <li className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Gallery photos</span>
                  <span className="font-medium text-zinc-900">{store.images.length}/10</span>
                </li>
                <li className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Profile complete</span>
                  <span className="font-medium text-zinc-900">{completionPercent}%</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
