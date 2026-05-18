"use server";

import { revalidatePath } from "next/cache";

import type { OnDemandRequestStatus } from "@prisma/client";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/uploads/upload";

const ALLOWED_PHOTO_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Customer upload for on-demand request photos (any logged-in user). */
export async function uploadOnDemandPhotos(
  formData: FormData,
): Promise<{ ok: true; urls: string[] } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "not_logged_in" };
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, error: "No images provided" };
  if (files.length > 10) return { ok: false, error: "At most 10 images at a time" };

  const urls: string[] = [];
  for (const file of files) {
    if (!ALLOWED_PHOTO_MIME.has(file.type)) {
      return { ok: false, error: "Only JPG, PNG, and WebP images are allowed" };
    }
    if (file.size > 12 * 1024 * 1024) {
      return { ok: false, error: "Each image must be 12MB or smaller" };
    }
    try {
      urls.push(await uploadFile(file, "products"));
    } catch {
      return { ok: false, error: "Upload failed. Try again." };
    }
  }
  return { ok: true, urls };
}

export async function submitOnDemandRequest(input: {
  serviceId: string;
  storeId: string;
  description: string;
  photos: string[];
  customerLat?: number;
  customerLng?: number;
  customerAddress?: string;
}): Promise<{ ok: true; requestId: string } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "not_logged_in" };

  if (!input.description.trim()) return { error: "Please describe what you need." };
  if (input.description.trim().length < 20) {
    return { error: "Please provide more detail — at least 20 characters." };
  }

  const product = await prisma.product.findFirst({
    where: {
      id: input.serviceId,
      storeId: input.storeId,
      isPublished: true,
      isService: true,
      isArchived: false,
      serviceType: "ON_DEMAND",
    },
    select: {
      id: true,
      serviceRadius: true,
      store: { select: { latitude: true, longitude: true } },
    },
  });
  if (!product) return { error: "Service not found or unavailable." };

  if (input.customerLat != null && input.customerLng != null) {
    const service = product;
    if (service?.serviceRadius && service.store.latitude != null && service.store.longitude != null) {
      const R = 6371;
      const dLat = ((input.customerLat - service.store.latitude) * Math.PI) / 180;
      const dLng = ((input.customerLng - service.store.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((service.store.latitude * Math.PI) / 180) *
          Math.cos((input.customerLat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      if (distanceKm > service.serviceRadius) {
        return {
          error: `You are approximately ${Math.round(distanceKm)} km away. This provider only covers a ${service.serviceRadius} km radius.`,
        };
      }
    }
  }

  const request = await prisma.onDemandRequest.create({
    data: {
      serviceId: input.serviceId,
      storeId: input.storeId,
      customerId: session.userId,
      description: input.description.trim(),
      photos: input.photos,
      customerLat: input.customerLat ?? null,
      customerLng: input.customerLng ?? null,
      customerAddress: input.customerAddress?.trim() ?? null,
    },
  });

  revalidatePath("/dashboard/vendor/requests");
  return { ok: true, requestId: request.id };
}

export async function getVendorOnDemandRequests(filter?: string) {
  const session = await getSession();
  if (!session) return [];

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) return [];

  return prisma.onDemandRequest.findMany({
    where: {
      storeId: store.id,
      ...(filter && filter !== "all" ? { status: filter as OnDemandRequestStatus } : {}),
    },
    select: {
      id: true,
      description: true,
      photos: true,
      customerAddress: true,
      customerLat: true,
      customerLng: true,
      status: true,
      quotedPrice: true,
      estimatedArrival: true,
      declineReason: true,
      vendorNotes: true,
      respondedAt: true,
      createdAt: true,
      service: { select: { name: true, slug: true, travelFee: true } },
      customer: { select: { fullName: true, email: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function acceptOnDemandRequest(
  requestId: string,
  input: { quotedPrice: number; estimatedArrival: string; vendorNotes?: string },
): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) return { error: "No store found" };

  const request = await prisma.onDemandRequest.findFirst({
    where: { id: requestId, storeId: store.id },
  });
  if (!request) return { error: "Request not found" };

  await prisma.onDemandRequest.update({
    where: { id: requestId },
    data: {
      status: "ACCEPTED",
      quotedPrice: input.quotedPrice,
      estimatedArrival: input.estimatedArrival,
      vendorNotes: input.vendorNotes?.trim() ?? null,
      respondedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/vendor/requests");
  return { ok: true };
}

export async function declineOnDemandRequest(
  requestId: string,
  reason: string,
): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) return { error: "No store found" };

  const found = await prisma.onDemandRequest.findFirst({
    where: { id: requestId, storeId: store.id },
    select: { id: true },
  });
  if (!found) return { error: "Request not found" };

  await prisma.onDemandRequest.update({
    where: { id: requestId },
    data: {
      status: "DECLINED",
      declineReason: reason.trim() || null,
      respondedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/vendor/requests");
  return { ok: true };
}

export async function completeOnDemandRequest(requestId: string): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) return { error: "No store found" };

  const found = await prisma.onDemandRequest.findFirst({
    where: { id: requestId, storeId: store.id },
    select: { id: true },
  });
  if (!found) return { error: "Request not found" };

  await prisma.onDemandRequest.update({
    where: { id: requestId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  revalidatePath("/dashboard/vendor/requests");
  return { ok: true };
}

export async function toggleVendorAvailability(): Promise<
  { ok: true; isAvailableNow: boolean } | { error: string }
> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true, isAvailableNow: true },
  });
  if (!store) return { error: "No store found" };

  await prisma.store.update({
    where: { id: store.id },
    data: { isAvailableNow: !store.isAvailableNow },
  });

  revalidatePath("/dashboard/vendor");
  revalidatePath("/dashboard/vendor/requests");
  return { ok: true, isAvailableNow: !store.isAvailableNow };
}

export async function getCustomerOnDemandRequests() {
  const session = await getSession();
  if (!session) return [];

  return prisma.onDemandRequest.findMany({
    where: { customerId: session.userId },
    select: {
      id: true,
      description: true,
      status: true,
      quotedPrice: true,
      estimatedArrival: true,
      declineReason: true,
      createdAt: true,
      service: { select: { name: true, slug: true } },
      store: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function confirmOnDemandRequest(
  requestId: string,
  paymentMethod: "online" | "arrival",
): Promise<{ ok: true; checkoutUrl?: string } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "not_logged_in" };

  const request = await prisma.onDemandRequest.findFirst({
    where: { id: requestId, customerId: session.userId, status: "ACCEPTED" },
    select: {
      id: true,
      quotedPrice: true,
      storeId: true,
      service: { select: { name: true } },
    },
  });

  if (!request) return { error: "Request not found or not in accepted state" };

  if (paymentMethod === "online") {
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        // Pinned API version requested for Checkout; Stripe SDK types follow lib/stripe default.
        // @ts-expect-error — runtime accepts legacy API versions; types track bundled version only
        apiVersion: "2024-06-20",
      });

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
      const price =
        request.quotedPrice && request.quotedPrice > 0 ? request.quotedPrice : 1;

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: request.service.name,
                description: `On-demand service — TTD ${price.toFixed(2)} (paid in USD equivalent)`,
              },
              unit_amount: Math.round(price * 0.148 * 100),
            },
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/my-requests?confirmed=${requestId}`,
        cancel_url: `${baseUrl}/my-requests`,
        metadata: { requestId, userId: session.userId },
      });

      await prisma.onDemandRequest.update({
        where: { id: requestId },
        data: { status: "CONFIRMED" },
      });

      revalidatePath("/my-requests");
      revalidatePath("/dashboard/vendor/requests");

      if (!checkoutSession.url) return { error: "Could not create checkout session" };
      return { ok: true, checkoutUrl: checkoutSession.url };
    } catch (err) {
      console.error("Stripe error:", err);
      return { error: "Payment failed. Please try again or pay on arrival." };
    }
  }

  await prisma.onDemandRequest.update({
    where: { id: requestId },
    data: { status: "CONFIRMED" },
  });

  revalidatePath("/my-requests");
  revalidatePath("/dashboard/vendor/requests");
  return { ok: true };
}

export async function cancelOnDemandRequest(
  requestId: string,
): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "not_logged_in" };

  const request = await prisma.onDemandRequest.findFirst({
    where: {
      id: requestId,
      customerId: session.userId,
      status: { in: ["PENDING", "ACCEPTED"] },
    },
    select: { id: true },
  });

  if (!request) return { error: "Request not found or cannot be cancelled" };

  await prisma.onDemandRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/my-requests");
  revalidatePath("/dashboard/vendor/requests");
  return { ok: true };
}
