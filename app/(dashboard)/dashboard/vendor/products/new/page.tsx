import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";
import { ProductForm } from "./product-form";

export default async function NewVendorProductPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") {
    redirect("/login");
  }

  const store = await getStoreByOwnerId(user.id);
  if (!store) {
    redirect("/onboarding/business/step-3");
  }

  return (
    <div className="bg-[#f5f5f5] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <ProductForm />
      </div>
    </div>
  );
}
