"use client";

import { Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";
import type { IdVerificationStatus, StoreStatus } from "@prisma/client";

import VendorDashboardSidebar from "@/components/vendor/vendor-dashboard-sidebar";
import VendorDashboardTopbar from "@/components/vendor/vendor-dashboard-topbar";
import VendorMobileBottomNav from "@/components/vendor/vendor-mobile-bottom-nav";
import FloatingAIChat from "@/components/vendor/floating-ai-chat";

export type VendorDashboardShellProps = {
  children: React.ReactNode;
  storeName: string;
  storeSlug: string;
  storeLogoUrl: string | null;
  storeStatus: StoreStatus;
  idVerificationStatus: IdVerificationStatus;
  userFirstName: string;
  unreadCount: number;
  pendingRequestsCount: number;
  activeOrdersCount: number;
  aiEnabled: boolean;
  renderedAt: string;
};

export default function VendorDashboardShell({
  children,
  storeName,
  storeSlug,
  storeLogoUrl,
  storeStatus,
  idVerificationStatus,
  userFirstName,
  unreadCount,
  pendingRequestsCount,
  activeOrdersCount,
  aiEnabled,
  renderedAt,
}: VendorDashboardShellProps) {
  const pathname = usePathname() ?? "";
  const isAIAssistant = pathname.includes("/ai-assistant");

  useEffect(() => {
    document.querySelector<HTMLElement>(".vendor-main-scroll")?.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  if (isAIAssistant) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F7F5F2]">
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 bg-[#F7F5F2]">
      <Suspense fallback={null}>
        <VendorDashboardSidebar
          storeName={storeName}
          storeSlug={storeSlug}
          storeLogoUrl={storeLogoUrl}
          storeStatus={storeStatus}
          idVerificationStatus={idVerificationStatus}
          pendingRequestsCount={pendingRequestsCount}
          activeOrdersCount={activeOrdersCount}
        />
      </Suspense>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col md:ml-[60px] lg:ml-[220px]">
        <VendorDashboardTopbar
          firstName={userFirstName}
          unreadCount={unreadCount}
          aiEnabled={aiEnabled}
          renderedAt={renderedAt}
        />

        <div className="vendor-main-scroll min-h-0 min-w-0 flex-1 overflow-y-auto bg-[#F7F5F2] pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
          {children}
        </div>

        <Suspense fallback={null}>
          <VendorMobileBottomNav />
        </Suspense>
        <FloatingAIChat aiEnabled={aiEnabled} />
      </div>
    </div>
  );
}
