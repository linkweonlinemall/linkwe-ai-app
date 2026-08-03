import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/** Fields used on /dashboard/vendor/services list — safe without later Product migrations. */
export const vendorServiceListSelect = {
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
} satisfies Prisma.ProductSelect;

/** Core fields for edit form — no availability or 20260515+ extension columns. */
export const vendorServiceDetailSelect = {
  id: true,
  name: true,
  description: true,
  category: true,
  serviceType: true,
  serviceLocation: true,
  price: true,
  serviceDuration: true,
  requiresDeposit: true,
  depositAmount: true,
  tags: true,
  isPublished: true,
  images: true,
  maxGroupSize: true,
  bookingPaymentMode: true,
  quotePriceType: true,
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
} satisfies Prisma.ProductSelect;

/** Availability columns (migration 20260527203854) — omit when DB lags schema. */
export const vendorServiceAvailabilitySelect = {
  durationMinutes: true,
  bufferMinutes: true,
  maxPerDay: true,
  useStoreHours: true,
  availableDays: true,
  availableFrom: true,
  availableTo: true,
  isAvailable: true,
} satisfies Prisma.ProductSelect;

export const DEFAULT_SERVICE_AVAILABILITY = {
  durationMinutes: 60,
  bufferMinutes: 0,
  maxPerDay: null as number | null,
  useStoreHours: true,
  availableDays: [] as string[],
  availableFrom: null as string | null,
  availableTo: null as string | null,
  isAvailable: true,
};

export type VendorServiceAvailabilityFields = typeof DEFAULT_SERVICE_AVAILABILITY;

/** Load bookable-service availability; falls back when columns are not migrated yet. */
export async function findVendorServicesForAvailability(storeId: string) {
  const baseSelect = {
    id: true,
    name: true,
    slug: true,
    category: true,
    serviceType: true,
    serviceDuration: true,
  } satisfies Prisma.ProductSelect;

  try {
    const rows = await prisma.product.findMany({
      where: { storeId, isService: true, isArchived: false },
      select: { ...baseSelect, ...vendorServiceAvailabilitySelect },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      category: s.category,
      serviceType: s.serviceType,
      durationMinutes: s.durationMinutes || s.serviceDuration || 60,
      bufferMinutes: s.bufferMinutes ?? 0,
      maxPerDay: s.maxPerDay ?? null,
      useStoreHours: s.useStoreHours ?? true,
      availableDays: s.availableDays ?? [],
      availableFrom: s.availableFrom ?? null,
      availableTo: s.availableTo ?? null,
      isAvailable: s.isAvailable ?? true,
    }));
  } catch {
    const rows = await prisma.product.findMany({
      where: { storeId, isService: true, isArchived: false },
      select: baseSelect,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      category: s.category,
      serviceType: s.serviceType,
      ...DEFAULT_SERVICE_AVAILABILITY,
      durationMinutes: s.serviceDuration || DEFAULT_SERVICE_AVAILABILITY.durationMinutes,
    }));
  }
}

/** Defaults for optional edit-form fields when extension columns are not in production yet. */
export function vendorServiceEditFormDefaults() {
  return {
    bookingPaymentMode: "CUSTOMER_CHOOSES" as const,
    responseTime: null as string | null,
    minimumQuoteAmount: null as number | null,
    siteVisitRequired: false,
    subscriptionInterval: null as string | null,
    sessionsIncluded: null as number | null,
    subscriptionCancellationDays: null as number | null,
    subscriptionTrialPeriod: null as number | null,
    subscriptionTrialPrice: null as number | null,
    subscriptionCanPause: false,
    subscriptionPauseMaxWeeks: null as number | null,
    travelFee: null as number | null,
    serviceRadius: null as number | null,
    estimatedResponseMins: null as number | null,
    virtualPlatform: null as string | null,
    virtualMeetingInfo: null as string | null,
    quotePriceType: null as string | null,
  };
}
