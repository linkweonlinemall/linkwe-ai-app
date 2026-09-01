import Link from "next/link";
import { redirect } from "next/navigation";
import { getLinkedContent } from "@/app/actions/content-links";
import { getProductVariants } from "@/app/actions/product-variants";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";
import { ProductEditForm, type VendorProductEditPayload } from "./product-edit-form";
import { parseCheckoutFields } from "@/lib/checkout/custom-fields";

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
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      shortDescription: true,
      category: true,
      brand: true,
      tags: true,
      condition: true,
      price: true,
      compareAtPrice: true,
      sku: true,
      stock: true,
      images: true,
      weight: true,
      weightUnit: true,
      length: true,
      width: true,
      height: true,
      allowDelivery: true,
      allowPickup: true,
      returnPolicy: true,
      address: true,
      latitude: true,
      longitude: true,
      isPublished: true,
      isFeatured: true,
      metaTitle: true,
      metaDescription: true,
      hasVariants: true,
      isDigital: true,
      digitalFileUrl: true,
      previewUrl: true,
      fileType: true,
      fileSizeKb: true,
      downloadLimit: true,
      downloadExpiryDays: true,
      licenceType: true,
      checkoutFields: true,
    },
  });

  if (!row) {
    redirect("/dashboard/vendor/products");
  }

  const [variants, { items: initialRelatedItems }] = await Promise.all([
    getProductVariants(row.id),
    getLinkedContent("PRODUCT", row.id, { includeUnpublished: true }),
  ]);

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
    hasVariants: row.hasVariants,
    isDigital: row.isDigital,
    digitalFileUrl: row.digitalFileUrl,
    previewUrl: row.previewUrl,
    fileType: row.fileType,
    fileSizeKb: row.fileSizeKb,
    downloadLimit: row.downloadLimit,
    downloadExpiryDays: row.downloadExpiryDays,
    licenceType: row.licenceType,
    checkoutFields: parseCheckoutFields(row.checkoutFields),
  };

  return (
    <div className="bg-[#f5f5f5] px-4 pt-6 pb-12 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/dashboard/vendor/products"
            className="text-sm font-medium text-zinc-600 hover:text-[#D4450A]"
          >
            ← Products
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">Edit product</h1>
        <p className="mt-1 text-sm text-zinc-600">{product.name}</p>
        <div className="mt-8">
          <ProductEditForm
            product={product}
            initialRelatedItems={initialRelatedItems}
            variants={variants.map((v) => ({
              id: v.id,
              name: v.name,
              attributes: v.attributes,
              price: v.price,
              stock: v.stock,
              sku: v.sku,
              images: v.images,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
