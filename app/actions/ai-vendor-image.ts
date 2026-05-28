"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import {
  formatUploadError,
  getCloudinaryEnvStatus,
} from "@/lib/uploads/cloudinary-config"
import { uploadFile } from "@/lib/uploads/upload"

const ALLOWED_CHAT_MIME = new Set(["image/jpeg", "image/png", "image/webp"])

function isTrustedHostedImageUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return (
      u.protocol === "https:" && u.hostname.toLowerCase().endsWith("cloudinary.com")
    )
  } catch {
    return false
  }
}

export async function uploadProductImage(
  productId: string,
  formData: FormData
): Promise<{ ok: boolean; images?: string[]; error?: string }> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") {
    return { ok: false, error: "Unauthorized" }
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, store: { ownerId: session.userId } },
    select: { id: true, images: true },
  })

  if (!product) return { ok: false, error: "Product not found" }

  const file = formData.get("image")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file provided" }
  }

  if (product.images.length >= 10) {
    return { ok: false, error: "Maximum 10 images allowed" }
  }

  try {
    const url = await uploadFile(file, "products")
    const images = [...product.images, url]
    await prisma.product.update({
      where: { id: product.id },
      data: { images },
    })
    revalidatePath("/dashboard/vendor/products")
    return { ok: true, images }
  } catch {
    return { ok: false, error: "Upload failed. Try again." }
  }
}

/** Upload one or more chat images (JPG/PNG/WebP) and return public URLs. */
export async function uploadVendorChatImages(
  formData: FormData
): Promise<{ ok: true; urls: string[] } | { ok: false; error: string }> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") {
    return { ok: false, error: "Unauthorized" }
  }
  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length === 0) return { ok: false, error: "No images provided" }
  if (files.length > 10) {
    return { ok: false, error: "At most 10 images per message" }
  }

  const cloudinaryStatus = getCloudinaryEnvStatus()
  console.info("[uploadVendorChatImages] attempt", {
    userId: session.userId,
    fileCount: files.length,
    files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
    cloudinary: cloudinaryStatus,
  })

  if (!cloudinaryStatus.allSet) {
    const message = `Cloudinary is not configured. Missing: ${cloudinaryStatus.missing.join(", ")}`
    console.error("[uploadVendorChatImages] config missing", cloudinaryStatus)
    return { ok: false, error: message }
  }

  const urls: string[] = []
  for (const file of files) {
    if (!ALLOWED_CHAT_MIME.has(file.type)) {
      return {
        ok: false,
        error: "Only JPG, PNG, and WebP images are allowed",
      }
    }
    if (file.size > 12 * 1024 * 1024) {
      return { ok: false, error: "Each image must be 12MB or smaller" }
    }
    try {
      const url = await uploadFile(file, "products")
      urls.push(url)
      console.info("[uploadVendorChatImages] uploaded", {
        fileName: file.name,
        urlPrefix: url.slice(0, 48),
      })
    } catch (err) {
      const message = formatUploadError(err)
      console.error("[uploadVendorChatImages] upload failed", {
        fileName: file.name,
        fileSize: file.size,
        cloudinary: cloudinaryStatus,
        error: message,
      })
      return { ok: false, error: message }
    }
  }
  return { ok: true, urls }
}

export async function addProductImagesFromUrls(
  productId: string,
  urls: string[],
  userId: string,
  storeId: string
): Promise<{ ok: true; images: string[] } | { ok: false; error: string }> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR" || session.userId !== userId) {
    return { ok: false, error: "Unauthorized" }
  }
  const store = await prisma.store.findFirst({
    where: { id: storeId, ownerId: userId },
    select: { id: true },
  })
  if (!store) return { ok: false, error: "No store found" }

  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id },
    select: { id: true, images: true },
  })
  if (!product) return { ok: false, error: "Product not found" }

  const trusted = urls.filter(isTrustedHostedImageUrl)
  if (trusted.length === 0) return { ok: false, error: "No valid image URLs" }

  let combined = [...product.images]
  for (const url of trusted) {
    if (combined.length >= 10) break
    if (!combined.includes(url)) combined.push(url)
  }

  await prisma.product.update({
    where: { id: product.id },
    data: { images: combined },
  })
  revalidatePath("/dashboard/vendor/products")
  return { ok: true, images: combined }
}

/** Session-only helper for client UI (no store id required in the browser). */
export async function addProductImagesFromUrlsForVendor(
  productId: string,
  urls: string[]
): Promise<{ ok: true; images: string[] } | { ok: false; error: string }> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") {
    return { ok: false, error: "Unauthorized" }
  }
  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  })
  if (!store) return { ok: false, error: "No store found" }
  return addProductImagesFromUrls(productId, urls, session.userId, store.id)
}

