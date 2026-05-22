"use server"

import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

export async function getVendorStoreSummary() {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") return null

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      description: true,
      categoryId: true,
      region: true,
      logoUrl: true,
      coverPhotoUrl: true,
      tags: true,
      amenities: true,
      openingHours: true,
      socialLinks: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          products: true,
        },
      },
    },
  })

  if (!store) return null

  const publishedCount = await prisma.product.count({
    where: { storeId: store.id, isPublished: true },
  })

  const draftCount = await prisma.product.count({
    where: { storeId: store.id, isPublished: false },
  })

  const { _count: count, categoryId, coverPhotoUrl, status, ...storeRest } =
    store

  return {
    ...storeRest,
    categoryId,
    category: categoryId,
    coverUrl: coverPhotoUrl,
    isVerified: status === "ACTIVE",
    publishedProducts: publishedCount,
    draftProducts: draftCount,
    totalProducts: count.products,
  }
}

export async function getVendorSalesInsights() {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") return null

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  })
  if (!store) return null

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentOrders = await prisma.orderItem.findMany({
    where: {
      storeId: store.id,
      mainOrder: { createdAt: { gte: thirtyDaysAgo } },
    },
    select: {
      mainOrderId: true,
      quantity: true,
      priceMinor: true,
      titleSnapshot: true,
      mainOrder: {
        select: {
          status: true,
          createdAt: true,
        },
      },
    },
    orderBy: { mainOrder: { createdAt: "desc" } },
    take: 100,
  })

  const totalRevenueMinor = recentOrders.reduce(
    (sum, item) => sum + item.priceMinor * item.quantity,
    0,
  )

  const productSales: Record<
    string,
    { name: string; quantity: number; revenue: number }
  > = {}

  for (const item of recentOrders) {
    const key = item.titleSnapshot
    if (!productSales[key]) {
      productSales[key] = { name: key, quantity: 0, revenue: 0 }
    }
    productSales[key].quantity += item.quantity
    productSales[key].revenue += (item.priceMinor * item.quantity) / 100
  }

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  return {
    period: "Last 30 days",
    totalRevenue: totalRevenueMinor / 100,
    totalOrderItems: recentOrders.length,
    topProducts,
  }
}

export async function getVendorInventoryAlerts() {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") return null

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  })
  if (!store) return null

  const lowStock = await prisma.product.findMany({
    where: {
      storeId: store.id,
      isPublished: true,
      isArchived: false,
      stock: { lte: 5, gt: 0 },
    },
    select: { id: true, name: true, stock: true, price: true },
    orderBy: { stock: "asc" },
    take: 10,
  })

  const outOfStock = await prisma.product.findMany({
    where: {
      storeId: store.id,
      isPublished: true,
      isArchived: false,
      stock: 0,
    },
    select: { id: true, name: true, price: true },
    take: 10,
  })

  const drafts = await prisma.product.findMany({
    where: { storeId: store.id, isPublished: false, isArchived: false },
    select: { id: true, name: true, price: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  })

  return { lowStock, outOfStock, drafts }
}

export async function getVendorRecentOrders() {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") return null

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  })
  if (!store) return null

  const orders = await prisma.orderItem.findMany({
    where: { storeId: store.id },
    select: {
      id: true,
      titleSnapshot: true,
      quantity: true,
      priceMinor: true,
      mainOrder: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          buyer: {
            select: { fullName: true },
          },
        },
      },
    },
    orderBy: { mainOrder: { createdAt: "desc" } },
    take: 20,
  })

  return orders.map((item) => ({
    orderId: item.mainOrder.id,
    productName: item.titleSnapshot,
    quantity: item.quantity,
    price: item.priceMinor / 100,
    total: (item.priceMinor * item.quantity) / 100,
    status: item.mainOrder.status,
    customerName: item.mainOrder.buyer?.fullName ?? "Guest",
    createdAt: item.mainOrder.createdAt,
  }))
}

export async function updateVendorStoreFields(
  fields: {
    name?: string
    tagline?: string
    description?: string
    tags?: string[]
    amenities?: string[]
    policies?: string
    address?: string
    openingHours?: Record<string, unknown>
    socialLinks?: Record<string, unknown>
    logoUrl?: string
    coverPhotoUrl?: string
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") return { ok: false, error: "Unauthorized" }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true }
  })
  if (!store) return { ok: false, error: "No store found" }

  const data: Record<string, unknown> = {}
  if (fields.name !== undefined) data.name = fields.name.trim()
  if (fields.tagline !== undefined) data.tagline = fields.tagline.trim() || null
  if (fields.description !== undefined) data.description = fields.description.trim() || null
  if (fields.tags !== undefined) data.tags = fields.tags.map(t => t.trim()).filter(Boolean)
  if (fields.amenities !== undefined) data.amenities = fields.amenities.map(a => a.trim()).filter(Boolean)
  if (fields.policies !== undefined) data.policies = fields.policies.trim() || null
  if (fields.address !== undefined) data.address = fields.address.trim() || null
  if (fields.openingHours !== undefined) data.openingHours = fields.openingHours
  if (fields.socialLinks !== undefined) data.socialLinks = fields.socialLinks
  if (fields.logoUrl !== undefined) data.logoUrl = fields.logoUrl
  if (fields.coverPhotoUrl !== undefined) data.coverPhotoUrl = fields.coverPhotoUrl

  if (Object.keys(data).length === 0) return { ok: false, error: "No fields to update" }

  await prisma.store.update({
    where: { id: store.id },
    data,
  })

  return { ok: true }
}
