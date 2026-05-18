"use server";

import { revalidatePath } from "next/cache";
import { BookingPaymentMode, QuotePriceType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function getVendorServices() {
  const session = await getSession();
  if (!session) return [];
  const store = await prisma.store.findFirst({ where: { ownerId: session.userId } });
  if (!store) return [];
  return prisma.product.findMany({
    where: { storeId: store.id, isService: true },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      isPublished: true,
      serviceType: true,
      serviceLocation: true,
      serviceDuration: true,
      category: true,
      images: true,
      createdAt: true,
      responseTime: true,
      minimumQuoteAmount: true,
      siteVisitRequired: true,
      subscriptionInterval: true,
      sessionsIncluded: true,
      subscriptionCancellationDays: true,
      subscriptionTrialPeriod: true,
      subscriptionTrialPrice: true,
      subscriptionCanPause: true,
      subscriptionPauseMaxWeeks: true,
      travelFee: true,
      serviceRadius: true,
      estimatedResponseMins: true,
      virtualPlatform: true,
      virtualMeetingInfo: true,
      maxGroupSize: true,
      quotePriceType: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createService(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const store = await prisma.store.findFirst({ where: { ownerId: session.userId } });
  if (!store) return { error: "No store found" };

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const categoryRaw = (formData.get("category") as string) || "";
  const category = categoryRaw.trim() || null;
  const serviceType = formData.get("serviceType") as string;
  const serviceLocationRaw = (formData.get("serviceLocation") as string) || "";
  const quotePriceTypeRaw = formData.get("quotePriceType") as string | null;
  const quotePriceType =
    quotePriceTypeRaw === "STARTING_FROM" ||
    quotePriceTypeRaw === "CALLOUT_FEE" ||
    quotePriceTypeRaw === "FREE_QUOTE"
      ? quotePriceTypeRaw
      : null;

  const priceRaw = formData.get("price") as string;
  const price =
    serviceType === "QUOTE" && quotePriceType === "FREE_QUOTE"
      ? 0
      : parseFloat(priceRaw) || 0;
  const serviceDuration = formData.get("serviceDuration")
    ? parseInt(formData.get("serviceDuration") as string, 10)
    : null;
  const requiresDeposit = formData.get("requiresDeposit") === "true";
  const depositAmount = requiresDeposit && formData.get("depositAmount")
    ? parseFloat(formData.get("depositAmount") as string)
    : null;
  const isPublished = formData.get("isPublished") === "true";
  const tagsRaw = formData.get("tags") as string;
  const imagesRaw = formData.get("images") as string;
  const images = imagesRaw ? imagesRaw.split(",").map((u) => u.trim()).filter(Boolean) : [];
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const bookingPaymentModeRaw =
    (formData.get("bookingPaymentMode") as string) || "CUSTOMER_CHOOSES";
  const allowedPaymentModes = [
    "ONLINE_ONLY",
    "ON_ARRIVAL_ONLY",
    "CUSTOMER_CHOOSES",
  ] as const;
  const bookingPaymentMode = allowedPaymentModes.includes(
    bookingPaymentModeRaw as (typeof allowedPaymentModes)[number],
  )
    ? (bookingPaymentModeRaw as BookingPaymentMode)
    : BookingPaymentMode.CUSTOMER_CHOOSES;

  // Quote fields
  const responseTime = (formData.get("responseTime") as string) || null;
  const minimumQuoteAmount = formData.get("minimumQuoteAmount")
    ? parseFloat(formData.get("minimumQuoteAmount") as string)
    : null;
  const siteVisitRequired = formData.getAll("siteVisitRequired").includes("true");

  // Subscription fields
  const subscriptionInterval = (formData.get("subscriptionInterval") as string) || null;
  const sessionsIncluded = formData.get("sessionsIncluded")
    ? parseInt(formData.get("sessionsIncluded") as string, 10)
    : null;
  const subscriptionCancellationDays = formData.get("subscriptionCancellationDays")
    ? parseInt(formData.get("subscriptionCancellationDays") as string, 10)
    : null;
  const subscriptionTrialPeriod = formData.get("subscriptionTrialPeriod")
    ? parseInt(formData.get("subscriptionTrialPeriod") as string, 10)
    : null;
  const subscriptionTrialPrice = formData.get("subscriptionTrialPrice")
    ? parseFloat(formData.get("subscriptionTrialPrice") as string)
    : null;
  const subscriptionCanPause = formData.get("subscriptionCanPause") === "true";
  const subscriptionPauseMaxWeeks = formData.get("subscriptionPauseMaxWeeks")
    ? parseInt(formData.get("subscriptionPauseMaxWeeks") as string, 10)
    : null;

  // On-demand fields
  const travelFee = formData.get("travelFee")
    ? parseFloat(formData.get("travelFee") as string)
    : null;
  const serviceRadius = formData.get("serviceRadius")
    ? parseInt(formData.get("serviceRadius") as string, 10)
    : null;
  const estimatedResponseMins = formData.get("estimatedResponseMins")
    ? parseInt(formData.get("estimatedResponseMins") as string, 10)
    : null;

  // Virtual fields
  const virtualPlatform = (formData.get("virtualPlatform") as string) || null;
  const virtualMeetingInfo = (formData.get("virtualMeetingInfo") as string) || null;
  const maxGroupSize = formData.get("maxGroupSize")
    ? parseInt(formData.get("maxGroupSize") as string, 10)
    : null;

  if (!name || !serviceType || Number.isNaN(price)) return { error: "Missing required fields" };

  let slug = slugify(name);
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  await prisma.product.create({
    data: {
      storeId: store.id,
      name,
      slug,
      description,
      category,
      price,
      isService: true,
      serviceType: serviceType as any,
      serviceLocation:
        serviceLocationRaw.trim().length > 0 ? (serviceLocationRaw.trim() as any) : null,
      serviceDuration: serviceDuration && !Number.isNaN(serviceDuration) ? serviceDuration : null,
      requiresDeposit,
      depositAmount:
        depositAmount !== null && !Number.isNaN(depositAmount) ? depositAmount : null,
      isPublished,
      tags,
      images,
      isBookable: serviceType === "BOOKABLE" || serviceType === "VIRTUAL",
      bookingPaymentMode,
      quotePriceType:
        serviceType === "QUOTE" && quotePriceType
          ? (quotePriceType as QuotePriceType)
          : null,
      responseTime,
      minimumQuoteAmount:
        minimumQuoteAmount !== null && !Number.isNaN(minimumQuoteAmount) ? minimumQuoteAmount : null,
      siteVisitRequired,
      subscriptionInterval,
      sessionsIncluded:
        sessionsIncluded !== null && !Number.isNaN(sessionsIncluded) ? sessionsIncluded : null,
      subscriptionCancellationDays:
        subscriptionCancellationDays !== null && !Number.isNaN(subscriptionCancellationDays)
          ? subscriptionCancellationDays
          : null,
      subscriptionTrialPeriod:
        subscriptionTrialPeriod !== null && !Number.isNaN(subscriptionTrialPeriod)
          ? subscriptionTrialPeriod
          : null,
      subscriptionTrialPrice:
        subscriptionTrialPrice !== null && !Number.isNaN(subscriptionTrialPrice)
          ? subscriptionTrialPrice
          : null,
      subscriptionCanPause,
      subscriptionPauseMaxWeeks:
        subscriptionPauseMaxWeeks !== null && !Number.isNaN(subscriptionPauseMaxWeeks)
          ? subscriptionPauseMaxWeeks
          : null,
      travelFee: travelFee !== null && !Number.isNaN(travelFee) ? travelFee : null,
      serviceRadius:
        serviceRadius !== null && !Number.isNaN(serviceRadius) ? serviceRadius : null,
      estimatedResponseMins:
        estimatedResponseMins !== null && !Number.isNaN(estimatedResponseMins)
          ? estimatedResponseMins
          : null,
      virtualPlatform,
      virtualMeetingInfo,
      maxGroupSize: maxGroupSize && !Number.isNaN(maxGroupSize) ? maxGroupSize : null,
    },
  });

  revalidatePath("/dashboard/vendor/services");
  return { ok: true };
}

export async function updateService(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const store = await prisma.store.findFirst({ where: { ownerId: session.userId } });
  if (!store) return { error: "No store found" };

  const existing = await prisma.product.findFirst({
    where: { id, storeId: store.id, isService: true },
    select: { slug: true },
  });
  if (!existing) return { error: "Not found" };

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const categoryRaw = (formData.get("category") as string) || "";
  const category = categoryRaw.trim() || null;
  const serviceType = formData.get("serviceType") as string;
  const serviceLocationRaw = (formData.get("serviceLocation") as string) || "";
  const quotePriceTypeRaw = formData.get("quotePriceType") as string | null;
  const quotePriceType =
    quotePriceTypeRaw === "STARTING_FROM" ||
    quotePriceTypeRaw === "CALLOUT_FEE" ||
    quotePriceTypeRaw === "FREE_QUOTE"
      ? quotePriceTypeRaw
      : null;

  const priceRaw = formData.get("price") as string;
  const price =
    serviceType === "QUOTE" && quotePriceType === "FREE_QUOTE"
      ? 0
      : parseFloat(priceRaw) || 0;
  const serviceDuration = formData.get("serviceDuration")
    ? parseInt(formData.get("serviceDuration") as string, 10)
    : null;
  const requiresDeposit = formData.get("requiresDeposit") === "true";
  const depositAmount = requiresDeposit && formData.get("depositAmount")
    ? parseFloat(formData.get("depositAmount") as string)
    : null;
  const isPublished = formData.get("isPublished") === "true";
  const tagsRaw = formData.get("tags") as string;
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const bookingPaymentModeRaw =
    (formData.get("bookingPaymentMode") as string) || "CUSTOMER_CHOOSES";
  const allowedPaymentModes = [
    "ONLINE_ONLY",
    "ON_ARRIVAL_ONLY",
    "CUSTOMER_CHOOSES",
  ] as const;
  const bookingPaymentMode = allowedPaymentModes.includes(
    bookingPaymentModeRaw as (typeof allowedPaymentModes)[number],
  )
    ? (bookingPaymentModeRaw as BookingPaymentMode)
    : BookingPaymentMode.CUSTOMER_CHOOSES;

  // Quote fields
  const responseTime = (formData.get("responseTime") as string) || null;
  const minimumQuoteAmount = formData.get("minimumQuoteAmount")
    ? parseFloat(formData.get("minimumQuoteAmount") as string)
    : null;
  const siteVisitRequired = formData.getAll("siteVisitRequired").includes("true");

  // Subscription fields
  const subscriptionInterval = (formData.get("subscriptionInterval") as string) || null;
  const sessionsIncluded = formData.get("sessionsIncluded")
    ? parseInt(formData.get("sessionsIncluded") as string, 10)
    : null;
  const subscriptionCancellationDays = formData.get("subscriptionCancellationDays")
    ? parseInt(formData.get("subscriptionCancellationDays") as string, 10)
    : null;
  const subscriptionTrialPeriod = formData.get("subscriptionTrialPeriod")
    ? parseInt(formData.get("subscriptionTrialPeriod") as string, 10)
    : null;
  const subscriptionTrialPrice = formData.get("subscriptionTrialPrice")
    ? parseFloat(formData.get("subscriptionTrialPrice") as string)
    : null;
  const subscriptionCanPause = formData.get("subscriptionCanPause") === "true";
  const subscriptionPauseMaxWeeks = formData.get("subscriptionPauseMaxWeeks")
    ? parseInt(formData.get("subscriptionPauseMaxWeeks") as string, 10)
    : null;

  // On-demand fields
  const travelFee = formData.get("travelFee")
    ? parseFloat(formData.get("travelFee") as string)
    : null;
  const serviceRadius = formData.get("serviceRadius")
    ? parseInt(formData.get("serviceRadius") as string, 10)
    : null;
  const estimatedResponseMins = formData.get("estimatedResponseMins")
    ? parseInt(formData.get("estimatedResponseMins") as string, 10)
    : null;

  // Virtual fields
  const virtualPlatform = (formData.get("virtualPlatform") as string) || null;
  const virtualMeetingInfo = (formData.get("virtualMeetingInfo") as string) || null;
  const maxGroupSize = formData.get("maxGroupSize")
    ? parseInt(formData.get("maxGroupSize") as string, 10)
    : null;

  if (!name || !serviceType || Number.isNaN(price)) return { error: "Missing required fields" };

  await prisma.product.update({
    where: { id },
    data: {
      name,
      description,
      category,
      price,
      serviceType: serviceType as any,
      serviceLocation:
        serviceLocationRaw.trim().length > 0 ? (serviceLocationRaw.trim() as any) : null,
      serviceDuration:
        serviceDuration && !Number.isNaN(serviceDuration) ? serviceDuration : null,
      requiresDeposit,
      depositAmount:
        depositAmount !== null && !Number.isNaN(depositAmount) ? depositAmount : null,
      isPublished,
      tags,
      // Update images if provided
      ...(formData.get("images")
        ? {
            images: (formData.get("images") as string)
              .split(",")
              .map((u) => u.trim())
              .filter(Boolean),
          }
        : {}),
      bookingPaymentMode,
      isBookable: serviceType === "BOOKABLE" || serviceType === "VIRTUAL",
      quotePriceType:
        serviceType === "QUOTE" && quotePriceType
          ? (quotePriceType as QuotePriceType)
          : null,
      responseTime,
      minimumQuoteAmount:
        minimumQuoteAmount !== null && !Number.isNaN(minimumQuoteAmount) ? minimumQuoteAmount : null,
      siteVisitRequired,
      subscriptionInterval,
      sessionsIncluded:
        sessionsIncluded !== null && !Number.isNaN(sessionsIncluded) ? sessionsIncluded : null,
      subscriptionCancellationDays:
        subscriptionCancellationDays !== null && !Number.isNaN(subscriptionCancellationDays)
          ? subscriptionCancellationDays
          : null,
      subscriptionTrialPeriod:
        subscriptionTrialPeriod !== null && !Number.isNaN(subscriptionTrialPeriod)
          ? subscriptionTrialPeriod
          : null,
      subscriptionTrialPrice:
        subscriptionTrialPrice !== null && !Number.isNaN(subscriptionTrialPrice)
          ? subscriptionTrialPrice
          : null,
      subscriptionCanPause,
      subscriptionPauseMaxWeeks:
        subscriptionPauseMaxWeeks !== null && !Number.isNaN(subscriptionPauseMaxWeeks)
          ? subscriptionPauseMaxWeeks
          : null,
      travelFee: travelFee !== null && !Number.isNaN(travelFee) ? travelFee : null,
      serviceRadius:
        serviceRadius !== null && !Number.isNaN(serviceRadius) ? serviceRadius : null,
      estimatedResponseMins:
        estimatedResponseMins !== null && !Number.isNaN(estimatedResponseMins)
          ? estimatedResponseMins
          : null,
      virtualPlatform,
      virtualMeetingInfo,
      maxGroupSize: maxGroupSize && !Number.isNaN(maxGroupSize) ? maxGroupSize : null,
    },
  });

  revalidatePath("/dashboard/vendor/services");
  revalidatePath(`/service/${existing.slug}`);
  return { ok: true };
}

export async function deleteService(id: string) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const store = await prisma.store.findFirst({ where: { ownerId: session.userId } });
  if (!store) return { error: "No store found" };

  const exists = await prisma.product.findFirst({
    where: { id, storeId: store.id, isService: true },
  });
  if (!exists) return { error: "Not found" };

  await prisma.product.update({
    where: { id },
    data: { isPublished: false, isArchived: true },
  });
  revalidatePath("/dashboard/vendor/services");
  return { ok: true };
}

export async function toggleServicePublished(
  serviceId: string,
): Promise<{ ok: true; isPublished: boolean } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) return { error: "No store found" };

  const service = await prisma.product.findFirst({
    where: { id: serviceId, storeId: store.id, isService: true },
    select: { id: true, isPublished: true },
  });
  if (!service) return { error: "Service not found" };

  const updated = await prisma.product.update({
    where: { id: serviceId },
    data: { isPublished: !service.isPublished },
    select: { isPublished: true },
  });

  revalidatePath("/dashboard/vendor/services");
  return { ok: true, isPublished: updated.isPublished };
}

export async function permanentlyDeleteService(serviceId: string): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) return { error: "No store found" };

  const service = await prisma.product.findFirst({
    where: { id: serviceId, storeId: store.id, isService: true },
    select: { id: true },
  });
  if (!service) return { error: "Service not found" };

  await prisma.product.delete({ where: { id: serviceId } });

  revalidatePath("/dashboard/vendor/services");
  return { ok: true };
}

