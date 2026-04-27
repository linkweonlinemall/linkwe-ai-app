"use server"

import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/uploads/upload"

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
    return { ok: true, images }
  } catch {
    return { ok: false, error: "Upload failed. Try again." }
  }
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
