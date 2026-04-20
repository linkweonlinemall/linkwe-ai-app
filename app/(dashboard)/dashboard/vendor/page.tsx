import { redirect } from "next/navigation";
import VendorDashboardTabs from "@/app/(dashboard)/dashboard/vendor/components/vendor-dashboard-tabs";
import { getSession } from "@/lib/auth/session";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getCurrentUser } from "@/lib/auth/current-user";
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

  const user = await getCurrentUser();
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
      socialLinks: true,
      latitude: true,
      longitude: true,
      address: true,
      images: { select: { id: true } },
    },
  });
  if (!store) redirect("/onboarding/business/step-3");

  const bankDetails = await prisma.vendorBankDetails.findUnique({
    where: { userId: session.userId },
    select: { bankName: true, accountName: true, accountNumber: true, accountType: true },
  });

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
    { label: "Payout details", done: !!bankDetails },
  ];

  const completedCount = completenessItems.filter((i) => i.done).length;
  const totalCount = completenessItems.length;
  const completionPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <VendorDashboardTabs
        store={store}
        listings={listings}
        splitOrders={splitOrders}
        bankDetails={bankDetails}
        completenessItems={completenessItems}
        completedCount={completedCount}
        totalCount={totalCount}
        completionPercent={completionPercent}
        dashboardSuccessMessage={dashboardSuccessMessage}
        dashboardErrorMessage={dashboardErrorMessage}
      />
    </div>
  );
}
