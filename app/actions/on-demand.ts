"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { NotificationType, Prisma, type OnDemandRequestStatus } from "@prisma/client";

import { createNotification } from "@/lib/notifications/create";
import { getSession } from "@/lib/auth/session";
import { cancelOnDemandCore } from "@/lib/finance/cancel-ondemand";
import { releaseOnDemandEarnings } from "@/lib/finance/complete-ondemand";
import { prisma } from "@/lib/prisma";
import { createWiPayHostedPayment } from "@/lib/wipay/payments";
import { uploadFile } from "@/lib/uploads/upload";
import { sendEmail } from "@/lib/email/send";
import {
  newOnDemandRequestVendorEmail,
  onDemandAcceptedCustomerEmail,
  onDemandDeclinedCustomerEmail,
} from "@/lib/email/templates";
import { BASE_URL } from "@/lib/email/resend";
import { isStoreSellable } from "@/lib/store/sellable-store";
import { canVendorUsePayOnArrival } from "@/lib/services/payment-policy";
import { checkoutExpiresAt } from "@/lib/payments/checkout-expiry";

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
      isAvailable: true,
      serviceRadius: true,
      store: {
        select: {
          latitude: true,
          longitude: true,
          isAvailableNow: true,
          ownerId: true,
          status: true,
          owner: { select: { idVerificationStatus: true } },
        },
      },
    },
  });
  if (!product) return { error: "Service not found or unavailable." };
  if (
    !product.isAvailable ||
    !product.store.isAvailableNow ||
    !isStoreSellable(product.store)
  ) {
    return { error: "This provider is not accepting on-demand requests right now." };
  }
  if (product.store.ownerId === session.userId) {
    return { error: "You cannot request your own service." };
  }

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

  const requestForEmail = await prisma.onDemandRequest.findUnique({
    where: { id: request.id },
    select: {
      description: true,
      customerAddress: true,
      service: { select: { name: true } },
      customer: { select: { fullName: true } },
      store: { select: { owner: { select: { email: true, fullName: true } } } },
    },
  });

  if (requestForEmail) {
    await sendEmail({
      to: requestForEmail.store.owner.email,
      ...newOnDemandRequestVendorEmail({
        vendorName: requestForEmail.store.owner.fullName ?? "Vendor",
        serviceName: requestForEmail.service.name,
        customerName: requestForEmail.customer.fullName ?? "Customer",
        description: requestForEmail.description,
        address: requestForEmail.customerAddress,
        dashboardUrl: `${BASE_URL}/dashboard/vendor/requests`,
      }),
    });
  }

  const vendorStore = await prisma.store.findFirst({
    where: { id: input.storeId },
    select: { ownerId: true },
  });
  if (vendorStore) {
    const desc = request.description.trim();
    await createNotification({
      userId: vendorStore.ownerId,
      type: NotificationType.ON_DEMAND_REQUEST_RECEIVED,
      title: "New on-demand request",
      body: desc.slice(0, 80) + (desc.length > 80 ? "..." : ""),
      linkUrl: `/dashboard/vendor/requests`,
    });
  }

  revalidatePath("/dashboard/vendor/requests");
  return { ok: true, requestId: request.id };
}

