"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getCourierPickupFeeLabel,
  getCourierPickupFeeMinor,
} from "@/lib/fulfillment/courier-pickup-rates";
import { recalculateMainOrderStatus } from "@/lib/fulfillment/order-status";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function markItemsReceivedAtWarehouse(
  formData: FormData,
): Promise<{ bayNumber: number | null }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const splitOrderId = String(formData.get("splitOrderId") ?? "").trim();
  if (!splitOrderId) redirect("/");

  const splitOrder = await prisma.splitOrder.findUnique({
    where: { id: splitOrderId },
    select: { id: true, mainOrderId: true, storeId: true, inboundShipmentId: true },
  });

  if (!splitOrder) redirect("/");

  await prisma.$transaction(async (tx) => {
    await tx.splitOrder.update({
      where: { id: splitOrderId },
      data: {
        status: "AT_WAREHOUSE",
        warehouseReceivedAt: new Date(),
      },
    });

    const availableBay = await tx.dockBay.findFirst({
      where: { isOccupied: false },
      orderBy: { bayNumber: "asc" },
    });

    if (availableBay) {
      await tx.dockBay.update({
        where: { id: availableBay.id },
        data: {
          isOccupied: true,
          splitOrderId: splitOrderId,
          assignedAt: new Date(),
        },
      });

      await tx.splitOrder.update({
        where: { id: splitOrderId },
        data: { bayNumber: availableBay.bayNumber },
      });
    }

    const inboundShipment = splitOrder.inboundShipmentId
      ? await tx.shipment.findUnique({
          where: { id: splitOrder.inboundShipmentId },
          select: {
            id: true,
            courierId: true,
            region: true,
            pickupFeeMinor: true,
            totalWeightLbs: true,
            shipmentStatus: true,
            type: true,
          },
        })
      : await tx.shipment.findFirst({
          where: {
            inboundForSplitOrderId: splitOrderId,
            type: "INBOUND_COURIER_PICKUP",
          },
          select: {
            id: true,
            courierId: true,
            region: true,
            pickupFeeMinor: true,
            totalWeightLbs: true,
            shipmentStatus: true,
            type: true,
          },
        });

    if (!inboundShipment || inboundShipment.type !== "INBOUND_COURIER_PICKUP" || !inboundShipment.courierId) {
      return;
    }

    const store = await tx.store.findUnique({
      where: { id: splitOrder.storeId },
      select: { region: true },
    });

    const region = store?.region ?? inboundShipment.region ?? "";
    const weightForLabel = inboundShipment.totalWeightLbs ?? 1;
    const feeMinor = inboundShipment.pickupFeeMinor ?? getCourierPickupFeeMinor(region, 1);
    const labelWeightLbs =
      inboundShipment.pickupFeeMinor != null ? weightForLabel : 1;

    const existingEarning = await tx.courierLedgerEntry.findFirst({
      where: {
        shipmentId: inboundShipment.id,
        entryType: "PICKUP_EARNING",
      },
    });

    if (!existingEarning && feeMinor > 0) {
      await tx.courierLedgerEntry.create({
        data: {
          courierId: inboundShipment.courierId,
          amountMinor: feeMinor,
          currency: "TTD",
          entryType: "PICKUP_EARNING",
          shipmentId: inboundShipment.id,
          description: getCourierPickupFeeLabel(region, labelWeightLbs),
        },
      });
    }

    if (inboundShipment.shipmentStatus !== "DELIVERED_TO_WAREHOUSE") {
      await tx.shipment.update({
        where: { id: inboundShipment.id },
        data: {
          shipmentStatus: "DELIVERED_TO_WAREHOUSE",
          deliveredAt: new Date(),
        },
      });
    }
  });

  await recalculateMainOrderStatus(splitOrder.mainOrderId);
  revalidatePath(`/orders/${splitOrder.mainOrderId}`, "page");
  revalidatePath("/", "page");

  const updatedSplitOrder = await prisma.splitOrder.findUnique({
    where: { id: splitOrderId },
    select: { bayNumber: true },
  });
  return { bayNumber: updatedSplitOrder?.bayNumber ?? null };
}
