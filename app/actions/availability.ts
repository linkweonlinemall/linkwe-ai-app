"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

// Get full availability setup for a service
export async function getServiceAvailability(serviceId: string) {
  const session = await getSession();
  if (!session) return null;

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
  });
  if (!store) return null;

  const service = await prisma.product.findFirst({
    where: { id: serviceId, storeId: store.id, isService: true },
    select: {
      id: true,
      name: true,
      serviceDuration: true,
      advanceBookingDays: true,
      cancellationHours: true,
      requiresApproval: true,
      maxGroupSize: true,
      availabilitySchedule: {
        orderBy: { dayOfWeek: "asc" },
      },
      availabilityOverrides: {
        where: {
          date: { gte: new Date() },
        },
        orderBy: { date: "asc" },
      },
    },
  });

  return service;
}

// Save the full weekly schedule
export async function saveWeeklySchedule(
  serviceId: string,
  schedule: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMins: number;
    slotBufferMins: number;
    isActive: boolean;
  }[],
) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
  });
  if (!store) return { error: "No store found" };

  const service = await prisma.product.findFirst({
    where: { id: serviceId, storeId: store.id, isService: true },
  });
  if (!service) return { error: "Service not found" };

  // Delete existing schedule and recreate
  await prisma.productAvailabilitySchedule.deleteMany({
    where: { productId: serviceId },
  });

  if (schedule.length > 0) {
    await prisma.productAvailabilitySchedule.createMany({
      data: schedule.map((s) => ({
        productId: serviceId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        slotDurationMins: s.slotDurationMins,
        slotBufferMins: s.slotBufferMins,
        maxBookingsPerSlot: 1,
        isActive: s.isActive,
      })),
    });
  }

  revalidatePath(`/dashboard/vendor/services/${serviceId}/availability`);
  return { ok: true };
}

// Save booking settings
export async function saveBookingSettings(
  serviceId: string,
  settings: {
    advanceBookingDays: number;
    cancellationHours: number;
    requiresApproval: boolean;
    maxGroupSize: number | null;
  },
) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
  });
  if (!store) return { error: "No store found" };

  await prisma.product.updateMany({
    where: { id: serviceId, storeId: store.id, isService: true },
    data: {
      advanceBookingDays: settings.advanceBookingDays,
      cancellationHours: settings.cancellationHours,
      requiresApproval: settings.requiresApproval,
      maxGroupSize: settings.maxGroupSize,
      isBookable: true,
    },
  });

  revalidatePath(`/dashboard/vendor/services/${serviceId}/availability`);
  return { ok: true };
}

// Add a date override (block a day or set custom hours)
export async function addDateOverride(
  serviceId: string,
  override: {
    date: string;
    isBlocked: boolean;
    customStartTime?: string;
    customEndTime?: string;
    reason?: string;
  },
) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
  });
  if (!store) return { error: "No store found" };

  const service = await prisma.product.findFirst({
    where: { id: serviceId, storeId: store.id, isService: true },
  });
  if (!service) return { error: "Service not found" };

  const [y, m, d] = override.date.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));

  // Check if override already exists for this date
  const existing = await prisma.productAvailabilityOverride.findFirst({
    where: { productId: serviceId, date: dateObj },
  });

  if (existing) {
    await prisma.productAvailabilityOverride.update({
      where: { id: existing.id },
      data: {
        isBlocked: override.isBlocked,
        customStartTime: override.customStartTime ?? null,
        customEndTime: override.customEndTime ?? null,
        reason: override.reason ?? null,
      },
    });
  } else {
    await prisma.productAvailabilityOverride.create({
      data: {
        productId: serviceId,
        date: dateObj,
        isBlocked: override.isBlocked,
        customStartTime: override.customStartTime ?? null,
        customEndTime: override.customEndTime ?? null,
        reason: override.reason ?? null,
      },
    });
  }

  revalidatePath(`/dashboard/vendor/services/${serviceId}/availability`);
  return { ok: true };
}

// Remove a date override
export async function removeDateOverride(overrideId: string) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
  });
  if (!store) return { error: "No store found" };

  const row = await prisma.productAvailabilityOverride.findFirst({
    where: {
      id: overrideId,
      product: { storeId: store.id, isService: true },
    },
  });
  if (!row) return { error: "Not found" };

  await prisma.productAvailabilityOverride.delete({
    where: { id: overrideId },
  });

  revalidatePath(`/dashboard/vendor/services/${row.productId}/availability`);
  return { ok: true };
}
