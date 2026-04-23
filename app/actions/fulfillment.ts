"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { calculateBatchWeightLbs, getCourierPickupFeeMinor } from "@/lib/fulfillment/courier-pickup-rates";
import { getSession } from "@/lib/auth/session";
import { recalculateMainOrderStatus } from "@/lib/fulfillment/order-status";
import { prisma } from "@/lib/prisma";

export async function chooseVendorDropoff(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") redirect("/");

  const splitOrderId = String(formData.get("splitOrderId") ?? "").trim();
  if (!splitOrderId) redirect("/dashboard/vendor");

  const splitOrder = await prisma.splitOrder.findFirst({
    where: {
      id: splitOrderId,
      store: { ownerId: session.userId },
      status: "AWAITING_VENDOR_ACTION",
    },
    select: { id: true, mainOrderId: true },
  });

  if (!splitOrder) redirect("/dashboard/vendor");

  await prisma.splitOrder.update({
    where: { id: splitOrderId },
    data: {
      status: "VENDOR_PREPARING",
      vendorInboundMethod: "VENDOR_DROPOFF",
      vendorActionAt: new Date(),
    },
  });

  await recalculateMainOrderStatus(splitOrder.mainOrderId);
  revalidatePath(`/orders/${splitOrder.mainOrderId}`, "page");
  revalidatePath("/dashboard/vendor");
  redirect(`/dashboard/vendor/orders/${splitOrderId}`);
}

export async function chooseCourierPickup(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") redirect("/");

  const splitOrderId = String(formData.get("splitOrderId") ?? "").trim();
  if (!splitOrderId) redirect("/dashboard/vendor");

  const splitOrder = await prisma.splitOrder.findFirst({
    where: {
      id: splitOrderId,
      store: { ownerId: session.userId },
      status: "AWAITING_VENDOR_ACTION",
    },
    select: {
      id: true,
      mainOrderId: true,
      storeId: true,
      pickupRegion: true,
      store: { select: { region: true, address: true } },
    },
  });

  if (!splitOrder) redirect("/dashboard/vendor");

  const batchableSplitOrders = await prisma.splitOrder.findMany({
    where: {
      storeId: splitOrder.storeId,
      status: "AWAITING_VENDOR_ACTION",
      inboundShipmentId: null,
    },
    select: {
      id: true,
      mainOrderId: true,
      items: {
        select: {
          quantity: true,
          listingId: true,
        },
      },
    },
  });

  const mainOrderIds = [...new Set(batchableSplitOrders.map((s) => s.mainOrderId))];
  const listingIds = [
    ...new Set(batchableSplitOrders.flatMap((s) => s.items.map((i) => i.listingId))),
  ];

  const orderItems =
    mainOrderIds.length && listingIds.length
      ? await prisma.orderItem.findMany({
          where: {
            mainOrderId: { in: mainOrderIds },
            listingId: { in: listingIds },
          },
          select: {
            mainOrderId: true,
            listingId: true,
            weightLbs: true,
          },
        })
      : [];

  const weightInputs = batchableSplitOrders.flatMap((so) =>
    so.items.map((it) => {
      const oi = orderItems.find(
        (o) => o.mainOrderId === so.mainOrderId && o.listingId === it.listingId,
      );
      const unitLbs = oi && oi.weightLbs > 0 ? oi.weightLbs : 1;
      return {
        quantity: it.quantity,
        product: { weight: unitLbs, weightUnit: "LB" as const },
      };
    }),
  );

  const rawWeightLbs = calculateBatchWeightLbs(weightInputs);
  const totalWeightLbs = rawWeightLbs > 0 ? rawWeightLbs : 1;

  const region = splitOrder.pickupRegion ?? splitOrder.store.region ?? "unknown";
  const pickupFeeMinor = getCourierPickupFeeMinor(region, totalWeightLbs);

  await prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.create({
      data: {
        type: "INBOUND_COURIER_PICKUP",
        shipmentStatus: "AWAITING_COURIER_CLAIM",
        region,
        totalWeightLbs,
        pickupFeeMinor,
        inboundForSplitOrderId: splitOrderId,
        splitOrderId: splitOrderId,
      },
    });

    await tx.splitOrder.updateMany({
      where: { id: { in: batchableSplitOrders.map((s) => s.id) } },
      data: {
        status: "AWAITING_COURIER_PICKUP",
        vendorInboundMethod: "PICKUP_REQUESTED",
        vendorActionAt: new Date(),
        inboundShipmentId: shipment.id,
      },
    });
  });

  const uniqueMainOrderIds = [...new Set(batchableSplitOrders.map((s) => s.mainOrderId))];
  for (const mid of uniqueMainOrderIds) {
    await recalculateMainOrderStatus(mid);
    revalidatePath(`/orders/${mid}`, "page");
  }
  revalidatePath("/dashboard/vendor");
  redirect(`/dashboard/vendor/orders/${splitOrderId}`);
}
