"use server";

import type { MainOrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { releaseSplitOrderEarnings } from "@/lib/finance/complete-order";
import { recalculateMainOrderStatus } from "@/lib/fulfillment/order-status";
import { prisma } from "@/lib/prisma";
import { releaseBays } from "@/lib/fulfillment/bays";
import { escapeCsvCell } from "@/lib/csv/escape-cell";

export async function completeOrders(orderIds: string[]): Promise<void> {
  const session=await getSession();
  if(session?.role !== "ADMIN") redirect("/");
  if(orderIds.length>100) throw new Error("Choose no more than 100 orders.");
  for(const id of orderIds) { const result=await completeAllDeliveredSplits(id); if(!result.ok) throw new Error(result.error); }
}

export async function completeSplitOrder(
  splitOrderId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const id = splitOrderId.trim();
  if (!id) return { ok: false, error: "Split order is required" };

  const split = await prisma.splitOrder.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      earningsReleased: true,
      mainOrderId: true,
    },
  });

  if (!split) return { ok: false, error: "Split order not found" };

  if (split.earningsReleased || split.status === "COMPLETED") {
    return { ok: true };
  }

  if (split.status !== "DELIVERED") {
    return { ok: false, error: "Split must be delivered before payout release" };
  }

  const result = await releaseSplitOrderEarnings(split.id, session.userId, "ORDER_REVENUE");
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  await recalculateMainOrderStatus(split.mainOrderId);
  await prisma.mainOrder.updateMany({ where: { id: split.mainOrderId, status: { in: ["CUSTOMER_RECEIVED", "DELIVERED"] }, splitOrders: { every: { status: "COMPLETED" } } }, data: { status: "COMPLETED" } });

  revalidatePath("/dashboard/admin");
  revalidatePath(`/orders/${split.mainOrderId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard/vendor/finance");

  return { ok: true };
}

export async function completeAllDeliveredSplits(
  mainOrderId: string,
): Promise<{ ok: true; completed: number } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const orderId = mainOrderId.trim();
  if (!orderId) return { ok: false, error: "Order is required" };

  const splits = await prisma.splitOrder.findMany({
    where: {
      mainOrderId: orderId,
      status: "DELIVERED",
      earningsReleased: false,
    },
    select: { id: true },
  });

  for (const split of splits) {
    const result = await completeSplitOrder(split.id);
    if (!result.ok) {
      return result;
    }
  }

  return { ok: true, completed: splits.length };
}

const CANCELLABLE_MAIN_STATUSES: MainOrderStatus[] = ["PAID", "PROCESSING", "PARTIALLY_IN_HOUSE", "READY_TO_SHIP", "PACKING_COMPLETE"];

export async function cancelOrders(orderIds: string[], reason = "Cancelled by administrator"): Promise<{ cancelled: number; skipped: number }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");
  if (!reason.trim() || reason.length > 2000 || orderIds.length > 100) throw new Error("Supply a reason and no more than 100 orders.");
  const ids = [...new Set(orderIds.map(id => id.trim()).filter(Boolean))];
  let cancelled = 0;
  for (const id of ids) {
    const changed = await prisma.$transaction(async tx => {
      const claim = await tx.mainOrder.updateMany({ where: { id, status: { in: CANCELLABLE_MAIN_STATUSES } }, data: { updatedAt: new Date() } });
      if (!claim.count) return false;
      const order = await tx.mainOrder.findUniqueOrThrow({ where: { id }, include: { splitOrders: true } });
      if (order.splitOrders.some(s => s.earningsReleased || ["DELIVERED", "COMPLETED", "OUT_FOR_DELIVERY", "DISPATCHED", "SHIPPED"].includes(s.status))) return false;
      await tx.mainOrder.update({ where: { id }, data: { status: "CANCELLED" } });
      await tx.splitOrder.updateMany({ where: { mainOrderId: id }, data: { status: "CANCELLED", autoCompleteAt: null } });
      await releaseBays(tx, order.splitOrders.map(s => s.id));
      await tx.orderDocument.create({ data: { mainOrderId: id, documentType: "OTHER", metadata: { kind: "warehouse_audit", action: "cancel", actorId: session.userId, actorName: session.fullName, note: reason } } });
      await tx.notification.create({ data: { userId: order.buyerId, type: "ORDER_STATUS_UPDATED", title: "Order cancelled", body: "Your order has been cancelled. Contact LinkWe for any payment refund arrangements.", linkUrl: `/orders/${id}` } });
      return true;
    });
    if (changed) cancelled++;
  }
  revalidatePath("/dashboard/admin", "layout");
  revalidatePath("/dashboard/vendor", "layout");
  revalidatePath("/orders", "layout");
  return { cancelled, skipped: ids.length - cancelled };
}

export async function updateOrderStatus(orderIds: string[], status: string): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");
  if (status === "CANCELLED") {
    const result = await cancelOrders(orderIds);
    if (result.skipped) throw new Error(`${result.cancelled} cancelled; ${result.skipped} could not be cancelled in their current state.`);
    return;
  }
  if (status === "COMPLETED") {
    for (const id of orderIds) {
      const result = await completeAllDeliveredSplits(id);
      if (!result.ok) throw new Error(result.error);
    }
    return;
  }
  throw new Error("Open Manage order for preparation, receipt, packing, dispatch and delivery. Those actions update the parcel records together.");
}

export async function confirmPendingPayment(orderId: string, note: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");
  const reason = note.trim();
  if (!reason) return { ok: false, error: "Enter a reason for confirming this payment." };
  try {
    await prisma.$transaction(async (tx) => {
      const changed = await tx.mainOrder.updateMany({ where: { id: orderId, status: "PENDING_PAYMENT" }, data: { status: "PAID", updatedAt: new Date() } });
      if (!changed.count) throw new Error("This order is no longer pending payment.");
      const order = await tx.mainOrder.findUniqueOrThrow({ where: { id: orderId }, select: { referenceNumber: true, splitOrders: { select: { store: { select: { ownerId: true, name: true } } } } } });
      await tx.orderDocument.create({ data: { mainOrderId: orderId, documentType: "OTHER", metadata: { kind: "admin_payment_confirmation", actorId: session.userId, actorName: session.fullName, note: reason } } });
      const ownerIds = [...new Set(order.splitOrders.map((split) => split.store.ownerId))];
      for (const ownerId of ownerIds) {
        await tx.notification.create({ data: { userId: ownerId, type: "ORDER_STATUS_UPDATED", title: "Paid order ready for fulfilment", body: `${order.referenceNumber ?? orderId}: payment confirmed. Review your vendor order and choose the delivery method.`, linkUrl: "/dashboard/vendor/orders" } });
      }
    });
    revalidatePath("/dashboard/admin", "layout");
    revalidatePath("/dashboard/vendor/orders", "page");
    revalidatePath(`/orders/${orderId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not confirm this payment." };
  }
}

