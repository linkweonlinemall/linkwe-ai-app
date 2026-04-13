import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";
import { ListingCreateForm } from "./listing-form";

export default async function NewListingPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") {
    redirect("/login");
  }

  const store = await getStoreByOwnerId(user.id);
  if (!store) {
    redirect("/onboarding/business/step-3");
  }

  return <ListingCreateForm />;
}