export async function bulkToggleServicesPublished(
  serviceIds: string[],
  publish: boolean,
): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) return { error: "No store found" };

  await prisma.product.updateMany({
    where: {
      id: { in: serviceIds },
      storeId: store.id,
      isService: true,
    },
    data: { isPublished: publish },
  });

  revalidatePath("/dashboard/vendor/services");
  return { ok: true };
}

export async function getPublicServices(
  filters: {
    category?: string;
    serviceType?: string;
    q?: string;
    sort?: string;
  } = {},
) {
  const { category, serviceType, q, sort } = filters;
  const orderBy =
    sort === "price_asc"
      ? [{ price: "asc" as const }]
      : sort === "price_desc"
        ? [{ price: "desc" as const }]
        : sort === "newest"
          ? [{ createdAt: "desc" as const }]
          : [{ isFeatured: "desc" as const }, { createdAt: "desc" as const }];

  return prisma.product.findMany({
    where: {
      isPublished: true,
      isService: true,
      isArchived: false,
      ...(category ? { category } : {}),
      ...(serviceType ? { serviceType: serviceType as any } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
              { tags: { has: q.toLowerCase() } },
              { store: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      compareAtPrice: true,
      images: true,
      category: true,
      serviceType: true,
      serviceLocation: true,
      serviceDuration: true,
      isFeatured: true,
      requiresDeposit: true,
      depositAmount: true,
      store: { select: { name: true, slug: true, region: true, logoUrl: true } },
    },
    orderBy,
    take: 60,
  });
}
