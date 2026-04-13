import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";
import { getNextBusinessOnboardingStep } from "@/lib/onboarding/business-progress";
import { BusinessStep1Form } from "./step-1-form";

export default async function BusinessOnboardingStep1Page() {
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") redirect("/login");

  const store = await getStoreByOwnerId(user.id);
  const next = getNextBusinessOnboardingStep(user, store);
  if (next === null) redirect("/dashboard/vendor");
  if (next !== 1) redirect(`/onboarding/business/step-${next}`);

  return (
    <div className="flex justify-center">
      <BusinessStep1Form defaultFullName={user.fullName} defaultPhone={user.phone ?? ""} defaultRegion={user.region ?? ""} />
    </div>
  );
}
