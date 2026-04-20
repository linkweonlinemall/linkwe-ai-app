"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function getWarehouseIncomingQueue() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  return prisma.splitOrder.findMany({
    where: {
      status: {
        in: [
          "VENDOR_PREPARING",
          "AWAITING_COURIER_PICKUP",
          "COURIER_ASSIGNED",
          "COURIER_PICKED_UP",
          "VENDOR_DROPPED_OFF",
        ],
      },
    },
    select: {
      id: true,
      referenceNumber: true,
      createdAt: true,
      status: true,
      vendorInboundMethod: true,
      subtotalMinor: true,
      store: { select: { name: true } },
      items: {
        select: {
          id: true,
          titleSnapshot: true,
          quantity: true,
          unitPriceMinor: true,
        },
      },
      inboundShipment: {
        select: {
          courier: { select: { fullName: true } },
        },
      },
      mainOrder: {
        select: {
          referenceNumber: true,
          region: true,
          buyer: { select: { fullName: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getWarehouseReceivedToday() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.splitOrder.findMany({
    where: {
      status: "AT_WAREHOUSE",
      warehouseReceivedAt: { gte: today },
    },
    select: {
      id: true,
      referenceNumber: true,
      createdAt: true,
      warehouseReceivedAt: true,
      status: true,
      vendorInboundMethod: true,
      subtotalMinor: true,
      store: { select: { name: true } },
      items: {
        select: {
          id: true,
          titleSnapshot: true,
          quantity: true,
          unitPriceMinor: true,
        },
      },
      inboundShipment: {
        select: {
          courier: { select: { fullName: true } },
        },
      },
      mainOrder: {
        select: {
          referenceNumber: true,
          region: true,
          buyer: { select: { fullName: true } },
        },
      },
    },
    orderBy: { warehouseReceivedAt: "desc" },
    take: 20,
  });
}