export async function exportOrdersCSV(orderIds: string[]): Promise<string> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const orders = await prisma.mainOrder.findMany({
    where: { id: { in: orderIds } },
    select: {
      referenceNumber: true,
      status: true,
      totalMinor: true,
      subtotalMinor: true,
      shippingMinor: true,
      region: true,
      createdAt: true,
      buyer: { select: { fullName: true, email: true } },
      items: {
        select: {
          titleSnapshot: true,
          quantity: true,
          priceMinor: true,
        },
      },
    },
  });

  const rows = orders
    .map((o) =>
      [
        o.referenceNumber ?? "",
        o.buyer.fullName,
        o.buyer.email,
        o.status,
        `TTD ${(o.subtotalMinor / 100).toFixed(2)}`,
        `TTD ${(o.shippingMinor / 100).toFixed(2)}`,
        `TTD ${(o.totalMinor / 100).toFixed(2)}`,
        o.region ?? "",
        o.items.map((i) => `${i.quantity}x ${i.titleSnapshot}`).join(" | "),
        new Date(o.createdAt).toLocaleDateString("en-TT"),
      ].map(escapeCsvCell).join(","),
    )
    .join("\n");

  const header = "Ref,Customer,Email,Status,Subtotal,Shipping,Total,Region,Items,Date";
  return `${header}\n${rows}`;
}

export async function getAdminOrders(filters?: {
  status?: MainOrderStatus;
  search?: string;
  limit?: number;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const limit = filters?.limit ?? 50;

  return prisma.mainOrder.findMany({
    where: {
      ...(filters?.status
        ? { status: filters.status }
        : { status: { not: "DRAFT" } }),
      ...(filters?.search
        ? {
            OR: [
              { referenceNumber: { contains: filters.search, mode: "insensitive" } },
              { buyer: { fullName: { contains: filters.search, mode: "insensitive" } } },
              { buyer: { email: { contains: filters.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      referenceNumber: true,
      status: true,
      totalMinor: true,
      subtotalMinor: true,
      shippingMinor: true,
      region: true,
      createdAt: true,
      buyer: {
        select: { fullName: true, email: true },
      },
      items: {
        select: {
          id: true,
          titleSnapshot: true,
          quantity: true,
          priceMinor: true,
          store: { select: { name: true } },
        },
      },
      splitOrders: {
        select: {
          id: true,
          referenceNumber: true,
          status: true,
          earningsReleased: true,
          bayNumber: true,
          subtotalMinor: true,
          packagedAt: true,
          store: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getAdminOrderStats() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const statuses: MainOrderStatus[] = [
    "PENDING_PAYMENT",
    "PAID",
    "PROCESSING",
    "PARTIALLY_IN_HOUSE",
    "READY_TO_SHIP",
    "PACKING_COMPLETE",
    "SHIPPED",
    "CUSTOMER_RECEIVED",
    "DELIVERED",
    "COMPLETED",
    "CANCELLED",
    "REFUNDED",
  ];

  const counts = await Promise.all(statuses.map((status) => prisma.mainOrder.count({ where: { status } })));

  return Object.fromEntries(statuses.map((status, i) => [status, counts[i]])) as Record<MainOrderStatus, number>;
}
