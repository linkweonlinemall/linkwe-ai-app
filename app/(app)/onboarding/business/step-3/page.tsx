import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";
import { getNextBusinessOnboardingStep } from "@/lib/onboarding/business-progress";
import { BusinessStep3Form } from "./step-3-form";

export default async function BusinessOnboardingStep3Page() {
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") redirect("/login");

  const store = await getStoreByOwnerId(user.id);
  const next = getNextBusinessOnboardingStep(user, store);
  if (next === null) redirect("/dashboard/vendor");
  if (next < 3) redirect(`/onboarding/business/step-${next}`);

  return (
    <div className="flex justify-center">
      <BusinessStep3Form
        defaultCategoryId={store?.categoryId ?? ""}
        defaultName={store?.name ?? ""}
        defaultRegion={store?.region ?? user.region ?? ""}
        defaultSlug={store?.slug ?? ""}
        defaultTagline={store?.tagline ?? ""}
      />
    </div>
  );
}
