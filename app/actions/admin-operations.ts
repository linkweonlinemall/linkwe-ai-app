"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { alertOperations } from "@/lib/fulfillment/admin-alerts";
import { getOrderAutoCompleteAt } from "@/lib/finance/complete-order";
import { recalculateMainOrderStatus } from "@/lib/fulfillment/order-status";
import { assignBay, releaseBays } from "@/lib/fulfillment/bays";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") throw new Error("Administrator access required.");
  return session;
}

export async function getOperationsWorkspace() {
  await requireAdmin();
  const [orders, warehouses, verification, payouts] = await Promise.all([
    prisma.mainOrder.findMany({
      where: { status: { notIn: ["DRAFT", "PENDING_PAYMENT", "CANCELLED", "REFUNDED", "COMPLETED", "CUSTOMER_RECEIVED"] } },
      orderBy: { createdAt: "asc" }, take: 150,
      select: {
        id: true, referenceNumber: true, status: true, createdAt: true, updatedAt: true, shippingMinor: true, region: true,
        buyer: { select: { fullName: true, email: true } },
        shippingAddress: { select: { line1: true, line2: true, city: true, phone: true, latitude: true, longitude: true } },
        items: { select: { titleSnapshot: true, quantity: true, weightLbs: true, priceMinor: true, storeId: true, product: { select: { isDigital: true } } } },
        splitOrders: { select: {
          id: true, referenceNumber: true, status: true, vendorInboundMethod: true, warehouseReceivedAt: true, bayNumber: true,
          store: { select: { id: true, name: true, address: true, region: true, latitude: true, longitude: true, owner: { select: { phone: true, email: true } } } },
          inboundShipment: { select: { id: true, trackingNumber: true, shipmentStatus: true } },
        } },
        shippingBundles: { select: { id: true, shipment: { select: { id: true, trackingNumber: true, status: true } } } },
        documents: { where: { documentType: "OTHER" }, orderBy: { generatedAt: "desc" }, take: 12, select: { id: true, metadata: true, generatedAt: true } },
      },
    }),
    prisma.warehouse.findMany({ where: { isActive: true }, orderBy: { code: "asc" }, select: { id: true, name: true, address: { select: { line1: true, city: true, phone: true, latitude: true, longitude: true } } } }),
    prisma.user.count({ where: { role: "VENDOR", idVerificationStatus: "PENDING" } }),
    prisma.payoutRequest.count({ where: { status: "PENDING" } }),
  ]);
  return JSON.parse(JSON.stringify({ orders, warehouses, verification, payouts, updatedAt: new Date().toISOString() })) as OperationsWorkspace;
}

export type OperationsWorkspace = {
  updatedAt: string; verification: number; payouts: number;
  warehouses: { id: string; name: string; address: { line1: string; city: string; phone: string | null; latitude: string | number | null; longitude: string | number | null } | null }[];
  orders: {
    id: string; referenceNumber: string | null; status: string; createdAt: string; updatedAt: string; shippingMinor: number; region: string;
    buyer: { fullName: string | null; email: string };
    shippingAddress: { line1: string; line2: string | null; city: string; phone: string | null; latitude: string | number | null; longitude: string | number | null } | null;
    items: { titleSnapshot: string; quantity: number; weightLbs: number; priceMinor: number; storeId: string; product: { isDigital: boolean } | null }[];
    splitOrders: { id: string; referenceNumber: string | null; status: string; vendorInboundMethod: string | null; warehouseReceivedAt: string | null; bayNumber: number | null;
      store: { id: string; name: string; address: string | null; region: string | null; latitude: number | null; longitude: number | null; owner: { phone: string | null; email: string } };
      inboundShipment: { id: string; trackingNumber: string | null; shipmentStatus: string | null } | null;
    }[];
    shippingBundles: { id: string; shipment: { id: string; trackingNumber: string | null; status: string } | null }[];
    documents: { id: string; metadata: unknown; generatedAt: string }[];
  }[];
};