export async function submitQuoteRequest(input: {
  serviceId: string;
  storeId: string;
  description: string;
  photos: string[];
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
      serviceType: "QUOTE",
    },
    select: { id: true },
  });
  if (!product) return { error: "Service not found or unavailable." };

  const request = await prisma.onDemandRequest.create({
    data: {
      serviceId: input.serviceId,
      storeId: input.storeId,
      customerId: session.userId,
      description: input.description.trim(),
      photos: input.photos,
      requestType: "QUOTE",
    },
  });

  const requestForEmail = await prisma.onDemandRequest.findUnique({
    where: { id: request.id },
    select: {
      description: true,
      customerAddress: true,
      service: { select: { name: true } },
      customer: { select: { fullName: true } },
      store: { select: { owner: { select: { email: true, fullName: true } } } },
    },
  });

  if (requestForEmail) {
    await sendEmail({
      to: requestForEmail.store.owner.email,
      ...newOnDemandRequestVendorEmail({
        vendorName: requestForEmail.store.owner.fullName ?? "Vendor",
        serviceName: requestForEmail.service.name,
        customerName: requestForEmail.customer.fullName ?? "Customer",
        description: requestForEmail.description,
        address: requestForEmail.customerAddress,
        dashboardUrl: `${BASE_URL}/dashboard/vendor/requests`,
      }),
    });
  }

  const vendorStore = await prisma.store.findFirst({
    where: { id: input.storeId },
    select: { ownerId: true },
  });
  if (vendorStore) {
    const desc = request.description.trim();
    await createNotification({
      userId: vendorStore.ownerId,
      type: NotificationType.ON_DEMAND_REQUEST_RECEIVED,
      title: "New quote request",
      body: desc.slice(0, 80) + (desc.length > 80 ? "..." : ""),
      linkUrl: `/dashboard/vendor/requests`,
    });
  }

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
      requestType: true,
      quotedPrice: true,
      amountPaid: true,
      estimatedArrival: true,
      declineReason: true,
      vendorNotes: true,
      respondedAt: true,
      vendorCompletedAt: true,
      autoCompleteAt: true,
      earningsReleased: true,
      createdAt: true,
      service: { select: { name: true, slug: true, travelFee: true } },
      customer: { select: { fullName: true, email: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function acceptOnDemandRequest(
  requestId: string,
  input: { quotedPrice: number; estimatedArrival?: string; vendorNotes?: string },
): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  if (!Number.isFinite(input.quotedPrice) || input.quotedPrice <= 0) {
    return { error: "Enter a valid quoted price." };
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) return { error: "No store found" };

  const request = await prisma.onDemandRequest.findFirst({
    where: { id: requestId, storeId: store.id },
    select: { id: true, customerId: true, status: true },
  });
  if (!request) return { error: "Request not found" };
  if (request.status !== "PENDING") {
    return { error: "Only pending requests can be accepted." };
  }

  const accepted = await prisma.onDemandRequest.updateMany({
    where: { id: requestId, status: "PENDING" },
    data: {
      status: "ACCEPTED",
      quotedPrice: input.quotedPrice,
      estimatedArrival: input.estimatedArrival?.trim() ? input.estimatedArrival.trim() : null,
      vendorNotes: input.vendorNotes?.trim() ?? null,
      respondedAt: new Date(),
    },
  });
  if (accepted.count !== 1) {
    return { error: "This request changed while you were updating it. Please refresh." };
  }

  const acceptedForEmail = await prisma.onDemandRequest.findUnique({
    where: { id: requestId },
    select: {
      quotedPrice: true,
      estimatedArrival: true,
      service: { select: { name: true } },
      store: { select: { name: true } },
      customer: { select: { email: true, fullName: true } },
    },
  });

  if (acceptedForEmail) {
    await sendEmail({
      to: acceptedForEmail.customer.email,
      ...onDemandAcceptedCustomerEmail({
        customerName: acceptedForEmail.customer.fullName ?? "Customer",
        serviceName: acceptedForEmail.service.name,
        storeName: acceptedForEmail.store.name,
        quotedPrice: acceptedForEmail.quotedPrice,
        estimatedArrival: acceptedForEmail.estimatedArrival,
        requestsUrl: `${BASE_URL}/my-requests`,
      }),
    });
  }

  if (acceptedForEmail && request.customerId) {
    await createNotification({
      userId: request.customerId,
      type: NotificationType.ON_DEMAND_REQUEST_ACCEPTED,
      title: "Your request was accepted",
      body: `${acceptedForEmail.store.name} accepted your request${acceptedForEmail.estimatedArrival ? ` — arriving ${acceptedForEmail.estimatedArrival}` : ""}`,
      linkUrl: `/my-requests`,
    });
  }

  revalidatePath("/dashboard/vendor/requests");
  return { ok: true };
}

export async function declineOnDemandRequest(
  requestId: string,
  reason: string,
): Promise<{ ok: true; refundedTTD: number } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated" };

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) return { ok: false, error: "No store found" };

  const found = await prisma.onDemandRequest.findFirst({
    where: { id: requestId, storeId: store.id },
    select: { id: true, customerId: true },
  });
  if (!found) return { ok: false, error: "Request not found" };

  const declineReason = reason.trim() || null;

  const result = await cancelOnDemandCore(requestId, "DECLINED", declineReason);
  if (!result.ok) return { ok: false, error: result.error };

  const declinedForEmail = await prisma.onDemandRequest.findUnique({
    where: { id: requestId },
    select: {
      declineReason: true,
      service: { select: { name: true } },
      store: { select: { name: true } },
      customer: { select: { email: true, fullName: true } },
    },
  });

  if (declinedForEmail) {
    await sendEmail({
      to: declinedForEmail.customer.email,
      ...onDemandDeclinedCustomerEmail({
        customerName: declinedForEmail.customer.fullName ?? "Customer",
        serviceName: declinedForEmail.service.name,
        storeName: declinedForEmail.store.name,
        reason: declinedForEmail.declineReason,
        servicesUrl: `${BASE_URL}/services`,
      }),
    });
  }

  return { ok: true, refundedTTD: result.refundedTTD };
}

export async function completeOnDemandRequest(requestId: string): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) return { error: "No store found" };

  const request = await prisma.onDemandRequest.findFirst({
    where: { id: requestId, storeId: store.id },
    select: {
      id: true,
      status: true,
      customerId: true,
      vendorCompletedAt: true,
    },
  });
  if (!request) return { error: "Request not found" };

  if (request.status !== "CONFIRMED") {
    return { error: "Only confirmed requests can be completed." };
  }
  if (request.vendorCompletedAt) return { ok: true };

  const vendorCompletedAt = new Date();
  const autoCompleteAt = new Date(vendorCompletedAt.getTime() + 48 * 60 * 60 * 1_000);
  const marked = await prisma.onDemandRequest.updateMany({
    where: {
      id: requestId,
      status: "CONFIRMED",
      vendorCompletedAt: null,
      earningsReleased: false,
    },
    data: { vendorCompletedAt, autoCompleteAt },
  });
  if (marked.count !== 1) {
    return { error: "This request changed while you were updating it. Please refresh." };
  }

  await createNotification({
    userId: request.customerId,
    type: NotificationType.ON_DEMAND_REQUEST_COMPLETED,
    title: "Confirm your service is complete",
    body: "The provider marked this service complete. Confirm within 48 hours, or contact support if something is wrong.",
    linkUrl: "/my-requests",
  });

  revalidatePath("/dashboard/vendor/requests");
  revalidatePath("/my-requests");
  return { ok: true };
}

