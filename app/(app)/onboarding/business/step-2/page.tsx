import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";
import { getNextBusinessOnboardingStep } from "@/lib/onboarding/business-progress";
import { BusinessStep2Form } from "./step-2-form";

export default async function BusinessOnboardingStep2Page() {
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") redirect("/login");

  const store = await getStoreByOwnerId(user.id);
  const next = getNextBusinessOnboardingStep(user, store);
  if (next === null) redirect("/dashboard/vendor");
  if (next < 2) redirect("/onboarding/business/step-1");
  if (next > 2) redirect(`/onboarding/business/step-${next}`);

  return (
    <div className="flex justify-center">
      <BusinessStep2Form />
    </div>
  );
}
