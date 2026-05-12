import { redirect } from "next/navigation";

import FloatingAIChat from "@/components/vendor/floating-ai-chat";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getNextBusinessOnboardingStep } from "@/lib/onboarding/business-progress";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";

import VendorSidebarWrapper from "./components/VendorSidebarWrapper";

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

  return (
    <div className="flex min-h-screen bg-[#F5F5F5]">
      <VendorSidebarWrapper />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      <FloatingAIChat />
    </div>
  );
}