export async function markOnDemandRequestComplete(
  requestId: string,
): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "not_logged_in" };

  const request = await prisma.onDemandRequest.findFirst({
    where: {
      id: requestId,
      customerId: session.userId,
      status: "CONFIRMED",
      vendorCompletedAt: { not: null },
      earningsReleased: false,
    },
    select: { id: true },
  });
  if (!request) return { error: "This request is not ready to complete." };

  const result = await releaseOnDemandEarnings(request.id, session.userId);
  if (!result.ok) return { error: result.error };

  revalidatePath("/my-requests");
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
      requestType: true,
      quotedPrice: true,
      estimatedArrival: true,
      declineReason: true,
      vendorCompletedAt: true,
      autoCompleteAt: true,
      earningsReleased: true,
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
      requestType: true,
      service: {
        select: {
          name: true,
          isPublished: true,
          isArchived: true,
          isAvailable: true,
          store: {
            select: {
              status: true,
              subscriptionPlan: true,
              subscriptionStatus: true,
              owner: { select: { idVerificationStatus: true } },
            },
          },
        },
      },
    },
  });

  if (!request) return { error: "Request not found or not in accepted state" };
  if (
    !request.service.isPublished ||
    request.service.isArchived ||
    !request.service.isAvailable ||
    !isStoreSellable(request.service.store)
  ) {
    return { error: "This service is no longer available." };
  }

  if (request.requestType === "QUOTE" && paymentMethod !== "online") {
    return { error: "Quotes must be paid online." };
  }

  if (
    paymentMethod === "arrival" &&
    !canVendorUsePayOnArrival(
      request.service.store.subscriptionPlan,
      request.service.store.subscriptionStatus,
    )
  ) {
    return { error: "This service must be paid online through LinkWe." };
  }

  if (!request.quotedPrice || request.quotedPrice <= 0) {
    return { error: "This request does not have a valid quoted price." };
  }

  if (paymentMethod === "online") {
    const merchantOrderId = `service-${request.id}-${randomUUID()}`;
    try {
      const price = request.quotedPrice;
      const amountMinor = Math.round(price * 100);
      await prisma.paymentAttempt.create({
        data: {
          purpose: "ON_DEMAND_SERVICE",
          merchantOrderId,
          activeKey: `ON_DEMAND_SERVICE:${request.id}`,
          amountMinor,
          userId: session.userId,
          targetId: request.id,
          expiresAt: checkoutExpiresAt(),
        },
      });
      const payment = await createWiPayHostedPayment({
        merchantOrderId,
        amountMinor,
        email: session.email,
        responseUrl: `${BASE_URL}/api/payments/wipay/return`,
        data: { purpose: "ON_DEMAND_SERVICE", targetId: request.id },
      });
      await prisma.paymentAttempt.update({
        where: { merchantOrderId },
        data: { providerTransactionId: payment.transactionId },
      });

      revalidatePath("/my-requests");
      revalidatePath("/dashboard/vendor/requests");

      return { ok: true, checkoutUrl: payment.url };
    } catch (err) {
      console.error("WiPay error:", err);
      await prisma.paymentAttempt
        .updateMany({
          where: { merchantOrderId, status: "PENDING" },
          data: {
            status: "ERROR",
            activeKey: null,
            failureMessage: "Hosted payment setup failed",
          },
        })
        .catch((attemptError) =>
          console.error("[confirmOnDemandRequest:attempt]", attemptError),
        );
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return { error: "A payment checkout is already active for this request." };
      }
      return { error: "Payment failed. Please try again." };
    }
  }

  const confirmed = await prisma.onDemandRequest.updateMany({
    where: { id: requestId, status: "ACCEPTED" },
    data: { status: "CONFIRMED" },
  });
  if (confirmed.count !== 1) {
    return { error: "This request changed while you were updating it. Please refresh." };
  }

  revalidatePath("/my-requests");
  revalidatePath("/dashboard/vendor/requests");
  return { ok: true };
}

export async function cancelOnDemandRequest(
  requestId: string,
): Promise<{ ok: true; refundedTTD: number } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "not_logged_in" };

  const request = await prisma.onDemandRequest.findFirst({
    where: {
      id: requestId,
      customerId: session.userId,
      status: { in: ["PENDING", "ACCEPTED", "CONFIRMED"] },
    },
    select: { id: true },
  });

  if (!request) return { ok: false, error: "Request not found or cannot be cancelled" };

  return cancelOnDemandCore(requestId, "CANCELLED");
}
