import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveAuthLandingPath } from "@/lib/auth/landing";
import { getNextBusinessOnboardingStep } from "@/lib/onboarding/business-progress";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";

export default async function VendorAreaLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "VENDOR") {
    redirect(await resolveAuthLandingPath(user));
  }

  const store = await getStoreByOwnerId(user.id);
  const nextStep = getNextBusinessOnboardingStep(user, store);
  if (nextStep !== null) {
    redirect(`/onboarding/business/step-${nextStep}`);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <div className="border-b border-zinc-200 bg-white px-6 py-4">
        <p className="text-sm font-semibold text-zinc-900">Vendor · Store setup</p>
      </div>
      <div className="flex flex-1 flex-col items-center px-6 py-10">{children}</div>
    </div>
  );
}
