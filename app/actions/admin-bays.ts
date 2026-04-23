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

  return bays;
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
