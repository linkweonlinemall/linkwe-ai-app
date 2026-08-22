import { redirect } from "next/navigation";

import VendorDashboardShell from "@/components/vendor/vendor-dashboard-shell";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getNextBusinessOnboardingStep } from "@/lib/onboarding/business-progress";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";
import { getVendorNavCounts } from "@/lib/vendor/get-vendor-nav-counts";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { getStorePlan } from "@/lib/finance/store-plan";
import { prisma } from "@/lib/prisma";

export default async function VendorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "VENDOR") redirect(getRoleDashboardPath(user.role));

  const store = await getStoreByOwnerId(user.id);
  const nextStep = getNextBusinessOnboardingStep(user, store);
  if (nextStep !== null) redirect(`/onboarding/business/step-${nextStep}`);

  const fullStore = await prisma.store.findFirst({
    where: { ownerId: user.id },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      status: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      aiTopupCreditsRemaining: true,
    },
  });
  if (!fullStore) redirect("/onboarding/business/step-3");

  const planAllowance = getStorePlan({
    subscriptionPlan: fullStore.subscriptionPlan,
    subscriptionStatus: fullStore.subscriptionStatus,
  }).limits.aiMonthlyAllowance;
  const aiEnabled =
    planAllowance > 0 || fullStore.aiTopupCreditsRemaining > 0;

  const [counts, unreadCount] = await Promise.all([
    getVendorNavCounts(fullStore.id),
    getNavUnreadCount(),
  ]);

  const firstName = user.fullName?.trim().split(/\s+/)[0] ?? "there";

  return (
    <VendorDashboardShell
      storeName={fullStore.name}
      storeSlug={fullStore.slug}
      storeLogoUrl={fullStore.logoUrl}
      storeStatus={fullStore.status}
      idVerificationStatus={user.idVerificationStatus}
      userFirstName={firstName}
      unreadCount={unreadCount}
      pendingRequestsCount={counts.pendingRequestsCount}
      activeOrdersCount={counts.activeOrdersCount}
      aiEnabled={aiEnabled}
      renderedAt={new Date().toISOString()}
    >
      {children}
    </VendorDashboardShell>
  );
}
