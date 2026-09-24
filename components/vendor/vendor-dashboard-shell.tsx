"use client";

import { Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";
import type { IdVerificationStatus, StoreStatus } from "@prisma/client";

import VendorDashboardSidebar from "@/components/vendor/vendor-dashboard-sidebar";
import VendorDashboardTopbar from "@/components/vendor/vendor-dashboard-topbar";
import VendorMobileBottomNav from "@/components/vendor/vendor-mobile-bottom-nav";
import FloatingAIChat from "@/components/vendor/floating-ai-chat";
import s from "./workspace.module.css";
import VendorWorkspaceMenu from "./VendorWorkspaceMenu";
import VendorGuidedTours from "@/components/vendor/VendorGuidedTours";

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

  return <>
    {isAIAssistant ? (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F7F5F2]">
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    ) : (
    <div className={s.shell}>
      <a href="#vendor-workspace-content" className={s.skipLink}>Skip to workspace</a>
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

      <div className={s.mainColumn}>
        <VendorDashboardTopbar
          firstName={userFirstName}
          unreadCount={unreadCount}
          renderedAt={renderedAt}
        />

        <div id="vendor-workspace-content" tabIndex={-1} className={`vendor-main-scroll ${s.mainScroll}`}>
          {children}
        </div>

        <Suspense fallback={null}>
          <VendorMobileBottomNav activeOrdersCount={activeOrdersCount} pendingRequestsCount={pendingRequestsCount} />
        </Suspense>
        <VendorWorkspaceMenu />
        <FloatingAIChat aiEnabled={aiEnabled} />
      </div>
    </div>
    )}
    <VendorGuidedTours />
  </>;
}
