"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, type ProductCondition, type WeightUnit, type LicenceType } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { checkProductCap } from "@/lib/finance/product-cap";
import { uploadFile } from "@/lib/uploads/upload";
import { parseCheckoutFields } from "@/lib/checkout/custom-fields";

const PRODUCTS_PATH = "/dashboard/vendor/products";

export type ProductFieldErrors = Record<string, string>;

function sanitizeSlug(raw: string): string {
  let s = raw.trim().toLowerCase().replace(/\s+/g, "-");
  s = s.replace(/[^a-z0-9-]/g, "");
  s = s.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return s;
}

async function uniqueProductSlug(base: string, excludeProductId?: string): Promise<string> {
  let candidate = base || "product";
  let suffix = 2;
  for (;;) {
    const clash = await prisma.product.findFirst({
      where: {
        slug: candidate,
        ...(excludeProductId ? { NOT: { id: excludeProductId } } : {}),
      },
      select: { id: true },
    });
    if (!clash) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function optionalFloat(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function optionalInt(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function checkoutFieldsFromForm(formData: FormData): ReturnType<typeof parseCheckoutFields> {
  try { return parseCheckoutFields(JSON.parse(String(formData.get("checkoutFields") ?? "[]"))); }
  catch { return []; }
}

function validatePhysicalProductFields(data: {
  name: string;
  slugRaw: string;
  priceRaw: string;
  conditionRaw: string;
}): ProductFieldErrors | null {
  const errors: ProductFieldErrors = {};
  if (!data.name.trim()) errors.name = "Name is required.";
  if (!data.slugRaw.trim()) errors.slug = "Slug is required.";
  if (!data.priceRaw.trim()) errors.price = "Price is required.";
  else {
    const p = Number(data.priceRaw);
    if (!Number.isFinite(p) || p < 0) errors.price = "Enter a valid price.";
    else if (p > 10_000_000) errors.price = "Price is too high — please check the amount.";
  }
  const cond = data.conditionRaw as ProductCondition;
  if (!["NEW", "USED", "REFURBISHED"].includes(cond)) {
    errors.condition = "Select a condition.";
  }
  return Object.keys(errors).length ? errors : null;
}

export async function createProduct(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: false; errors: ProductFieldErrors } | void> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") {
    redirect("/");
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true, subscriptionPlan: true, subscriptionStatus: true },
  });
  if (!store) {
    return { ok: false, errors: { _general: "No store found for your account." } };
  }

  const cap = await checkProductCap(
    store.id,
    store.subscriptionPlan,
    store.subscriptionStatus,
    1,
  );
  if (!cap.ok) return { ok: false, errors: { _general: cap.reason } };

  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;
  const brand = String(formData.get("brand") ?? "").trim() || null;
  const tagsRaw = String(formData.get("tags") ?? "");
  const conditionRaw = String(formData.get("condition") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "");
  const compareRaw = String(formData.get("compareAtPrice") ?? "");
  const sku = String(formData.get("sku") ?? "").trim() || null;
  const stockRaw = String(formData.get("stock") ?? "");
  const weightRaw = String(formData.get("weight") ?? "");
  const weightUnitRaw = String(formData.get("weightUnit") ?? "").trim();
  const lengthRaw = String(formData.get("length") ?? "");
  const widthRaw = String(formData.get("width") ?? "");
  const heightRaw = String(formData.get("height") ?? "");
  const returnPolicy = String(formData.get("returnPolicy") ?? "").trim() || null;
  const address = String(formData.get("locationAddress") ?? "").trim() || null;
  const latRaw = String(formData.get("locationLat") ?? "");
  const lngRaw = String(formData.get("locationLng") ?? "");
  const intent = String(formData.get("intent") ?? "").trim();

  const shortDescription = String(formData.get("shortDescription") ?? "").trim() || null;
  const isFeatured = formData.get("isFeatured") === "on";
  const metaTitle = String(formData.get("metaTitle") ?? "").trim() || null;
  const metaDescription = String(formData.get("metaDescription") ?? "").trim() || null;

  const isDigital = formData.get("isDigital") === "true";
  const digitalFileUrl = isDigital ? (String(formData.get("digitalFileUrl") ?? "").trim() || null) : null;
  const previewUrl = isDigital ? (String(formData.get("previewUrl") ?? "").trim() || null) : null;
  const fileType = isDigital ? (String(formData.get("fileType") ?? "").trim() || null) : null;
  const fileSizeKbRaw =
    isDigital && formData.get("fileSizeKb") ? parseInt(String(formData.get("fileSizeKb")), 10) : null;
  const fileSizeKb =
    fileSizeKbRaw !== null && !Number.isNaN(fileSizeKbRaw) ? fileSizeKbRaw : null;
  const downloadLimitRaw =
    isDigital && formData.get("downloadLimit") ? parseInt(String(formData.get("downloadLimit")), 10) : null;
  const downloadLimit =
    downloadLimitRaw !== null && !Number.isNaN(downloadLimitRaw) ? downloadLimitRaw : null;
  const downloadExpiryRaw =
    isDigital && formData.get("downloadExpiryDays")
      ? parseInt(String(formData.get("downloadExpiryDays")), 10)
      : null;
  const downloadExpiryDays =
    downloadExpiryRaw !== null && !Number.isNaN(downloadExpiryRaw) ? downloadExpiryRaw : null;
  const licenceTypeRaw = isDigital ? (String(formData.get("licenceType") ?? "").trim() || null) : null;
  const licenceType: LicenceType | null =
    licenceTypeRaw === "PERSONAL" || licenceTypeRaw === "COMMERCIAL" || licenceTypeRaw === "EXTENDED"
      ? (licenceTypeRaw as LicenceType)
      : null;

  const allowDelivery = isDigital ? false : formData.get("allowDelivery") === "true";
  const allowPickup = isDigital ? false : formData.get("allowPickup") === "on";

  const fieldErr = validatePhysicalProductFields({ name, slugRaw, priceRaw, conditionRaw });
  if (fieldErr) return { ok: false, errors: fieldErr };

  const condition = conditionRaw as ProductCondition;
  const price = Number(priceRaw);
  const compareAtPrice = optionalFloat(compareRaw);
  const stock = optionalInt(stockRaw);

  if (compareAtPrice !== null && compareAtPrice > 10_000_000) {
    return { ok: false, errors: { compareAtPrice: "Price is too high — please check the amount." } };
  }
  if (compareAtPrice !== null && compareAtPrice > 0 && compareAtPrice <= price) {
    return { ok: false, errors: { compareAtPrice: "Compare-at price must be higher than the actual price." } };
  }

  let baseSlug = sanitizeSlug(slugRaw);
  if (!baseSlug) baseSlug = sanitizeSlug(name) || "product";
  const slug = await uniqueProductSlug(baseSlug);

  const imageFiles = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (imageFiles.length > 10) {
    return { ok: false, errors: { images: "You can upload at most 10 images." } };
  }

  const imageUrls: string[] = [];
  for (const file of imageFiles) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return { ok: false, errors: { images: "Only JPG, PNG, and WebP images are allowed." } };
    }
    try {
      imageUrls.push(await uploadFile(file, "products"));
    } catch {
      return { ok: false, errors: { images: "One or more images failed to upload. Try again." } };
    }
  }

  const weight = allowDelivery ? optionalFloat(weightRaw) : null;
  const weightUnit: WeightUnit | null =
    allowDelivery && weightUnitRaw && (weightUnitRaw === "KG" || weightUnitRaw === "LB")
      ? weightUnitRaw
      : null;
  const length = allowDelivery ? optionalFloat(lengthRaw) : null;
  const width = allowDelivery ? optionalFloat(widthRaw) : null;
  const height = allowDelivery ? optionalFloat(heightRaw) : null;

  const latitude = optionalFloat(latRaw);
  const longitude = optionalFloat(lngRaw);

  const isPublished = intent === "publish";
  const checkoutFields = checkoutFieldsFromForm(formData);

  if (isDigital && isPublished && !digitalFileUrl) {
    return { ok: false, errors: { _general: "Add a downloadable file before publishing a digital product." } };
  }

  const data: Prisma.ProductCreateInput = {
    store: { connect: { id: store.id } },
    name,
    slug,
    description,
    category,
    brand,
    tags: parseTags(tagsRaw),
    condition,
    price,
    compareAtPrice,
    sku,
    stock,
    images: imageUrls,
    weight,
    weightUnit,
    length,
    width,
    height,
    allowDelivery,
    allowPickup,
    returnPolicy,
    latitude,
    longitude,
    address,
    isPublished,
    shortDescription,
    isFeatured,
    metaTitle,
    metaDescription,
    isDigital,
    digitalFileUrl,
    previewUrl,
    fileType,
    fileSizeKb,
    downloadLimit,
    downloadExpiryDays,
    licenceType,
    isBookable: false,
    checkoutFields: checkoutFields.length > 0 ? checkoutFields : Prisma.DbNull,
  };

  try {
    const product = await prisma.product.create({ data });

    const hasVariants = formData.get("hasVariants") === "true";
    const variantsJson = formData.get("variantsJson") as string;

    if (hasVariants && variantsJson) {
      try {
        const variants = JSON.parse(variantsJson) as unknown;
        if (Array.isArray(variants) && variants.length > 0) {
          await prisma.product.update({
            where: { id: product.id },
            data: { hasVariants: true },
          });
          for (const v of variants as {
            name?: string;
            sku?: unknown;
            price?: unknown;
            stock?: unknown;
            images?: unknown;
            attributes?: unknown;
          }[]) {
            await prisma.productVariant.create({
              data: {
                productId: product.id,
                name: v.name ?? "",
                sku: v.sku != null ? String(v.sku) : null,
                price: v.price != null ? parseFloat(String(v.price)) : null,
                stock: v.stock != null ? parseInt(String(v.stock), 10) : null,
                images: Array.isArray(v.images) ? v.images : [],
                attributes: (Array.isArray(v.attributes) ? v.attributes : []) as Prisma.InputJsonValue,
              },
            });
          }
        }
      } catch {
        // variants parse failed — continue without them
      }
    }
  } catch (e) {
    console.error(e);
    return { ok: false, errors: { _general: "Could not save product. Try again." } };
  }

  revalidatePath(PRODUCTS_PATH);
  redirect(isPublished ? `${PRODUCTS_PATH}?product_published=1` : PRODUCTS_PATH);
}

