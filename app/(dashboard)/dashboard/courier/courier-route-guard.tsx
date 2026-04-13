"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const COURIER_ONBOARDING_PREFIX = "/dashboard/courier/onboarding";

/**
 * Sends incomplete couriers to onboarding without trapping them in a redirect loop
 * when they are already under `/dashboard/courier/onboarding`.
 */
export function CourierRouteGuard({
  courierOnboardingStep,
  children,
}: {
  courierOnboardingStep: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const path = pathname ?? "";
  const onCourierOnboarding = path.startsWith(COURIER_ONBOARDING_PREFIX);

  useEffect(() => {
    if (courierOnboardingStep >= 2) return;
    if (!path) return;
    if (path.startsWith(COURIER_ONBOARDING_PREFIX)) return;
    router.replace("/dashboard/courier/onboarding?step=1");
  }, [courierOnboardingStep, path, router]);

  if (path === "/dashboard/courier") {
    return children;
  }

  if (courierOnboardingStep >= 2) {
    return children;
  }

  if (onCourierOnboarding) {
    return children;
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-zinc-500 dark:text-zinc-400">
      Redirecting to onboarding…
    </div>
  );
}
