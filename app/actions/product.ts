"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma, ProductCondition, WeightUnit } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/uploads/upload";

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
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function optionalInt(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
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
    select: { id: true },
  });
  if (!store) {
    return { ok: false, errors: { _general: "No store found for your account." } };
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
  const allowDelivery = formData.get("allowDelivery") === "true";
  const allowPickup = formData.get("allowPickup") === "on";
  const weightRaw = String(formData.get("weight") ?? "");
  const weightUnitRaw = String(formData.get("weightUnit") ?? "").trim();
  const lengthRaw = String(formData.get("length") ?? "");
  const widthRaw = String(formData.get("width") ?? "");
  const heightRaw = String(formData.get("height") ?? "");
  const returnPolicy = String(formData.get("returnPolicy") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const latRaw = String(formData.get("latitude") ?? "");
  const lngRaw = String(formData.get("longitude") ?? "");
  const intent = String(formData.get("intent") ?? "").trim();

  const fieldErr = validatePhysicalProductFields({ name, slugRaw, priceRaw, conditionRaw });
  if (fieldErr) return { ok: false, errors: fieldErr };

  const condition = conditionRaw as ProductCondition;
  const price = Number(priceRaw);
  const compareAtPrice = optionalFloat(compareRaw);
  const stock = optionalInt(stockRaw);

  let baseSlug = sanitizeSlug(slugRaw);
  if (!baseSlug) baseSlug = sanitizeSlug(name) || "product";
  const slug = await uniqueProductSlug(baseSlug);

  const imageFiles = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (imageFiles.length > 10) {
    return { ok: false, errors: { images: "You can upload at most 10 images." } };
  }

  const imageUrls: string[] = [];
  for (const file of imageFiles) {
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
    isDigital: false,
    isBookable: false,
  };

  try {
    await prisma.product.create({ data });
  } catch (e) {
    console.error(e);
    return { ok: false, errors: { _general: "Could not save product. Try again." } };
  }

  revalidatePath(PRODUCTS_PATH);
  redirect(PRODUCTS_PATH);
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
  const allowDelivery = formData.get("allowDelivery") === "true";
  const allowPickup = formData.get("allowPickup") === "on";
  const weightRaw = String(formData.get("weight") ?? "");
  const weightUnitRaw = String(formData.get("weightUnit") ?? "").trim();
  const lengthRaw = String(formData.get("length") ?? "");
  const widthRaw = String(formData.get("width") ?? "");
  const heightRaw = String(formData.get("height") ?? "");
  const returnPolicy = String(formData.get("returnPolicy") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const latRaw = String(formData.get("latitude") ?? "");
  const lngRaw = String(formData.get("longitude") ?? "");
  const intent = String(formData.get("intent") ?? "").trim();

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

  let baseSlug = sanitizeSlug(slugRaw);
  if (!baseSlug) baseSlug = sanitizeSlug(name) || "product";
  const slug = await uniqueProductSlug(baseSlug, productId);

  const newUrls: string[] = [];
  for (const file of newFiles) {
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
        isDigital: false,
        isBookable: false,
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
