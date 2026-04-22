"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import type { ShipmentStatus, SplitOrderStatus } from "@prisma/client";

const WAREHOUSE_SPLIT_STATUSES: SplitOrderStatus[] = [
  "AWAITING_VENDOR_ACTION",
  "VENDOR_PREPARING",
  "AWAITING_COURIER_PICKUP",
  "COURIER_ASSIGNED",
  "COURIER_PICKED_UP",
  "VENDOR_DROPPED_OFF",
  "AT_WAREHOUSE",
  "PACKAGED",
];

const WAREHOUSE_SHIPMENT_STATUSES: ShipmentStatus[] = [
  "AWAITING_COURIER_CLAIM",
  "COURIER_ASSIGNED",
  "COURIER_PICKED_UP",
  "DELIVERED_TO_WAREHOUSE",
];

export async function deleteAllOrders(): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  await prisma.$transaction(async (tx) => {
    await tx.courierLedgerEntry.deleteMany({});
    await tx.vendorLedgerEntry.deleteMany({});
    await tx.courierPayoutRequest.deleteMany({});
    await tx.payoutRequest.deleteMany({});
    await tx.productCartItem.deleteMany({});
    await tx.review.deleteMany({ where: { mainOrderId: { not: null } } });
    await tx.orderDocument.deleteMany({});
    await tx.warehouseOrderLine.deleteMany({});
    await tx.shipment.deleteMany({});
    await tx.splitOrderItem.deleteMany({});
    await tx.splitOrder.deleteMany({});
    await tx.shippingBundle.deleteMany({});
    await tx.orderItem.deleteMany({});
    await tx.mainOrder.deleteMany({});
  });

  revalidatePath("/dashboard/admin");
}

export async function cleanupAbandonedOrders(): Promise<{ deleted: number }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const abandoned = await prisma.mainOrder.findMany({
    where: {
      status: "PENDING_PAYMENT",
      createdAt: { lte: oneHourAgo },
    },
    select: { id: true, buyerId: true },
  });

  const ids = abandoned.map((o) => o.id);

  if (ids.length === 0) return { deleted: 0 };

  const buyerIds = [...new Set(abandoned.map((o) => o.buyerId))];

  await prisma.$transaction(async (tx) => {
    if (buyerIds.length > 0) {
      await tx.productCartItem.deleteMany({
        where: { userId: { in: buyerIds } },
      });
    }
    await tx.orderItem.deleteMany({
      where: { mainOrderId: { in: ids } },
    });
    await tx.mainOrder.deleteMany({
      where: { id: { in: ids } },
    });
  });

  revalidatePath("/dashboard/admin");
  return { deleted: ids.length };
}

export async function deleteAllWarehouseQueue(): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  await prisma.$transaction(async (tx) => {
    await tx.vendorLedgerEntry.deleteMany({
      where: { splitOrder: { status: { in: WAREHOUSE_SPLIT_STATUSES } } },
    });

    const shipments = await tx.shipment.findMany({
      where: {
        OR: [
          { shipmentStatus: { in: WAREHOUSE_SHIPMENT_STATUSES } },
          { splitOrder: { status: { in: WAREHOUSE_SPLIT_STATUSES } } },
          { inboundForSplitOrder: { status: { in: WAREHOUSE_SPLIT_STATUSES } } },
        ],
      },
      select: { id: true },
    });
    const shipmentIds = shipments.map((s) => s.id);
    if (shipmentIds.length > 0) {
      await tx.courierLedgerEntry.deleteMany({
        where: { shipmentId: { in: shipmentIds } },
      });
    }

    await tx.orderDocument.deleteMany({
      where: { splitOrder: { status: { in: WAREHOUSE_SPLIT_STATUSES } } },
    });

    await tx.warehouseOrderLine.deleteMany({
      where: { splitOrder: { status: { in: WAREHOUSE_SPLIT_STATUSES } } },
    });

    await tx.splitOrderItem.deleteMany({
      where: { splitOrder: { status: { in: WAREHOUSE_SPLIT_STATUSES } } },
    });

    await tx.shipment.deleteMany({
      where: {
        OR: [
          { shipmentStatus: { in: WAREHOUSE_SHIPMENT_STATUSES } },
          { splitOrder: { status: { in: WAREHOUSE_SPLIT_STATUSES } } },
          { inboundForSplitOrder: { status: { in: WAREHOUSE_SPLIT_STATUSES } } },
        ],
      },
    });

    await tx.splitOrder.deleteMany({
      where: { status: { in: WAREHOUSE_SPLIT_STATUSES } },
    });
  });

  revalidatePath("/dashboard/admin");
}

export async function deleteAllPayouts(): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  await prisma.$transaction(async (tx) => {
    await tx.vendorLedgerEntry.deleteMany({});
    await tx.courierLedgerEntry.deleteMany({});
    await tx.courierPayoutRequest.deleteMany({});
    await tx.payoutRequest.deleteMany({});
  });

  revalidatePath("/dashboard/admin");
}
