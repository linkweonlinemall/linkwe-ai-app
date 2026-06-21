"use client";

import { type ReactNode } from "react";

import { useSearchParams } from "next/navigation";

import type { IdVerificationStatus, ListingStatus, Prisma, StoreStatus } from "@prisma/client";

import BookingsTab from "./tabs/bookings-tab";
import ListingsTab from "./tabs/listings-tab";
import SettingsTab from "./tabs/settings-tab";
import StoreTab from "./tabs/store-tab";

import type { VendorSplitOrder } from "./tabs/orders-tab";

import AvailabilityToggle from "@/components/vendor/AvailabilityToggle";
import VendorDashboardOverview from "@/components/vendor/VendorDashboardOverview";

import type { VendorDashboardAnalytics } from "@/lib/vendor/vendor-dashboard-analytics";

const TABS = [
  { id: "store", label: "Store" },
  { id: "listings", label: "Listings" },
  { id: "bookings", label: "Bookings" },
  { id: "settings", label: "Settings" },
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

type CompletenessItem = { label: string; done: boolean; detail?: string };

type ReviewSummary = {
  total: number;
  average: number;
  breakdown: Record<number, number>;
};

export type VendorDashboardTabsProps = {
  store: VendorDashboardStore;
  listings: VendorDashboardListing[];
  splitOrders: VendorSplitOrder[];
  completenessItems: CompletenessItem[];
  completedCount: number;
  totalCount: number;
  dashboardAnalytics: VendorDashboardAnalytics;
  reviewSummary: ReviewSummary;
  initialAvailableNow: boolean;
  dashboardSuccessMessage: string | null;
  dashboardErrorMessage: string | null;
  idVerificationStatus: IdVerificationStatus;
  /** Shown inside the store header card after action buttons when ID verification is approved. */
  verificationApprovedBanner?: ReactNode;
  verificationChecklist?: ReactNode;
};

function tabIdFromSearchParams(sp: ReturnType<typeof useSearchParams>): TabId {
  const tab = sp.get("tab");
  if (tab && TABS.some((t) => t.id === tab)) return tab as TabId;
  return TABS[0].id;
}

export default function VendorDashboardTabs({
  store,
  listings,
  splitOrders,
  completenessItems,
  completedCount,
  totalCount,
  dashboardAnalytics,
  reviewSummary,
  initialAvailableNow,
  dashboardSuccessMessage,
  dashboardErrorMessage,
  idVerificationStatus,
  verificationApprovedBanner,
  verificationChecklist,
}: VendorDashboardTabsProps) {
  const searchParams = useSearchParams();
  const activeTab = tabIdFromSearchParams(searchParams);

  const recentOrders = splitOrders.slice(0, 5);

  return (
    <main className="min-w-0 flex-1 bg-[#F7F5F2] px-5 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pt-5 font-sans antialiased md:px-6 md:pb-12 md:pt-5">
      <div className="mb-4 max-md:[&_.avail-row]:gap-2">
        <AvailabilityToggle appearance="banner" initialAvailable={initialAvailableNow} />
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
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {dashboardErrorMessage}
        </p>
      ) : null}

      <VendorDashboardOverview
        analytics={dashboardAnalytics}
        completenessItems={completenessItems}
        recentOrders={recentOrders}
        reviewSummary={reviewSummary}
        idVerificationStatus={idVerificationStatus}
        store={{
          id: store.id,
          status: store.status,
          name: store.name,
          slug: store.slug,
          categoryId: store.categoryId,
          region: store.region,
          logoUrl: store.logoUrl,
          coverPhotoUrl: store.coverPhotoUrl,
        }}
      />

      <div className="min-w-0 pb-16 pt-6 md:pb-12 md:pt-8 lg:pb-12">
        {activeTab === "store" && (
          <StoreTab
            completedCount={completedCount}
            completenessItems={completenessItems}
            storeId={store.id}
            store={store}
            totalCount={totalCount}
            verificationApprovedBanner={verificationApprovedBanner}
            verificationChecklist={verificationChecklist}
          />
        )}
        {activeTab === "listings" && <ListingsTab listings={listings} />}
        {activeTab === "bookings" && <BookingsTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>
    </main>
  );
}
