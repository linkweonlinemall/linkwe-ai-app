"use client";

import Link from "next/link";
import { useState } from "react";

import type { ListingStatus, Prisma, StoreStatus } from "@prisma/client";

import BookingsTab from "./tabs/bookings-tab";
import FinanceTab from "./tabs/finance-tab";
import ListingsTab from "./tabs/listings-tab";
import MessagesTab from "./tabs/messages-tab";
import OrdersTab from "./tabs/orders-tab";
import ReviewsTab from "./tabs/reviews-tab";
import SettingsTab from "./tabs/settings-tab";
import StoreTab from "./tabs/store-tab";

const TABS = [
  { id: "store", label: "Store", icon: "🏪" },
  { id: "listings", label: "Listings", icon: "📦" },
  { id: "orders", label: "Orders", icon: "🛒" },
  { id: "finance", label: "Finance", icon: "💳" },
  { id: "bookings", label: "Bookings", icon: "📅" },
  { id: "messages", label: "Messages", icon: "💬" },
  { id: "reviews", label: "Reviews", icon: "⭐" },
  { id: "settings", label: "Settings", icon: "⚙️" },
] as const;

type TabId = (typeof TABS)[number]["id"];

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
} | null;

type CompletenessItem = { label: string; done: boolean; detail?: string };

export type VendorDashboardTabsProps = {
  store: VendorDashboardStore;
  listings: VendorDashboardListing[];
  bankDetails: VendorBankDetailsPayload;
  completenessItems: CompletenessItem[];
  completedCount: number;
  totalCount: number;
  completionPercent: number;
  dashboardSuccessMessage: string | null;
  dashboardErrorMessage: string | null;
};

export default function VendorDashboardTabs({
  store,
  listings,
  bankDetails,
  completenessItems,
  completedCount,
  totalCount,
  completionPercent,
  dashboardSuccessMessage,
  dashboardErrorMessage,
}: VendorDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("store");

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Vendor dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage your store and listings.</p>
      </div>

      {dashboardSuccessMessage ? (
        <p
          className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100"
          role="status"
        >
          {dashboardSuccessMessage}
        </p>
      ) : null}

      {dashboardErrorMessage ? (
        <p
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {dashboardErrorMessage}
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <nav className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <Link
              href="/dashboard/vendor/products"
              className="flex w-full items-center gap-3 rounded-t-2xl border-b border-zinc-100 px-4 py-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-[#D4450A] dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-[#D4450A]"
            >
              <span aria-hidden>🛍️</span>
              <span>Products</span>
            </Link>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors first:rounded-t-none last:rounded-b-2xl ${
                  activeTab === tab.id
                    ? "border-l-2 border-[#D4450A] bg-zinc-50 text-[#D4450A] dark:bg-zinc-800"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-2">
          {activeTab === "store" && (
            <StoreTab
              completedCount={completedCount}
              completenessItems={completenessItems}
              completionPercent={completionPercent}
              store={store}
              totalCount={totalCount}
            />
          )}
          {activeTab === "listings" && <ListingsTab listings={listings} />}
          {activeTab === "orders" && <OrdersTab />}
          {activeTab === "finance" && <FinanceTab bankDetails={bankDetails} />}
          {activeTab === "bookings" && <BookingsTab />}
          {activeTab === "messages" && <MessagesTab />}
          {activeTab === "reviews" && <ReviewsTab />}
          {activeTab === "settings" && <SettingsTab />}
        </div>

        <div className="flex flex-col gap-6 lg:col-span-1">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Your store</p>
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-900 dark:text-zinc-50">{store.name}</span>
              <span className="text-zinc-500">{store.slug}</span>
              {store.tagline ? <span className="text-xs text-zinc-400">{store.tagline}</span> : null}
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <a
                href={`/store/${store.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300"
              >
                View public store
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">Quick stats</p>
            <ul className="space-y-3">
              <li className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Listings</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{listings.length}</span>
              </li>
              <li className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Gallery photos</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{store.images.length}/10</span>
              </li>
              <li className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Profile complete</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{completionPercent}%</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
