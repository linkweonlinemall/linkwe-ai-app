import { redirect } from "next/navigation";
import { Suspense } from "react";

import VendorDashboardTabs from "@/app/(dashboard)/dashboard/vendor/components/vendor-dashboard-tabs";
import OpenForBusinessChecklist from "@/components/vendor/OpenForBusinessChecklist";
import VendorVerificationChecklist from "@/components/vendor/VendorVerificationChecklist";
import { getSession } from "@/lib/auth/session";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { prisma } from "@/lib/prisma";
import { getVendorDashboardAnalytics } from "@/lib/vendor/vendor-dashboard-analytics";
import { getVendorReadiness } from "@/lib/vendor/readiness";
import { getVendorReviewStatsForStore } from "@/lib/vendor/get-vendor-review-stats";
import { vendorSplitOrderListSelect } from "@/lib/vendor/vendor-split-order-query";

const DASHBOARD_MESSAGES: Record<string, string> = {
  bank_fields_required: "All bank detail fields are required.",
  bank_saved: "Bank details saved successfully.",
  store_saved: "Store saved successfully.",
};

type Props = { searchParams: Promise<{ error?: string; success?: string; tab?: string; upgrade?: string }> };

const LEGACY_TAB_ROUTES: Record<string, string> = {
  store: "/dashboard/vendor/store/edit",
  listings: "/dashboard/vendor/products",
  bookings: "/dashboard/vendor/bookings",
  settings: "/dashboard/vendor/settings",
  orders: "/dashboard/vendor/orders",
  finance: "/dashboard/vendor/finance",
  messages: "/dashboard/vendor/messages",
  reviews: "/dashboard/vendor/reviews",
};

export default async function VendorDashboardPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");

  const sp = await searchParams;

  const legacyTab = sp.tab !== undefined && sp.tab !== "" ? String(sp.tab) : "";
  if (legacyTab && LEGACY_TAB_ROUTES[legacyTab]) {
    const qs = new URLSearchParams();
    if (sp.success) qs.set("success", String(sp.success));
    if (sp.error) qs.set("error", String(sp.error));
    const suffix = qs.toString();
    redirect(`${LEGACY_TAB_ROUTES[legacyTab]}${suffix ? `?${suffix}` : ""}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      idDocumentUrl: true,
      idVerificationStatus: true,
      emailVerified: true,
      phone: true,
      bankDetails: {
        select: {
          bankName: true,
          accountName: true,
          accountNumber: true,
          accountType: true,
        },
      },
    },
  });
  if (!user) redirect("/login");

  const store = await prisma.store.findFirst({
    where: { ownerId: user.id },
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      region: true,
      categoryId: true,
      status: true,
      onboardingStep: true,
      logoUrl: true,
      createdAt: true,
      updatedAt: true,
      coverPhotoUrl: true,
      description: true,
      openingHours: true,
      tags: true,
      amenities: true,
      policies: true,
      isAvailableNow: true,
      socialLinks: true,
      latitude: true,
      longitude: true,
      address: true,
      images: { select: { id: true } },
      _count: { select: { products: true } },
    },
  });
  if (!store) redirect("/onboarding/business/step-3");

  const splitOrders = await prisma.splitOrder.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    select: vendorSplitOrderListSelect,
  });

  const dashboardErrorKey = sp.error;
  const dashboardSuccessKey = sp.success;
  const dashboardErrorMessage =
    dashboardErrorKey && DASHBOARD_MESSAGES[dashboardErrorKey] ? DASHBOARD_MESSAGES[dashboardErrorKey] : null;
  const dashboardSuccessMessage =
    dashboardSuccessKey && DASHBOARD_MESSAGES[dashboardSuccessKey]
      ? DASHBOARD_MESSAGES[dashboardSuccessKey]
      : null;
  const dashboardWarningMessage =
    sp.upgrade === "failed"
      ? "Your plan upgrade didn't go through, so you're on the Starter plan for now. You can upgrade anytime from Finance."
      : sp.upgrade === "cancelled"
        ? "Plan upgrade cancelled — you're on the Starter plan. You can upgrade anytime from Finance."
        : null;

  const completenessItems = [
    { label: "Store logo", done: !!store.logoUrl },
    { label: "Cover photo", done: !!store.coverPhotoUrl },
    { label: "Description", done: !!store.description },
    { label: "Gallery", done: store.images.length > 0, detail: `${store.images.length}/10 photos` },
    { label: "Opening hours", done: !!store.openingHours },
    { label: "Tags", done: store.tags.length > 0 },
    { label: "Amenities", done: store.amenities.length > 0 },
    { label: "Store policies", done: !!store.policies },
    { label: "Store location", done: !!store.latitude },
    { label: "Social links", done: !!store.socialLinks },
  ];

  const dashboardAnalytics = await getVendorDashboardAnalytics(store.id);
  const reviewSummary = await getVendorReviewStatsForStore(store.id);

  const vendorReadiness = getVendorReadiness({
    idDocumentUrl: user.idDocumentUrl,
    phone: user.phone,
    bankDetails: user.bankDetails
      ? {
          bankName: user.bankDetails.bankName,
          accountName: user.bankDetails.accountName,
          accountNumber: user.bankDetails.accountNumber,
        }
      : null,
    store: { logoUrl: store.logoUrl, description: store.description },
  });

  const hasBankDetailsForCard =
    vendorReadiness.checks.find((c) => c.id === "bank")?.ok ?? false;
  const hasProduct = store._count.products > 0;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center bg-[#F7F5F2] px-5">
          <p className="text-sm text-[#7c7b77]">Loading dashboard…</p>
        </div>
      }
    >
    <VendorDashboardTabs
      store={store}
      splitOrders={splitOrders}
      completenessItems={completenessItems}
      dashboardAnalytics={dashboardAnalytics}
      reviewSummary={reviewSummary}
      initialAvailableNow={store.isAvailableNow}
      dashboardSuccessMessage={dashboardSuccessMessage}
      dashboardErrorMessage={dashboardErrorMessage}
      dashboardWarningMessage={dashboardWarningMessage}
      idVerificationStatus={user.idVerificationStatus}
      openForBusinessChecklist={
        <OpenForBusinessChecklist
          verificationStatus={user.idVerificationStatus}
          hasBankDetails={hasBankDetailsForCard}
          hasProduct={hasProduct}
          storeStatus={store.status}
          emailVerified={!!user.emailVerified}
        />
      }
      verificationChecklist={
        user.idVerificationStatus !== "APPROVED" ? (
          <VendorVerificationChecklist
            embedded
            idStatus={user.idVerificationStatus}
            storeStatus={store.status}
            storeId={store.id}
            idDocumentUrl={user.idDocumentUrl}
            bankName={user.bankDetails?.bankName ?? null}
            accountName={user.bankDetails?.accountName ?? null}
            accountNumber={user.bankDetails?.accountNumber ?? null}
            accountType={user.bankDetails?.accountType ?? null}
            readiness={vendorReadiness}
          />
        ) : undefined
      }
    />
    </Suspense>
  );
}
