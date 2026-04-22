import { redirect } from "next/navigation";

import CourierDashboardClient from "./components/courier-dashboard-client";
import { getSession } from "@/lib/auth/session";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { prisma } from "@/lib/prisma";
import { getShippingZone } from "@/lib/shipping/trinidad-zoning";

function getZoneSortOrder(shipmentRegion: string | null, courierZone: string | null): number {
  if (!shipmentRegion) return 99;
  const shipmentZone = getShippingZone(shipmentRegion);
  if (shipmentZone === courierZone) return 0;
  const zoneOrder = ["METRO", "EXTENDED", "REMOTE", "TOBAGO_METRO"];
  const courierIdx = zoneOrder.indexOf(courierZone ?? "");
  const shipmentIdx = zoneOrder.indexOf(shipmentZone);
  return Math.abs(courierIdx - shipmentIdx);
}

export default async function CourierDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "COURIER");

  const courierId = session.userId;

  const courier = await prisma.user.findUnique({
    where: { id: courierId },
    select: { fullName: true, region: true },
  });

  const courierRegion = courier?.region ?? null;

  const courierZone = courierRegion ? getShippingZone(courierRegion) : null;

  const availablePickups = await prisma.shipment.findMany({
    where: {
      shipmentStatus: "AWAITING_COURIER_CLAIM",
      type: "INBOUND_COURIER_PICKUP",
    },
    include: {
      inboundForSplitOrder: {
        include: {
          store: {
            select: { name: true, address: true, region: true },
          },
          items: {
            select: {
              id: true,
              titleSnapshot: true,
              quantity: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const sortedAvailablePickups = [...availablePickups].sort(
    (a, b) => getZoneSortOrder(a.region, courierZone) - getZoneSortOrder(b.region, courierZone),
  );

  const myActivePickups = await prisma.shipment.findMany({
    where: {
      courierId,
      type: "INBOUND_COURIER_PICKUP",
      shipmentStatus: {
        in: ["COURIER_ASSIGNED", "COURIER_PICKED_UP"],
      },
    },
    include: {
      inboundForSplitOrder: {
        include: {
          store: {
            select: { name: true, address: true, region: true },
          },
          items: {
            select: {
              id: true,
              titleSnapshot: true,
              quantity: true,
            },
          },
        },
      },
    },
    orderBy: { claimedAt: "desc" },
  });

  const completedPickups = await prisma.shipment.findMany({
    where: {
      courierId,
      type: "INBOUND_COURIER_PICKUP",
      shipmentStatus: "DELIVERED_TO_WAREHOUSE",
    },
    include: {
      inboundForSplitOrder: {
        include: {
          store: {
            select: { name: true, region: true },
          },
        },
      },
    },
    orderBy: { deliveredAt: "desc" },
    take: 20,
  });

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <CourierDashboardClient
        courierName={courier?.fullName ?? "Courier"}
        courierRegion={courierRegion}
        courierZone={courierZone}
        availablePickups={sortedAvailablePickups}
        myActivePickups={myActivePickups}
        completedPickups={completedPickups}
      />
    </div>
  );
}
