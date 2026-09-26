"use server"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { vendorReviewWhere, type ReviewFilter } from "@/lib/vendor/review-query"

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

export async function getVendorReviews(filter?: ReviewFilter): Promise<VendorReview[]> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") return []

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true }
  })
  if (!store) return []

  const reviews = await prisma.review.findMany({
    where: vendorReviewWhere(store.id, filter),
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
      product: { select: { name: true, isService: true } },
      store: { select: { id: true } },
      booking: { select: { product: { select: { name: true } } } }
    },
    orderBy: { createdAt: "desc" },
    take: Math.max(1, Math.min(100, Math.trunc(filter?.take ?? 100))),
    skip: Math.max(0, Math.trunc(filter?.skip ?? 0))
  })

  return reviews.map(r => {
    let type: "product" | "service" | "store" = "product"
    let productName = null
    let serviceName = null

    if (r.store) {
      type = "store"
    } else if (r.booking || r.product?.isService) {
      type = "service"
      serviceName = r.booking?.product?.name ?? r.product?.name ?? null
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

  const text = reply.trim()
  if (!text || text.length > 2000) return { error: "Write a reply between 1 and 2,000 characters." }

  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      ...vendorReviewWhere(store.id)
    },
    select: { id: true }
  })

  if (!review) return { error: "Review not found" }

  await prisma.review.update({
    where: { id: reviewId },
    data: {
      vendorReply: text,
      vendorRepliedAt: new Date()
    }
  })

  revalidatePath("/dashboard/vendor/reviews")
  revalidatePath("/store/[slug]", "page")
  revalidatePath("/products/[slug]", "page")
  revalidatePath("/service/[slug]", "page")
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

  const store = await prisma.store.findFirst({ where: { ownerId: session.userId }, select: { id: true } })
  if (!store) return { total: 0, average: 0, breakdown: {}, unanswered: 0 }
  const reviews = await prisma.review.findMany({ where: vendorReviewWhere(store.id), select: { rating: true, vendorReply: true } })

  const total = reviews.length
  const average = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0
  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  reviews.forEach(r => { breakdown[r.rating] = (breakdown[r.rating] ?? 0) + 1 })
  const unanswered = reviews.filter(r => !r.vendorReply).length

  return { total, average, breakdown, unanswered }
}
