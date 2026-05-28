import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";

import VendorDashboardTabs from "@/app/(dashboard)/dashboard/vendor/components/vendor-dashboard-tabs";
import VendorVerificationChecklist from "@/components/vendor/VendorVerificationChecklist";
import { getSession } from "@/lib/auth/session";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { prisma } from "@/lib/prisma";
import { getVendorDashboardAnalytics } from "@/lib/vendor/vendor-dashboard-analytics";
import { getVendorReviewStatsForStore } from "@/lib/vendor/get-vendor-review-stats";
import { vendorSplitOrderListSelect } from "@/lib/vendor/vendor-split-order-query";
import { radius, shadow, colors } from "@/lib/design-system";

const DASHBOARD_MESSAGES: Record<string, string> = {
  bank_fields_required: "All bank detail fields are required.",
  bank_saved: "Bank details saved successfully.",
  store_saved: "Store saved successfully.",
};

type Props = { searchParams: Promise<{ error?: string; success?: string; tab?: string }> };

const LEGACY_TAB_ROUTES: Record<string, string> = {
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
    },
  });
  if (!store) redirect("/onboarding/business/step-3");

  const listings = await prisma.listing.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      imageUrl: true,
      status: true,
      createdAt: true,
    },
  });

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

  const completedCount = completenessItems.filter((i) => i.done).length;
  const totalCount = completenessItems.length;

  const dashboardAnalytics = await getVendorDashboardAnalytics(store.id);
  const reviewSummary = await getVendorReviewStatsForStore(store.id);

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
      listings={listings}
      splitOrders={splitOrders}
      completenessItems={completenessItems}
      completedCount={completedCount}
      totalCount={totalCount}
      dashboardAnalytics={dashboardAnalytics}
      reviewSummary={reviewSummary}
      initialAvailableNow={store.isAvailableNow}
      dashboardSuccessMessage={dashboardSuccessMessage}
      dashboardErrorMessage={dashboardErrorMessage}
      idVerificationStatus={user.idVerificationStatus}
      verificationApprovedBanner={
        user.idVerificationStatus === "APPROVED" ? (
          <div
            key="verification-banner"
            className={`mt-3 flex items-center gap-2 ${radius.card} border border-y border-r border-emerald-100 border-l-4 bg-emerald-50/80 px-4 py-2.5 ${shadow.card}`}
            style={{ borderLeftColor: colors.success }}
          >
            <ShieldCheck className="size-4 shrink-0 text-emerald-700" aria-hidden strokeWidth={2.25} />
            <div>
              <p className="text-xs font-bold text-emerald-800">Confirmed to sell</p>
              <p className="text-[10px] text-emerald-600">Identity verified — store is live on LinkWe</p>
            </div>
          </div>
        ) : undefined
      }
      verificationChecklist={
        <VendorVerificationChecklist
          embedded
          idStatus={user.idVerificationStatus}
          idDocumentUrl={user.idDocumentUrl}
          bankName={user.bankDetails?.bankName ?? null}
          accountName={user.bankDetails?.accountName ?? null}
          accountNumber={user.bankDetails?.accountNumber ?? null}
          accountType={user.bankDetails?.accountType ?? null}
        />
      }
    />
    </Suspense>
  );
}
