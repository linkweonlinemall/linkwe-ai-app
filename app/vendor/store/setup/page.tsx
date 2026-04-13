import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";

/** Store identity is created in Phase A onboarding (`/onboarding/business/step-3`). */
export default async function VendorStoreSetupPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "VENDOR") {
    redirect("/login");
  }

  const store = await getStoreByOwnerId(user.id);
  if (store) {
    redirect("/dashboard/vendor");
  }

  redirect("/onboarding/business/step-3");
}
