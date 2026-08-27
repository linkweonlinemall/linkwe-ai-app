"use client";

import { type ReactNode } from "react";

import type { IdVerificationStatus, Prisma, StoreStatus } from "@prisma/client";

import type { VendorSplitOrder } from "./tabs/orders-tab";

import AvailabilityToggle from "@/components/vendor/AvailabilityToggle";
import VendorDashboardOverview from "@/components/vendor/VendorDashboardOverview";

import type { VendorDashboardAnalytics } from "@/lib/vendor/vendor-dashboard-analytics";
import type { VendorReadinessCheck } from "@/lib/vendor/readiness";

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

type CompletenessItem = { label: string; done: boolean; detail?: string };

type ReviewSummary = {
  total: number;
  average: number;
  breakdown: Record<number, number>;
};

export type VendorDashboardTabsProps = {
  store: VendorDashboardStore;
  splitOrders: VendorSplitOrder[];
  completenessItems: CompletenessItem[];
  dashboardAnalytics: VendorDashboardAnalytics;
  reviewSummary: ReviewSummary;
  initialAvailableNow: boolean;
  dashboardSuccessMessage: string | null;
  dashboardErrorMessage: string | null;
  dashboardWarningMessage: string | null;
  idVerificationStatus: IdVerificationStatus;
  verificationChecks: VendorReadinessCheck[];
  verificationChecklist?: ReactNode;
  /** Four-gate "Open for business" checklist — renders above the profile % banner. Auto-hides when all gates pass. */
  openForBusinessChecklist?: ReactNode;
};

export default function VendorDashboardTabs({
  store,
  splitOrders,
  completenessItems,
  dashboardAnalytics,
  reviewSummary,
  initialAvailableNow,
  dashboardSuccessMessage,
  dashboardErrorMessage,
  dashboardWarningMessage,
  idVerificationStatus,
  verificationChecks,
  verificationChecklist,
  openForBusinessChecklist,
}: VendorDashboardTabsProps) {
  const recentOrders = splitOrders.slice(0, 5);

  return (
    <main className="w-full min-w-0 max-w-full flex-1 bg-[#F7F5F2] px-4 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] pt-4 font-sans antialiased sm:px-5 md:px-6 md:pb-12 md:pt-5">
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

      {dashboardWarningMessage ? (
        <p
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          role="status"
        >
          {dashboardWarningMessage}
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
        verificationChecks={verificationChecks}
        openForBusinessChecklist={openForBusinessChecklist}
        verificationChecklist={verificationChecklist}
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

    </main>
  );
}
