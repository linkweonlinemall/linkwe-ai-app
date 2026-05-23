"use server"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

export type VendorReview = {
  id: string
  rating: number
  title: string | null
  body: string | null
  createdAt: Date
  isVerifiedPurchase: boolean
  vendorReply: string | null
  vendorRepliedAt: Date | null
  customer: { fullName: string }
  productName: string | null
  serviceName: string | null
  type: "product" | "service" | "store"
}

export async function getVendorReviews(filter?: {
  type?: "product" | "service" | "store" | "all"
  rating?: number
}): Promise<VendorReview[]> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") return []

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true }
  })
  if (!store) return []

  const reviews = await prisma.review.findMany({
    where: {
      OR: [
        { product: { storeId: store.id } },
        { store: { id: store.id } },
        { booking: { product: { storeId: store.id } } }
      ],
      ...(filter?.rating ? { rating: filter.rating } : {})
    },
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      createdAt: true,
      isVerifiedPurchase: true,
      vendorReply: true,
      vendorRepliedAt: true,
      user: { select: { fullName: true } },
      product: { select: { name: true } },
      store: { select: { id: true } },
      booking: { select: { product: { select: { name: true } } } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  })

  return reviews.map(r => {
    let type: "product" | "service" | "store" = "product"
    let productName = null
    let serviceName = null

    if (r.store) {
      type = "store"
    } else if (r.booking) {
      type = "service"
      serviceName = r.booking.product?.name ?? null
    } else {
      type = "product"
      productName = r.product?.name ?? null
    }

    return {
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      createdAt: r.createdAt,
      isVerifiedPurchase: r.isVerifiedPurchase,
      vendorReply: r.vendorReply,
      vendorRepliedAt: r.vendorRepliedAt,
      customer: { fullName: r.user.fullName },
      productName,
      serviceName,
      type
    }
  }).filter(r => {
    if (!filter?.type || filter.type === "all") return true
    return r.type === filter.type
  })
}

export async function replyToReview(
  reviewId: string,
  reply: string
): Promise<{ ok: true } | { error: string }> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") return { error: "Unauthorized" }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true }
  })
  if (!store) return { error: "No store found" }

  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      OR: [
        { product: { storeId: store.id } },
        { store: { id: store.id } },
        { booking: { product: { storeId: store.id } } }
      ]
    },
    select: { id: true }
  })

  if (!review) return { error: "Review not found" }

  await prisma.review.update({
    where: { id: reviewId },
    data: {
      vendorReply: reply.trim(),
      vendorRepliedAt: new Date()
    }
  })

  return { ok: true }
}

export async function getVendorReviewStats(): Promise<{
  total: number
  average: number
  breakdown: Record<number, number>
  unanswered: number
}> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") return { total: 0, average: 0, breakdown: {}, unanswered: 0 }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true }
  })
  if (!store) return { total: 0, average: 0, breakdown: {}, unanswered: 0 }

  const reviews = await prisma.review.findMany({
    where: {
      OR: [
        { product: { storeId: store.id } },
        { store: { id: store.id } },
        { booking: { product: { storeId: store.id } } }
      ]
    },
    select: { rating: true, vendorReply: true }
  })

  const total = reviews.length
  const average = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0
  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  reviews.forEach(r => { breakdown[r.rating] = (breakdown[r.rating] ?? 0) + 1 })
  const unanswered = reviews.filter(r => !r.vendorReply).length

  return { total, average, breakdown, unanswered }
}
