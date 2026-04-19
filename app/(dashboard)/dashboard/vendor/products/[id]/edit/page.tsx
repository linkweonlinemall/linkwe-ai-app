import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";
import { ProductEditForm, type VendorProductEditPayload } from "./product-edit-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditVendorProductPage({ params }: Props) {
  const { id } = await params;
  if (!id?.trim()) {
    redirect("/dashboard/vendor/products");
  }

  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") {
    redirect("/login");
  }

  const store = await getStoreByOwnerId(user.id);
  if (!store) {
    redirect("/onboarding/business/step-3");
  }

  const row = await prisma.product.findFirst({
    where: { id, storeId: store.id },
  });

  if (!row) {
    redirect("/dashboard/vendor/products");
  }

  const product: VendorProductEditPayload = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    shortDescription: row.shortDescription,
    category: row.category,
    brand: row.brand,
    tagsDisplay: row.tags.join(", "),
    condition: row.condition,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    sku: row.sku,
    stock: row.stock,
    images: row.images,
    weight: row.weight,
    weightUnit: row.weightUnit,
    length: row.length,
    width: row.width,
    height: row.height,
    allowDelivery: row.allowDelivery,
    allowPickup: row.allowPickup,
    returnPolicy: row.returnPolicy,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    isPublished: row.isPublished,
    isFeatured: row.isFeatured,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    deliveryFee: row.deliveryFee,
    deliveryRegions: row.deliveryRegions,
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/dashboard/vendor/products"
            className="text-sm font-medium text-zinc-600 hover:text-[#D4450A] dark:text-zinc-400"
          >
            ← Products
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Edit product</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{product.name}</p>
        <div className="mt-8">
          <ProductEditForm product={product} />
        </div>
      </div>
    </div>
  );
}
