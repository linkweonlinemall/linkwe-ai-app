import Link from "next/link";
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
    <div className="min-h-screen bg-[#f5f5f5] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/dashboard/vendor/products"
            className="text-sm font-medium text-zinc-600 hover:text-[#D4450A]"
          >
            ← Products
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">Add product</h1>
        <p className="mt-1 text-sm text-zinc-600">Physical products only.</p>
        <div className="mt-8">
          <ProductForm />
        </div>
      </div>
    </div>
  );
}
