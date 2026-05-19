"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { newReviewVendorEmail } from "@/lib/email/templates";
import { BASE_URL } from "@/lib/email/resend";

// Submit a product or service review
export async function submitProductReview(input: {
  productId: string;
  rating: number;
  title?: string;
  body?: string;
  orderId?: string;
  bookingId?: string;
}): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "not_logged_in" };

  if (input.rating < 1 || input.rating > 5)
    return { error: "Rating must be between 1 and 5" };

  const existing = await prisma.review.findFirst({
    where: { userId: session.userId, productId: input.productId },
  });
  if (existing) return { error: "You have already reviewed this product" };

  let isVerified = false;
  if (input.orderId) {
    const order = await prisma.mainOrder.findFirst({
      where: {
        id: input.orderId,
        buyerId: session.userId,
        items: { some: { productId: input.productId } },
      },
    });
    if (order) isVerified = true;
  }
  if (input.bookingId) {
    const booking = await prisma.productBooking.findFirst({
      where: { id: input.bookingId, customerId: session.userId, productId: input.productId },
    });
    if (booking) isVerified = true;
  }

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { storeId: true, slug: true, isService: true },
  });
  if (!product) return { error: "Product not found" };

  await prisma.review.create({
    data: {
      userId: session.userId,
      productId: input.productId,
      storeId: product.storeId,
      mainOrderId: input.orderId ?? null,
      bookingId: input.bookingId ?? null,
      rating: input.rating,
      title: input.title?.trim() || null,
      body: input.body?.trim() || null,
      isVerifiedPurchase: isVerified,
    },
  });

  const reviewForEmail = await prisma.review.findFirst({
    where: { userId: session.userId, productId: input.productId },
    select: {
      rating: true,
      body: true,
      user: { select: { fullName: true } },
      product: {
        select: {
          name: true,
          store: { select: { owner: { select: { email: true, fullName: true } } } },
        },
      },
    },
  });

  if (reviewForEmail?.product?.store?.owner) {
    await sendEmail({
      to: reviewForEmail.product.store.owner.email,
      ...newReviewVendorEmail({
        vendorName: reviewForEmail.product.store.owner.fullName ?? "Vendor",
        reviewerName: reviewForEmail.user.fullName ?? "A customer",
        productName: reviewForEmail.product.name,
        rating: reviewForEmail.rating,
        body: reviewForEmail.body,
        dashboardUrl: `${BASE_URL}/dashboard/vendor/reviews`,
      }),
    });
  }

  revalidatePath(`/products/${product.slug}`);
  revalidatePath(`/service/${product.slug}`);
  return { ok: true };
}

// Submit a store review
export async function submitStoreReview(input: {
  storeId: string;
  rating: number;
  title?: string;
  body?: string;
}): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "not_logged_in" };

  if (input.rating < 1 || input.rating > 5)
    return { error: "Rating must be between 1 and 5" };

  const existing = await prisma.review.findFirst({
    where: { userId: session.userId, storeId: input.storeId, productId: null },
  });
  if (existing) return { error: "You have already reviewed this store" };

  const store = await prisma.store.findUnique({
    where: { id: input.storeId },
    select: { slug: true },
  });
  if (!store) return { error: "Store not found" };

  await prisma.review.create({
    data: {
      userId: session.userId,
      storeId: input.storeId,
      rating: input.rating,
      title: input.title?.trim() || null,
      body: input.body?.trim() || null,
    },
  });

  revalidatePath(`/store/${store.slug}`);
  return { ok: true };
}

// Get reviews for a product
export async function getProductReviews(productId: string) {
  const reviews = await prisma.review.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      isVerifiedPurchase: true,
      helpfulCount: true,
      createdAt: true,
      user: { select: { fullName: true } },
    },
  });

  const count = reviews.length;
  const average = count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

  return { reviews, count, average };
}

// Get reviews for a store
export async function getStoreReviewsNew(storeId: string) {
  const reviews = await prisma.review.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      isVerifiedPurchase: true,
      helpfulCount: true,
      createdAt: true,
      user: { select: { fullName: true } },
      product: { select: { name: true, slug: true, isService: true } },
    },
  });

  const count = reviews.length;
  const average = count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

  return { reviews, count, average };
}

// Check if current user has reviewed a product
export async function getUserProductReview(productId: string) {
  const session = await getSession();
  if (!session) return null;

  return prisma.review.findFirst({
    where: { userId: session.userId, productId },
    select: { id: true, rating: true, title: true, body: true },
  });
}

// Check if current user has reviewed a store
export async function getUserStoreReview(storeId: string) {
  const session = await getSession();
  if (!session) return null;

  return prisma.review.findFirst({
    where: { userId: session.userId, storeId, productId: null },
    select: { id: true, rating: true, title: true, body: true },
  });
}

export async function markReviewHelpful(reviewId: string) {
  await prisma.review.update({
    where: { id: reviewId },
    data: { helpfulCount: { increment: 1 } },
  });
  return { ok: true as const };
}
