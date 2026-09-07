"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function getDockBayData() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const bays = await prisma.dockBay.findMany({
    orderBy: { bayNumber: "asc" },
    include: {
      splitOrder: {
        select: {
          id: true,
          referenceNumber: true,
          status: true,
          bayNumber: true,
          store: {
            select: { name: true },
          },
          mainOrder: {
            select: {
              referenceNumber: true,
              buyer: {
                select: { fullName: true },
              },
            },
          },
        },
      },
    },
  });

  const parcels = await prisma.splitOrder.findMany({
    where: { status: { in: ["AT_WAREHOUSE", "PACKAGED", "READY_FOR_CUSTOMER_PICKUP"] } },
    select: { id: true, mainOrderId: true, referenceNumber: true, status: true, bayNumber: true, store: { select: { name: true } }, mainOrder: { select: { referenceNumber: true, buyer: { select: { fullName: true } } } } },
  });
  const numbers = new Set([...bays.map(b => b.bayNumber), ...parcels.flatMap(p => p.bayNumber ? [p.bayNumber] : [])]);
  return {
    bays: [...numbers].sort((a,b) => a-b).map(number => {
      const bay = bays.find(b => b.bayNumber === number);
      const occupants = parcels.filter(p => p.bayNumber === number || p.id === bay?.splitOrderId);
      return { bayNumber: number, occupants, blocked: !!bay?.isOccupied && !occupants.length };
    }),
    unassigned: parcels.filter(p => !p.bayNumber && !bays.some(b => b.splitOrderId === p.id)),
  };
}

export async function createDockBay(bayNumber: number) {
  const session = await getSession();
  if (session?.role !== "ADMIN") throw new Error("Administrator access required.");
  if (!Number.isInteger(bayNumber) || bayNumber < 1 || bayNumber > 9999) throw new Error("Enter a bay number from 1 to 9999.");
  await prisma.dockBay.upsert({ where: { bayNumber }, create: { bayNumber }, update: {} });
}

export async function clearStaleBay(bayNumber: number) {
  const session = await getSession();
  if (session?.role !== "ADMIN") throw new Error("Administrator access required.");
  if (!Number.isInteger(bayNumber) || bayNumber < 1 || bayNumber > 9999) throw new Error("Choose a valid bay.");
  await prisma.$transaction(async tx => {
    const bay = await tx.dockBay.update({ where: { bayNumber }, data: { updatedAt: new Date() }, include: { splitOrder: { select: { id: true, status: true } } } });
    const active = await tx.splitOrder.count({ where: { OR: [{ bayNumber }, ...(bay.splitOrderId ? [{ id: bay.splitOrderId }] : [])], status: { in: ["AT_WAREHOUSE", "PACKAGED", "READY_FOR_CUSTOMER_PICKUP"] } } });
    if (active) throw new Error("This bay still holds an active parcel. Move or dispatch the parcel first.");
    await tx.dockBay.update({ where: { bayNumber }, data: { isOccupied: false, splitOrderId: null, assignedAt: null } });
    await tx.splitOrder.updateMany({ where: { bayNumber }, data: { bayNumber: null } });
    await tx.notification.create({ data: { userId: session.userId, type: "GENERAL", title: "Bay cleared", body: `Bay ${bayNumber}: stale assignment cleared by ${session.fullName}.`, linkUrl: "/dashboard/admin?tab=linkwe-delivery&view=bays" } });
  });
}

export async function getWarehouseBayStats() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const [total, occupied, available] = await Promise.all([
    prisma.dockBay.count(),
    prisma.dockBay.count({ where: { isOccupied: true } }),
    prisma.dockBay.count({ where: { isOccupied: false } }),
  ]);

  return { total, occupied, available };
}
