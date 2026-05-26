"use client";

import { usePathname } from "next/navigation";

import VendorDashboardSidebar from "@/components/vendor/vendor-dashboard-sidebar";
import VendorDashboardTopbar from "@/components/vendor/vendor-dashboard-topbar";
import VendorMobileBottomNav from "@/components/vendor/vendor-mobile-bottom-nav";
import FloatingAIChat from "@/components/vendor/floating-ai-chat";

export type VendorDashboardShellProps = {
  children: React.ReactNode;
  storeName: string;
  storeSlug: string;
  storeLogoUrl: string | null;
  userFirstName: string;
  unreadCount: number;
  pendingRequestsCount: number;
  activeOrdersCount: number;
};

export default function VendorDashboardShell({
  children,
  storeName,
  storeSlug,
  storeLogoUrl,
  userFirstName,
  unreadCount,
  pendingRequestsCount,
  activeOrdersCount,
}: VendorDashboardShellProps) {
  const pathname = usePathname() ?? "";
  const isAIAssistant = pathname.includes("/ai-assistant");

  if (isAIAssistant) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F7F5F2]">
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        <FloatingAIChat />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-[#F7F5F2]">
      <VendorDashboardSidebar
        storeName={storeName}
        storeSlug={storeSlug}
        storeLogoUrl={storeLogoUrl}
        pendingRequestsCount={pendingRequestsCount}
        activeOrdersCount={activeOrdersCount}
      />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col md:ml-[60px] lg:ml-[220px]">
        <VendorDashboardTopbar firstName={userFirstName} unreadCount={unreadCount} />

        <div className="vendor-main-scroll min-h-0 flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0 bg-[#F7F5F2]">
          {children}
        </div>

        <VendorMobileBottomNav />
        <FloatingAIChat />
      </div>
    </div>
  );
}
