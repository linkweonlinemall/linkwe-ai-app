"use server";

import { revalidatePath } from "next/cache";
import type { StaffMode } from "@prisma/client";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

async function getVendorStore() {
  const session = await getSession();
  if (!session) return null;
  return prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true, staffMode: true },
  });
}

export async function getVendorStaff() {
  const store = await getVendorStore();
  if (!store) return [];
  return prisma.staffMember.findMany({
    where: { storeId: store.id },
    select: {
      id: true,
      name: true,
      bio: true,
      photoUrl: true,
      isActive: true,
      services: {
        select: {
          serviceId: true,
          service: { select: { name: true } },
        },
      },
      availability: {
        orderBy: { dayOfWeek: "asc" },
      },
      overrides: {
        select: {
          id: true,
          date: true,
          isBlocked: true,
          customStartTime: true,
          customEndTime: true,
          reason: true,
        },
        orderBy: { date: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getStoreStaffMode() {
  const store = await getVendorStore();
  return store?.staffMode ?? "SOLO";
}

export async function updateStaffMode(mode: StaffMode) {
  const store = await getVendorStore();
  if (!store) return { error: "No store found" };

  await prisma.store.update({
    where: { id: store.id },
    data: { staffMode: mode },
  });

  revalidatePath("/dashboard/vendor/staff");
  return { ok: true as const };
}

export async function createStaffMember(data: { name: string; bio?: string; photoUrl?: string }) {
  const store = await getVendorStore();
  if (!store) return { error: "No store found" };
  if (!data.name.trim()) return { error: "Name is required" };

  const staff = await prisma.staffMember.create({
    data: {
      storeId: store.id,
      name: data.name.trim(),
      bio: data.bio?.trim() || null,
      photoUrl: data.photoUrl || null,
    },
  });

  revalidatePath("/dashboard/vendor/staff");
  return { ok: true as const, staffId: staff.id };
}

export async function updateStaffMember(
  staffId: string,
  data: { name?: string; bio?: string; photoUrl?: string; isActive?: boolean },
) {
  const store = await getVendorStore();
  if (!store) return { error: "No store found" };

  const staff = await prisma.staffMember.findFirst({
    where: { id: staffId, storeId: store.id },
  });
  if (!staff) return { error: "Staff member not found" };

  await prisma.staffMember.update({
    where: { id: staffId },
    data: {
      name: data.name?.trim() ?? staff.name,
      bio: data.bio !== undefined ? data.bio.trim() || null : staff.bio,
      photoUrl: data.photoUrl !== undefined ? data.photoUrl : staff.photoUrl,
      isActive: data.isActive !== undefined ? data.isActive : staff.isActive,
    },
  });

  revalidatePath("/dashboard/vendor/staff");
  return { ok: true as const };
}

export async function deleteStaffMember(staffId: string) {
  const store = await getVendorStore();
  if (!store) return { error: "No store found" };

  const staff = await prisma.staffMember.findFirst({
    where: { id: staffId, storeId: store.id },
  });
  if (!staff) return { error: "Staff member not found" };

  await prisma.staffMember.delete({ where: { id: staffId } });
  revalidatePath("/dashboard/vendor/staff");
  return { ok: true as const };
}

export async function updateStaffServices(staffId: string, serviceIds: string[]) {
  const store = await getVendorStore();
  if (!store) return { error: "No store found" };

  const staff = await prisma.staffMember.findFirst({
    where: { id: staffId, storeId: store.id },
  });
  if (!staff) return { error: "Staff member not found" };

  await prisma.staffService.deleteMany({ where: { staffId } });

  if (serviceIds.length > 0) {
    const owned = await prisma.product.findMany({
      where: { id: { in: serviceIds }, storeId: store.id, isService: true },
      select: { id: true },
    });
    const allowed = new Set(owned.map((p) => p.id));
    const filteredIds = serviceIds.filter((id) => allowed.has(id));
    await prisma.staffService.createMany({
      data: filteredIds.map((serviceId) => ({ staffId, serviceId })),
    });
  }

  revalidatePath("/dashboard/vendor/staff");
  return { ok: true as const };
}

export async function saveStaffAvailability(
  staffId: string,
  schedule: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMins: number;
    slotBufferMins: number;
    isActive: boolean;
  }[],
) {
  const store = await getVendorStore();
  if (!store) return { error: "No store found" };

  const staff = await prisma.staffMember.findFirst({
    where: { id: staffId, storeId: store.id },
  });
  if (!staff) return { error: "Staff member not found" };

  await prisma.staffAvailability.deleteMany({ where: { staffId } });

  if (schedule.length > 0) {
    await prisma.staffAvailability.createMany({
      data: schedule.map((s) => ({ staffId, ...s })),
    });
  }

  revalidatePath("/dashboard/vendor/staff");
  return { ok: true as const };
}

export async function addStaffOverride(
  staffId: string,
  override: {
    date: string;
    isBlocked: boolean;
    customStartTime?: string;
    customEndTime?: string;
    reason?: string;
  },
) {
  const store = await getVendorStore();
  if (!store) return { error: "No store found" };

  const staff = await prisma.staffMember.findFirst({
    where: { id: staffId, storeId: store.id },
  });
  if (!staff) return { error: "Staff member not found" };

  const [y, m, d] = override.date.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));

  const existing = await prisma.staffAvailabilityOverride.findFirst({
    where: { staffId, date: dateObj },
  });

  let recordId: string;
  if (existing) {
    const updated = await prisma.staffAvailabilityOverride.update({
      where: { id: existing.id },
      data: {
        isBlocked: override.isBlocked,
        customStartTime: override.customStartTime ?? null,
        customEndTime: override.customEndTime ?? null,
        reason: override.reason ?? null,
      },
    });
    recordId = updated.id;
  } else {
    const created = await prisma.staffAvailabilityOverride.create({
      data: {
        staffId,
        date: dateObj,
        isBlocked: override.isBlocked,
        customStartTime: override.customStartTime ?? null,
        customEndTime: override.customEndTime ?? null,
        reason: override.reason ?? null,
      },
    });
    recordId = created.id;
  }

  revalidatePath("/dashboard/vendor/staff");
  return { ok: true as const, id: recordId };
}

export async function removeStaffOverride(overrideId: string) {
  const store = await getVendorStore();
  if (!store) return { error: "No store found" };

  const owned = await prisma.staffAvailabilityOverride.findFirst({
    where: {
      id: overrideId,
      staff: { storeId: store.id },
    },
  });
  if (!owned) return { error: "Not found" };

  await prisma.staffAvailabilityOverride.delete({ where: { id: overrideId } });
  revalidatePath("/dashboard/vendor/staff");
  return { ok: true as const };
}
