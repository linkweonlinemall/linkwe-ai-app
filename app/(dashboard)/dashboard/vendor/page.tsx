import { redirect } from "next/navigation";

import AvailabilityToggle from "@/components/vendor/AvailabilityToggle";
import VendorDashboardTabs from "@/app/(dashboard)/dashboard/vendor/components/vendor-dashboard-tabs";
import VendorVerificationChecklist from "@/components/vendor/VendorVerificationChecklist";
import { getSession } from "@/lib/auth/session";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { prisma } from "@/lib/prisma";

const DASHBOARD_MESSAGES: Record<string, string> = {
  bank_fields_required: "All bank detail fields are required.",
  bank_saved: "Bank details saved successfully.",
  store_saved: "Store saved successfully.",
};

type Props = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function VendorDashboardPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");

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
      ledgerEntries: {
        select: {
          id: true,
          amountMinor: true,
          entryType: true,
          ledgerEntryType: true,
          description: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      payoutRequests: {
        select: {
          id: true,
          amountMinor: true,
          status: true,
          requestedAt: true,
        },
        orderBy: { requestedAt: "desc" },
      },
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
    include: {
      items: {
        select: {
          id: true,
          titleSnapshot: true,
          quantity: true,
          unitPriceMinor: true,
          lineTotalMinor: true,
        },
      },
      mainOrder: {
        select: {
          region: true,
          buyer: {
            select: { fullName: true },
          },
        },
      },
    },
  });

  const sp = await searchParams;
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
  const completionPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <>
      <div className="border-b border-zinc-100 bg-white px-4 py-4 md:px-8">
        <AvailabilityToggle initialAvailable={store.isAvailableNow} />
      </div>
      <div className="flex min-h-screen flex-col pb-24 sm:pb-0 md:flex-row">
      <VendorDashboardTabs
        store={store}
        listings={listings}
        splitOrders={splitOrders}
        bankDetails={user.bankDetails}
        ledgerEntries={store.ledgerEntries}
        payoutRequests={store.payoutRequests}
        completenessItems={completenessItems}
        completedCount={completedCount}
        totalCount={totalCount}
        completionPercent={completionPercent}
        dashboardSuccessMessage={dashboardSuccessMessage}
        dashboardErrorMessage={dashboardErrorMessage}
        verificationApprovedBanner={
          user.idVerificationStatus === "APPROVED" ? (
            <div key="verification-banner" className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
              <div>
                <p className="text-xs font-bold text-emerald-800">Confirmed to sell ✓</p>
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
      </div>
    </>
  );
}