export async function updateProduct(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: false; errors: ProductFieldErrors } | { ok: false; error: string } | void> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") {
    redirect("/");
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) {
    return { ok: false, errors: { _general: "No store found for your account." } };
  }

  const productId = String(formData.get("productId") ?? "").trim();
  if (!productId) {
    return { ok: false, errors: { _general: "Missing product." } };
  }

  const existing = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, error: "Unauthorised" };
  }

  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;
  const brand = String(formData.get("brand") ?? "").trim() || null;
  const tagsRaw = String(formData.get("tags") ?? "");
  const conditionRaw = String(formData.get("condition") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "");
  const compareRaw = String(formData.get("compareAtPrice") ?? "");
  const sku = String(formData.get("sku") ?? "").trim() || null;
  const stockRaw = String(formData.get("stock") ?? "");
  const weightRaw = String(formData.get("weight") ?? "");
  const weightUnitRaw = String(formData.get("weightUnit") ?? "").trim();
  const lengthRaw = String(formData.get("length") ?? "");
  const widthRaw = String(formData.get("width") ?? "");
  const heightRaw = String(formData.get("height") ?? "");
  const returnPolicy = String(formData.get("returnPolicy") ?? "").trim() || null;
  const address = String(formData.get("locationAddress") ?? "").trim() || null;
  const latRaw = String(formData.get("locationLat") ?? "");
  const lngRaw = String(formData.get("locationLng") ?? "");
  const intent = String(formData.get("intent") ?? "").trim();

  const shortDescription = String(formData.get("shortDescription") ?? "").trim() || null;
  const isFeatured = formData.get("isFeatured") === "on";
  const metaTitle = String(formData.get("metaTitle") ?? "").trim() || null;
  const metaDescription = String(formData.get("metaDescription") ?? "").trim() || null;

  const isDigital = formData.get("isDigital") === "true";
  const digitalFileUrl = isDigital ? (String(formData.get("digitalFileUrl") ?? "").trim() || null) : null;
  const previewUrl = isDigital ? (String(formData.get("previewUrl") ?? "").trim() || null) : null;
  const fileType = isDigital ? (String(formData.get("fileType") ?? "").trim() || null) : null;
  const fileSizeKbRaw =
    isDigital && formData.get("fileSizeKb") ? parseInt(String(formData.get("fileSizeKb")), 10) : null;
  const fileSizeKb =
    fileSizeKbRaw !== null && !Number.isNaN(fileSizeKbRaw) ? fileSizeKbRaw : null;
  const downloadLimitRaw =
    isDigital && formData.get("downloadLimit") ? parseInt(String(formData.get("downloadLimit")), 10) : null;
  const downloadLimit =
    downloadLimitRaw !== null && !Number.isNaN(downloadLimitRaw) ? downloadLimitRaw : null;
  const downloadExpiryRaw =
    isDigital && formData.get("downloadExpiryDays")
      ? parseInt(String(formData.get("downloadExpiryDays")), 10)
      : null;
  const downloadExpiryDays =
    downloadExpiryRaw !== null && !Number.isNaN(downloadExpiryRaw) ? downloadExpiryRaw : null;
  const licenceTypeRaw = isDigital ? (String(formData.get("licenceType") ?? "").trim() || null) : null;
  const licenceType: LicenceType | null =
    licenceTypeRaw === "PERSONAL" || licenceTypeRaw === "COMMERCIAL" || licenceTypeRaw === "EXTENDED"
      ? (licenceTypeRaw as LicenceType)
      : null;

  const allowDelivery = isDigital ? false : formData.get("allowDelivery") === "true";
  const allowPickup = isDigital ? false : formData.get("allowPickup") === "on";

  const existingImagesJson = String(formData.get("existingImages") ?? "[]");
  let existingUrls: string[] = [];
  try {
    const parsed = JSON.parse(existingImagesJson);
    if (Array.isArray(parsed)) existingUrls = parsed.filter((u) => typeof u === "string");
  } catch {
    return { ok: false, errors: { images: "Invalid existing images payload." } };
  }

  const newFiles = formData.getAll("newImages").filter((f): f is File => f instanceof File && f.size > 0);
  if (existingUrls.length + newFiles.length > 10) {
    return { ok: false, errors: { images: "Combined images cannot exceed 10." } };
  }

  const fieldErr = validatePhysicalProductFields({ name, slugRaw, priceRaw, conditionRaw });
  if (fieldErr) return { ok: false, errors: fieldErr };

  const condition = conditionRaw as ProductCondition;
  const price = Number(priceRaw);
  const compareAtPrice = optionalFloat(compareRaw);
  const stock = optionalInt(stockRaw);

  if (compareAtPrice !== null && compareAtPrice > 10_000_000) {
    return { ok: false, errors: { compareAtPrice: "Price is too high — please check the amount." } };
  }
  if (compareAtPrice !== null && compareAtPrice > 0 && compareAtPrice <= price) {
    return { ok: false, errors: { compareAtPrice: "Compare-at price must be higher than the actual price." } };
  }

  let baseSlug = sanitizeSlug(slugRaw);
  if (!baseSlug) baseSlug = sanitizeSlug(name) || "product";
  const slug = await uniqueProductSlug(baseSlug, productId);

  const newUrls: string[] = [];
  for (const file of newFiles) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return { ok: false, errors: { images: "Only JPG, PNG, and WebP images are allowed." } };
    }
    try {
      newUrls.push(await uploadFile(file, "products"));
    } catch {
      return { ok: false, errors: { images: "One or more new images failed to upload." } };
    }
  }
  const images = [...existingUrls, ...newUrls];

  const weight = allowDelivery ? optionalFloat(weightRaw) : null;
  const weightUnit: WeightUnit | null =
    allowDelivery && weightUnitRaw && (weightUnitRaw === "KG" || weightUnitRaw === "LB")
      ? weightUnitRaw
      : null;
  const length = allowDelivery ? optionalFloat(lengthRaw) : null;
  const width = allowDelivery ? optionalFloat(widthRaw) : null;
  const height = allowDelivery ? optionalFloat(heightRaw) : null;

  const latitude = optionalFloat(latRaw);
  const longitude = optionalFloat(lngRaw);
  const checkoutFields = checkoutFieldsFromForm(formData);

  let isPublished: boolean;
  if (intent === "publish") isPublished = true;
  else if (intent === "unpublish") isPublished = false;
  else if (intent === "save") {
    const current = await prisma.product.findUnique({
      where: { id: productId },
      select: { isPublished: true },
    });
    isPublished = current?.isPublished ?? false;
  } else {
    isPublished = false;
  }

  if (isDigital && isPublished && !digitalFileUrl) {
    return { ok: false, errors: { _general: "Add a downloadable file before publishing a digital product." } };
  }

  try {
    await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        slug,
        description,
        category,
        brand,
        tags: parseTags(tagsRaw),
        condition,
        price,
        compareAtPrice,
        sku,
        stock,
        images,
        weight,
        weightUnit,
        length,
        width,
        height,
        allowDelivery,
        allowPickup,
        returnPolicy,
        latitude,
        longitude,
        address,
        isPublished,
        shortDescription,
        isFeatured,
        metaTitle,
        metaDescription,
        isDigital,
        digitalFileUrl,
        previewUrl,
        fileType,
        fileSizeKb,
        downloadLimit,
        downloadExpiryDays,
        licenceType,
        isBookable: false,
        hasVariants: formData.get("hasVariants") === "true",
        checkoutFields: checkoutFields.length > 0 ? checkoutFields : Prisma.DbNull,
      },
    });
  } catch (e) {
    console.error(e);
    return { ok: false, errors: { _general: "Could not update product." } };
  }

  revalidatePath(PRODUCTS_PATH);
  redirect(PRODUCTS_PATH);
}

export async function toggleProductPublished(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") {
    return;
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) {
    return;
  }

  const productId = String(formData.get("productId") ?? "").trim();
  if (!productId) {
    return;
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id },
    select: { id: true, isPublished: true },
  });
  if (!product) {
    return;
  }

  await prisma.product.update({
    where: { id: productId },
    data: { isPublished: !product.isPublished },
  });

  revalidatePath(PRODUCTS_PATH);
}
