"use server";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function updateCourierLocation(
  latitude: number,
  longitude: number,
  heading: number | null,
  accuracy: number | null,
): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "COURIER") return;

  await prisma.courierLocation.upsert({
    where: { courierId: session.userId },
    create: {
      courierId: session.userId,
      latitude,
      longitude,
      heading: heading ?? null,
      accuracy: accuracy ?? null,
      isActive: true,
    },
    update: {
      latitude,
      longitude,
      heading: heading ?? null,
      accuracy: accuracy ?? null,
      isActive: true,
    },
  });
}

export async function setCourierInactive(): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "COURIER") return;

  await prisma.courierLocation.updateMany({
    where: { courierId: session.userId },
    data: { isActive: false },
  });
}
