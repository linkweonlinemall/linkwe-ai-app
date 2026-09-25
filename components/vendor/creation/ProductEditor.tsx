import { redirect } from "next/navigation";
import { getLinkedContent } from "@/app/actions/content-links";
import { getProductVariants } from "@/app/actions/product-variants";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";
import { ProductEditForm, type VendorProductEditPayload } from "@/app/(dashboard)/dashboard/vendor/products/[id]/edit/product-edit-form";
import { parseCheckoutFields } from "@/lib/checkout/custom-fields";

type Props = { params: Promise<{ id: string }> };

export default async function ProductEditor({ params }: Props) {
  const { id } = await params;
  if (!id?.trim()) {
    redirect("/dashboard/vendor/creation?type=product");
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
    where: { id, storeId: store.id, isService: false },
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
    redirect("/dashboard/vendor/creation?type=product");
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
  );
}