export async function updateWarehouseOrder(input: { orderId: string; action: "prepare" | "receive" | "move_bay" | "book_collection" | "pack" | "dispatch" | "deliver" | "pickup_ready" | "note"; splitId?: string; reference?: string; note?: string; warehouseId?: string; bay?: number; expectedUpdatedAt?: string }) {
  const admin = await requireAdmin();
  if (!input.orderId || !["prepare", "receive", "move_bay", "book_collection", "pack", "dispatch", "deliver", "pickup_ready", "note"].includes(input.action)) return { ok: false, error: "Choose a valid operation." };
  const reference = (input.reference ?? "").trim();
  const note = (input.note ?? "").trim();
  if (reference.length > 120 || note.length > 2000) return { ok: false, error: "Reference or note is too long." };
  if (input.bay != null && (!Number.isInteger(input.bay) || input.bay < 1 || input.bay > 9999)) return { ok: false, error: "Bay must be a whole number between 1 and 9999." };
  try {
    await prisma.$transaction(async (tx) => {
      // Serialize all staff operations for the same customer order.
      if (input.expectedUpdatedAt) {
        const claimed = await tx.mainOrder.updateMany({ where: { id: input.orderId, updatedAt: new Date(input.expectedUpdatedAt) }, data: { updatedAt: new Date() } });
        if (!claimed.count) throw new Error("This order changed after the preview. Refresh and review the action again.");
      } else await tx.mainOrder.update({ where: { id: input.orderId }, data: { updatedAt: new Date() } });
      const order = await tx.mainOrder.findUniqueOrThrow({ where: { id: input.orderId }, include: { splitOrders: true, items: { include: { product: { select: { isDigital: true } } } }, shippingBundles: { include: { shipment: true } } } });
      if (["DRAFT", "PENDING_PAYMENT", "CANCELLED", "REFUNDED", "COMPLETED", "CUSTOMER_RECEIVED"].includes(order.status)) throw new Error("This order is not available for warehouse processing.");
      const physical = order.splitOrders.filter((split) => order.items.some((item) => item.storeId === split.storeId && !item.product?.isDigital));
      const split = physical.find((s) => s.id === input.splitId);
      if (input.action === "prepare") {
        if (!split || !["AWAITING_VENDOR_ACTION", "PREPARING"].includes(split.status)) throw new Error("Choose a vendor order awaiting preparation.");
        await tx.splitOrder.update({ where: { id: split.id }, data: { status: "VENDOR_PREPARING" } });
      } else if (input.action === "book_collection") {
        if (!split?.inboundShipmentId || split.vendorInboundMethod !== "PICKUP_REQUESTED" || split.status !== "AWAITING_COURIER_PICKUP") throw new Error("This order is not awaiting a collection booking.");
        if (!reference) throw new Error("Enter the CSF reference after placing the collection request in their portal.");
        await tx.shipment.update({ where: { id: split.inboundShipmentId }, data: { trackingNumber: reference, carrier: "CSF Couriers", shipmentStatus: "READY_FOR_PICKUP" } });
        await tx.splitOrder.update({ where: { id: split.id }, data: { status: "COURIER_ASSIGNED" } });
      } else if (input.action === "move_bay") {
        if (!split || !["AT_WAREHOUSE", "PACKAGED", "READY_FOR_CUSTOMER_PICKUP"].includes(split.status) || !input.bay) throw new Error("Choose a parcel in the warehouse and a destination bay.");
        await assignBay(tx, split.id, input.bay);
      } else if (input.action === "receive") {
        if (!split || !["AWAITING_VENDOR_ACTION", "PREPARING", "VENDOR_PREPARING", "AWAITING_COURIER_PICKUP", "COURIER_ASSIGNED", "COURIER_PICKED_UP", "VENDOR_DROPPED_OFF", "READY_FOR_LINKWE"].includes(split.status)) throw new Error("This vendor order is not awaiting warehouse receipt.");
        await tx.splitOrder.update({ where: { id: split.id }, data: { status: "AT_WAREHOUSE", warehouseReceivedAt: new Date(), bayNumber: input.bay ?? null } });
        if (input.bay) await assignBay(tx, split.id, input.bay);
        if (split.inboundShipmentId) await tx.shipment.update({ where: { id: split.inboundShipmentId }, data: { shipmentStatus: "DELIVERED_TO_WAREHOUSE", deliveredAt: new Date() } });
        await tx.notification.create({ data: { userId: (await tx.store.findUniqueOrThrow({ where: { id: split.storeId }, select: { ownerId: true } })).ownerId, type: "ORDER_STATUS_UPDATED", title: "Order received at LinkWe warehouse", body: split.referenceNumber ?? split.id, linkUrl: `/dashboard/vendor/orders/${split.id}` } });
        if (physical.every((s) => s.id === split.id || s.warehouseReceivedAt)) await alertOperations(tx, "Customer order ready to combine", `${order.referenceNumber ?? order.id}: all vendor parcels have arrived.`);
      } else if (input.action === "pack") {
        if (!physical.length || !physical.every((s) => s.status === "AT_WAREHOUSE" && s.warehouseReceivedAt)) throw new Error("Receive every physical vendor order before combining the customer parcel.");
        const warehouse = await tx.warehouse.findFirst({ where: { id: input.warehouseId, isActive: true, addressId: { not: null } } });
        if (!warehouse) throw new Error("Configure and choose your warehouse first.");
        const bundle = await tx.shippingBundle.create({ data: { mainOrderId: order.id, warehouseId: warehouse.id, status: "BUNDLED", bundledAt: new Date() } });
        await tx.splitOrder.updateMany({ where: { id: { in: physical.map((s) => s.id) } }, data: { shippingBundleId: bundle.id, status: "PACKAGED", packagedAt: new Date() } });
        await alertOperations(tx, "Book customer delivery with CSF", `${order.referenceNumber ?? order.id} is packed and ready for dispatch.`);
      } else if (input.action === "pickup_ready") {
        if (order.shippingAddressId || !physical.length || !physical.every((s) => s.status === "PACKAGED")) throw new Error("Only packed warehouse pickup orders can be made ready for collection.");
        await tx.splitOrder.updateMany({ where: { id: { in: physical.map((s) => s.id) } }, data: { status: "READY_FOR_CUSTOMER_PICKUP" } });
        await tx.notification.create({ data: { userId: order.buyerId, type: "ORDER_STATUS_UPDATED", title: "Ready for pickup at LinkWe warehouse", body: "All your vendor parcels are combined and ready to collect.", linkUrl: `/orders/${order.id}` } });
      } else if (input.action === "dispatch") {
        if (!order.shippingAddressId) throw new Error("This is a warehouse pickup order, not a courier delivery.");
        if (!reference) throw new Error("Enter the CSF tracking reference after booking and labelling the combined parcel.");
        if (!physical.length || !physical.every((s) => s.status === "PACKAGED" && s.warehouseReceivedAt)) throw new Error("All physical vendor orders must be received and packed before dispatch.");
        const bundle = order.shippingBundles.find((b) => b.status === "BUNDLED");
        if (!bundle) throw new Error("Combine the order first.");
        await tx.shipment.create({ data: { shippingBundleId: bundle.id, carrier: "CSF Couriers", trackingNumber: reference, status: "OUT_FOR_DELIVERY", type: "OUTBOUND_DELIVERY" } });
        await tx.shippingBundle.update({ where: { id: bundle.id }, data: { status: "SHIPPED", releasedAt: new Date() } });
        await tx.splitOrder.updateMany({ where: { id: { in: physical.map((s) => s.id) } }, data: { status: "OUT_FOR_DELIVERY" } });
        await releaseBays(tx, physical.map((s) => s.id));
        await tx.notification.create({ data: { userId: order.buyerId, type: "ORDER_STATUS_UPDATED", title: "Your combined order is on its way", body: `CSF Couriers reference: ${reference}`, linkUrl: `/orders/${order.id}` } });
      } else if (input.action === "deliver") {
        if (!note) throw new Error("Record delivery confirmation from CSF before marking delivered.");
        if (!physical.length || !physical.every((s) => s.status === "OUT_FOR_DELIVERY" || (!order.shippingAddressId && s.status === "READY_FOR_CUSTOMER_PICKUP"))) throw new Error("Dispatch the combined order or make it ready for warehouse pickup first.");
        const now = new Date();
        await tx.splitOrder.updateMany({ where: { id: { in: physical.map((s) => s.id) } }, data: { status: "DELIVERED", deliveredAt: now, autoCompleteAt: getOrderAutoCompleteAt(now) } });
        await releaseBays(tx, physical.map(s => s.id));
        await tx.shipment.updateMany({ where: { shippingBundleId: { in: order.shippingBundles.map((b) => b.id) }, type: "OUTBOUND_DELIVERY" }, data: { status: "DELIVERED", deliveredAt: now } });
        await tx.notification.create({ data: { userId: order.buyerId, type: "ORDER_STATUS_UPDATED", title: "Your order has been delivered", body: "Please confirm receipt from your order page.", linkUrl: `/orders/${order.id}` } });
      } else if (!note) throw new Error("Enter a staff note.");
      await tx.orderDocument.create({ data: { mainOrderId: order.id, documentType: "OTHER", metadata: { kind: "warehouse_audit", action: input.action, actorId: admin.userId, actorName: admin.fullName ?? "Staff", reference, note, splitId: input.splitId ?? null, bay: input.bay ?? null } } });
    });
    await recalculateMainOrderStatus(input.orderId);
    revalidatePath("/dashboard/admin", "layout");
    revalidatePath("/dashboard/vendor", "layout");
    revalidatePath(`/orders/${input.orderId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not update this order." };
  }
}
