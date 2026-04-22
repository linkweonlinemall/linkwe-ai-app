"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recalculateMainOrderStatus } from "@/lib/fulfillment/order-status";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function markItemsReceivedAtWarehouse(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const splitOrderId = String(formData.get("splitOrderId") ?? "").trim();
  if (!splitOrderId) redirect("/");

  const splitOrder = await prisma.splitOrder.findUnique({
    where: { id: splitOrderId },
    select: { id: true, mainOrderId: true, storeId: true },
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

    const inboundShipment = await tx.shipment.findFirst({
      where: {
        inboundForSplitOrderId: splitOrderId,
        type: "INBOUND_COURIER_PICKUP",
      },
      select: {
        id: true,
        courierId: true,
        region: true,
      },
    });

    if (inboundShipment?.courierId) {
      const { getCourierPickupFeeMinor } = await import("@/lib/fulfillment/courier-pickup-rates");

      const store = await tx.store.findUnique({
        where: { id: splitOrder.storeId },
        select: { region: true },
      });

      const feeMinor = getCourierPickupFeeMinor(store?.region ?? inboundShipment.region ?? "");

      if (feeMinor > 0) {
        await tx.courierLedgerEntry.create({
          data: {
            courierId: inboundShipment.courierId,
            amountMinor: feeMinor,
            currency: "TTD",
            entryType: "PICKUP_EARNING",
            shipmentId: inboundShipment.id,
            description: `Pickup earning — items received at warehouse`,
          },
        });
      }

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
}
