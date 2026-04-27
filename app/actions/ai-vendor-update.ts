"use server"

import type { Prisma, ProductCondition, WeightUnit } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

export type UpdateProductFromAIInput = {
  productId: string
  name?: string
  price?: number
  compareAtPrice?: number | null
  condition?: "NEW" | "USED" | "REFURBISHED"
  description?: string
  shortDescription?: string
  category?: string
  brand?: string
  sku?: string
  stock?: number
  tags?: string[]
  allowDelivery?: boolean
  allowPickup?: boolean
  weight?: number
  weightUnit?: "KG" | "LB"
  length?: number
  width?: number
  height?: number
  returnPolicy?: string
  isFeatured?: boolean
  metaTitle?: string
  metaDescription?: string
  isPublished?: boolean
}

export async function searchVendorProducts(
  query: string
): Promise<
  {
    id: string
    name: string
    price: number
    category: string | null
    isPublished: boolean
  }[]
> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") return []
  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  })
  if (!store) return []
  return prisma.product.findMany({
    where: {
      storeId: store.id,
      name: { contains: query, mode: "insensitive" },
    },
    select: {
      id: true,
      name: true,
      price: true,
      category: true,
      isPublished: true,
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  })
}

export async function getVendorProductDetails(
  productId: string
): Promise<Record<string, unknown> | null> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") return null
  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  })
  if (!store) return null
  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id },
    select: {
      id: true,
      name: true,
      price: true,
      compareAtPrice: true,
      condition: true,
      description: true,
      shortDescription: true,
      category: true,
      brand: true,
      sku: true,
      stock: true,
      tags: true,
      allowDelivery: true,
      allowPickup: true,
      weight: true,
      weightUnit: true,
      length: true,
      width: true,
      height: true,
      returnPolicy: true,
      isFeatured: true,
      metaTitle: true,
      metaDescription: true,
      isPublished: true,
    },
  })
  return product as Record<string, unknown> | null
}

export async function updateProductFromAI(
  input: UpdateProductFromAIInput,
  userId: string,
  storeId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR" || session.userId !== userId) {
    return { ok: false, error: "Unauthorized" }
  }
  const ownStore = await prisma.store.findFirst({
    where: { id: storeId, ownerId: userId },
    select: { id: true },
  })
  if (!ownStore) {
    return { ok: false, error: "No store found" }
  }
  if (!input.productId.trim()) {
    return { ok: false, error: "Missing product" }
  }

  const product = await prisma.product.findFirst({
    where: { id: input.productId, storeId: ownStore.id },
    select: { id: true },
  })
  if (!product) return { ok: false, error: "Product not found" }

  const data: Prisma.ProductUpdateInput = {}
  if (input.name !== undefined) data.name = input.name.trim()
  if (input.price !== undefined) data.price = Number(input.price)
  if (input.compareAtPrice !== undefined) {
    data.compareAtPrice = input.compareAtPrice
  }
  if (input.condition !== undefined) {
    data.condition = input.condition as ProductCondition
  }
  if (input.description !== undefined) {
    data.description = input.description.trim() || null
  }
  if (input.shortDescription !== undefined) {
    data.shortDescription = input.shortDescription.trim() || null
  }
  if (input.category !== undefined) {
    data.category = input.category.trim() || null
  }
  if (input.brand !== undefined) data.brand = input.brand.trim() || null
  if (input.sku !== undefined) data.sku = input.sku.trim() || null
  if (input.stock !== undefined) {
    data.stock = Math.floor(Number(input.stock))
  }
  if (input.tags !== undefined) {
    data.tags = input.tags.map((t) => t.trim()).filter(Boolean)
  }
  if (input.allowDelivery !== undefined) {
    data.allowDelivery = Boolean(input.allowDelivery)
  }
  if (input.allowPickup !== undefined) {
    data.allowPickup = Boolean(input.allowPickup)
  }
  if (input.weight !== undefined) data.weight = Number(input.weight)
  if (input.weightUnit !== undefined) {
    data.weightUnit = input.weightUnit as WeightUnit
  }
  if (input.length !== undefined) data.length = Number(input.length)
  if (input.width !== undefined) data.width = Number(input.width)
  if (input.height !== undefined) data.height = Number(input.height)
  if (input.returnPolicy !== undefined) {
    data.returnPolicy = input.returnPolicy.trim() || null
  }
  if (input.isFeatured !== undefined) {
    data.isFeatured = Boolean(input.isFeatured)
  }
  if (input.metaTitle !== undefined) {
    data.metaTitle = input.metaTitle.trim() || null
  }
  if (input.metaDescription !== undefined) {
    data.metaDescription = input.metaDescription.trim() || null
  }
  if (input.isPublished !== undefined) {
    data.isPublished = Boolean(input.isPublished)
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, error: "No fields to update" }
  }

  console.log(
    "updateProductFromAI saving:",
    JSON.stringify({ productId: input.productId, fields: Object.keys(data) })
  )

  await prisma.product.update({
    where: { id: input.productId },
    data,
  })

  revalidatePath("/dashboard/vendor/products")
  return { ok: true }
}
