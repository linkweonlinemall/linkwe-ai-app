"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
      pickupRegion: true,
      pickupAddress: true,
      store: { select: { region: true, address: true } },
    },
  });

  if (!splitOrder) redirect("/dashboard/vendor");

  const region = splitOrder.pickupRegion ?? splitOrder.store.region ?? "unknown";

  await prisma.$transaction(async (tx) => {
    await tx.splitOrder.update({
      where: { id: splitOrderId },
      data: {
        status: "AWAITING_COURIER_PICKUP",
        vendorInboundMethod: "PICKUP_REQUESTED",
        vendorActionAt: new Date(),
      },
    });

    await tx.shipment.create({
      data: {
        type: "INBOUND_COURIER_PICKUP",
        shipmentStatus: "AWAITING_COURIER_CLAIM",
        region,
        inboundForSplitOrderId: splitOrderId,
        splitOrderId: splitOrderId,
      },
    });
  });

  await recalculateMainOrderStatus(splitOrder.mainOrderId);
  revalidatePath(`/orders/${splitOrder.mainOrderId}`, "page");
  revalidatePath("/dashboard/vendor");
  redirect(`/dashboard/vendor/orders/${splitOrderId}`);
}
