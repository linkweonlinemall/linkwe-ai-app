"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function getOperationsMapData() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const [activeCouriers, pendingPickups, warehouseLocations] = await Promise.all([
    prisma.courierLocation.findMany({
      where: { isActive: true },
      include: {
        courier: {
          select: {
            fullName: true,
            region: true,
            shipments: {
              where: {
                type: "INBOUND_COURIER_PICKUP",
                shipmentStatus: {
                  in: ["COURIER_ASSIGNED", "COURIER_PICKED_UP"],
                },
              },
              select: {
                id: true,
                shipmentStatus: true,
                region: true,
                inboundForSplitOrder: {
                  select: {
                    store: { select: { name: true, address: true } },
                  },
                },
              },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.shipment.findMany({
      where: {
        type: "INBOUND_COURIER_PICKUP",
        shipmentStatus: "AWAITING_COURIER_CLAIM",
      },
      select: {
        id: true,
        region: true,
        createdAt: true,
        inboundForSplitOrder: {
          select: {
            // `region` is used in map-tab when lat/lng are null (see getRegionCoordinates there).
            store: {
              select: {
                name: true,
                address: true,
                latitude: true,
                longitude: true,
                region: true,
              },
            },
          },
        },
      },
      take: 50,
    }),
    prisma.warehouse.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        address: {
          select: {
            line1: true,
            city: true,
            region: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    }),
  ]);

  const staleIds = activeCouriers
    .filter((c) => new Date(c.updatedAt) < fiveMinutesAgo)
    .map((c) => c.courierId);

  return {
    activeCouriers,
    pendingPickups,
    warehouseLocations,
    staleIds,
  };
}