/** 1-based index (first photo = 1), matching natural language ("first photo"). */
export async function replaceProductImageAtIndex(
  productId: string,
  indexOneBased: number,
  newImageUrl: string,
  userId: string,
  storeId: string
): Promise<{ ok: true; images: string[] } | { ok: false; error: string }> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR" || session.userId !== userId) {
    return { ok: false, error: "Unauthorized" }
  }
  if (!isTrustedHostedImageUrl(newImageUrl)) {
    return { ok: false, error: "Invalid image URL" }
  }
  const store = await prisma.store.findFirst({
    where: { id: storeId, ownerId: userId },
    select: { id: true },
  })
  if (!store) return { ok: false, error: "No store found" }
  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id },
    select: { id: true, images: true },
  })
  if (!product) return { ok: false, error: "Product not found" }
  const i = Math.floor(indexOneBased) - 1
  if (i < 0 || i >= product.images.length) {
    return { ok: false, error: "Invalid photo index" }
  }
  const next = [...product.images]
  next[i] = newImageUrl
  await prisma.product.update({
    where: { id: product.id },
    data: { images: next },
  })
  revalidatePath("/dashboard/vendor/products")
  return { ok: true, images: next }
}

export async function removeProductImageAtIndex(
  productId: string,
  indexOneBased: number,
  userId: string,
  storeId: string
): Promise<{ ok: true; images: string[] } | { ok: false; error: string }> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR" || session.userId !== userId) {
    return { ok: false, error: "Unauthorized" }
  }
  const store = await prisma.store.findFirst({
    where: { id: storeId, ownerId: userId },
    select: { id: true },
  })
  if (!store) return { ok: false, error: "No store found" }
  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id },
    select: { id: true, images: true },
  })
  if (!product) return { ok: false, error: "Product not found" }
  const i = Math.floor(indexOneBased) - 1
  if (i < 0 || i >= product.images.length) {
    return { ok: false, error: "Invalid photo index" }
  }
  const next = product.images.filter((_, idx) => idx !== i)
  await prisma.product.update({
    where: { id: product.id },
    data: { images: next },
  })
  revalidatePath("/dashboard/vendor/products")
  return { ok: true, images: next }
}

/** Move `image_url` to the front as the featured / cover image. */
export async function setProductCoverImage(
  productId: string,
  imageUrl: string,
  userId: string,
  storeId: string
): Promise<{ ok: true; images: string[] } | { ok: false; error: string }> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR" || session.userId !== userId) {
    return { ok: false, error: "Unauthorized" }
  }
  const store = await prisma.store.findFirst({
    where: { id: storeId, ownerId: userId },
    select: { id: true },
  })
  if (!store) return { ok: false, error: "No store found" }
  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id },
    select: { id: true, images: true },
  })
  if (!product) return { ok: false, error: "Product not found" }
  const idx = product.images.indexOf(imageUrl)
  if (idx === -1) return { ok: false, error: "Image not in gallery" }
  const next = [
    imageUrl,
    ...product.images.filter((u) => u !== imageUrl),
  ]
  await prisma.product.update({
    where: { id: product.id },
    data: { images: next },
  })
  revalidatePath("/dashboard/vendor/products")
  return { ok: true, images: next }
}

export async function removeProductImageAI(
  productId: string,
  imageUrl: string
): Promise<{ ok: boolean; images?: string[]; error?: string }> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") {
    return { ok: false, error: "Unauthorized" }
  }
  const product = await prisma.product.findFirst({
    where: { id: productId, store: { ownerId: session.userId } },
    select: { id: true, images: true },
  })
  if (!product) return { ok: false, error: "Product not found" }
  const images = product.images.filter((img) => img !== imageUrl)
  await prisma.product.update({
    where: { id: product.id },
    data: { images },
  })
  return { ok: true, images }
}

export async function reorderProductImages(
  productId: string,
  images: string[]
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") {
    return { ok: false, error: "Unauthorized" }
  }
  const product = await prisma.product.findFirst({
    where: { id: productId, store: { ownerId: session.userId } },
    select: { id: true },
  })
  if (!product) return { ok: false, error: "Product not found" }
  await prisma.product.update({
    where: { id: product.id },
    data: { images },
  })
  return { ok: true }
}

/** Reorder gallery URLs; requires an exact multiset match with the current listing. */
export async function reorderProductGalleryValidated(
  productId: string,
  orderedUrls: string[],
  userId: string,
  storeId: string
): Promise<{ ok: true; images: string[] } | { ok: false; error: string }> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR" || session.userId !== userId) {
    return { ok: false, error: "Unauthorized" }
  }
  const store = await prisma.store.findFirst({
    where: { id: storeId, ownerId: userId },
    select: { id: true },
  })
  if (!store) return { ok: false, error: "No store found" }
  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id },
    select: { id: true, images: true },
  })
  if (!product) return { ok: false, error: "Product not found" }
  if (!isMultisetEqual(product.images, orderedUrls)) {
    return {
      ok: false,
      error:
        "image_urls must list every existing photo exactly once when reordering",
    }
  }
  await prisma.product.update({
    where: { id: product.id },
    data: { images: orderedUrls },
  })
  revalidatePath("/dashboard/vendor/products")
  return { ok: true, images: orderedUrls }
}

function countMap(keys: string[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1)
  return m
}

function isMultisetEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const ma = countMap(a)
  const mb = countMap(b)
  if (ma.size !== mb.size) return false
  for (const [k, v] of ma) {
    if ((mb.get(k) ?? 0) !== v) return false
  }
  return true
}
