"use server";

import { NotificationType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createNotification } from "@/lib/notifications/create";
import { alertOperations } from "@/lib/fulfillment/admin-alerts";
import { getSession } from "@/lib/auth/session";
import { recalculateMainOrderStatus } from "@/lib/fulfillment/order-status";
import { prisma } from "@/lib/prisma";

async function chooseInbound(formData: FormData, method: "VENDOR_DROPOFF" | "PICKUP_REQUESTED"): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") redirect("/");
  const id = String(formData.get("splitOrderId") ?? "").trim();
  const mainOrderId = await prisma.$transaction(async (tx) => {
    const split = await tx.splitOrder.findFirst({ where: { id, store: { ownerId: session.userId }, status: { in: ["AWAITING_VENDOR_ACTION", "PREPARING"] } }, select: { mainOrderId: true, store: { select: { name: true, address: true, region: true } } } });
    if (!split) return null;
    const physical = await tx.orderItem.count({ where: { mainOrderId: split.mainOrderId, store: { ownerId: session.userId }, OR: [{ productId: null }, { product: { isDigital: false } }] } });
    if (!physical) throw new Error("Digital orders do not require warehouse handover.");
    const claimed = await tx.splitOrder.updateMany({ where: { id, status: { in: ["AWAITING_VENDOR_ACTION", "PREPARING"] }, vendorInboundMethod: null }, data: {
      vendorInboundMethod: method, vendorActionAt: new Date(), status: method === "PICKUP_REQUESTED" ? "AWAITING_COURIER_PICKUP" : "VENDOR_PREPARING",
      pickupRequestedAt: method === "PICKUP_REQUESTED" ? new Date() : null,
    } });
    if (!claimed.count) return null;
    if (method === "PICKUP_REQUESTED") {
      const shipment = await tx.shipment.create({ data: { type: "INBOUND_COURIER_PICKUP", carrier: "CSF Couriers", shipmentStatus: "PENDING", pickupFeeMinor: 4000, region: split.store.region, inboundForSplitOrderId: id, splitOrderId: id } });
      await tx.splitOrder.update({ where: { id }, data: { inboundShipmentId: shipment.id } });
    }
    await alertOperations(tx, method === "PICKUP_REQUESTED" ? "Book a CSF vendor collection" : "Vendor preparing warehouse drop-off", `${split.store.name} · ${id}. ${method === "PICKUP_REQUESTED" ? "TTD 40 deducted from order earnings. Book collection in CSF." : "No vendor collection charge."}`);
    return split.mainOrderId;
  });
  if (mainOrderId) await recalculateMainOrderStatus(mainOrderId);
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/vendor", "layout");
  redirect(`/dashboard/vendor/orders/${id}`);
}

export async function chooseVendorDropoff(formData: FormData): Promise<void> { return chooseInbound(formData, "VENDOR_DROPOFF"); }
export async function chooseCourierPickup(formData: FormData): Promise<void> { return chooseInbound(formData, "PICKUP_REQUESTED"); }

export async function startPreparing(formData: FormData): Promise<void> {
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
      status: "PREPARING",
      vendorActionAt: new Date(),
    },
  });

  await recalculateMainOrderStatus(splitOrder.mainOrderId);
  revalidatePath(`/orders/${splitOrder.mainOrderId}`, "page");
  revalidatePath("/dashboard/vendor");
  revalidatePath(`/dashboard/vendor/orders/${splitOrderId}`, "page");
  redirect(`/dashboard/vendor/orders/${splitOrderId}`);
}

export async function markShipped(_formData: FormData): Promise<void> {
  throw new Error("Vendor delivery has been retired. All physical orders must go through the LinkWe warehouse.");
}

export async function markReadyForCustomerPickup(_formData: FormData): Promise<void> {
  throw new Error("Warehouse staff confirm customer pickup readiness after consolidation.");
}
export async function markReadyForLinkWe(_formData: FormData): Promise<void> {
  throw new Error("Choose free warehouse drop-off or TTD 40 collection from your order page.");
}
export async function markDigitalFulfilled(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") redirect("/");
  const id = String(formData.get("splitOrderId") ?? "");
  const split = await prisma.splitOrder.findFirst({ where: { id, store: { ownerId: session.userId }, status: { in: ["AWAITING_VENDOR_ACTION", "PREPARING"] } }, select: { mainOrderId: true, storeId: true, mainOrder: { select: { buyerId: true } } } });
  if (!split) return;
  const items = await prisma.orderItem.findMany({ where: { mainOrderId: split.mainOrderId, storeId: split.storeId }, select: { product: { select: { isDigital: true } } } });
  if (!items.length || items.some((item) => !item.product?.isDigital)) throw new Error("Physical orders must go through the warehouse.");
  await prisma.splitOrder.updateMany({ where: { id, status: { in: ["AWAITING_VENDOR_ACTION", "PREPARING"] } }, data: { status: "DELIVERED", deliveredAt: new Date() } });
  await recalculateMainOrderStatus(split.mainOrderId);
  revalidatePath("/dashboard/vendor", "layout");
  revalidatePath(`/orders/${split.mainOrderId}`);
}
