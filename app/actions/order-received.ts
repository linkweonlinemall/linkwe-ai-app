"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import {
  getOrderAutoCompleteAt,
  releaseSplitOrderEarnings,
} from "@/lib/finance/complete-order";
import { recalculateMainOrderStatus } from "@/lib/fulfillment/order-status";
import { prisma } from "@/lib/prisma";

export async function markOrderReceived(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) return { error: "Order is required" };

  const order = await prisma.mainOrder.findFirst({
    where: {
      id: orderId,
      buyerId: session.userId,
    },
    select: {
      id: true,
      status: true,
      splitOrders: {
        select: {
          id: true,
          status: true,
          earningsReleased: true,
          deliveredAt: true,
        },
      },
    },
  });

  if (!order) return { error: "Order not found" };

  const canMark =
    order.status === "SHIPPED" ||
    order.status === "DELIVERED" ||
    order.status === "CUSTOMER_RECEIVED";

  if (!canMark) {
    return { error: "This order cannot be marked as received yet" };
  }

  const now = new Date();

  await prisma.mainOrder.update({
    where: { id: orderId },
    data: {
      status: "CUSTOMER_RECEIVED",
      receivedAt: now,
    },
  });

  for (const split of order.splitOrders) {
    if (split.earningsReleased) continue;

    const deliveredAt = split.deliveredAt ?? now;

    await prisma.splitOrder.update({
      where: { id: split.id },
      data: {
        status: "DELIVERED",
        deliveredAt,
        autoCompleteAt: split.deliveredAt
          ? getOrderAutoCompleteAt(split.deliveredAt)
          : getOrderAutoCompleteAt(deliveredAt),
      },
    });
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard/vendor/finance");

  return { ok: true };
}

const RECEIVABLE_SPLIT_STATUSES = ["SHIPPED", "OUT_FOR_DELIVERY", "READY_FOR_CUSTOMER_PICKUP"] as const;

export async function markSplitReceived(
  splitOrderId: string,
): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = splitOrderId.trim();
  if (!id) return { error: "Order is required" };

  const split = await prisma.splitOrder.findFirst({
    where: {
      id,
      mainOrder: { buyerId: session.userId },
    },
    select: {
      id: true,
      status: true,
      earningsReleased: true,
      mainOrderId: true,
    },
  });

  if (!split) return { error: "Order not found" };

  if (split.earningsReleased || split.status === "COMPLETED") {
    return { ok: true };
  }

  const alreadyDelivered = split.status === "DELIVERED";
  if (
    !alreadyDelivered &&
    !RECEIVABLE_SPLIT_STATUSES.includes(
      split.status as (typeof RECEIVABLE_SPLIT_STATUSES)[number],
    )
  ) {
    return { error: "This item can't be confirmed received yet" };
  }

  if (!alreadyDelivered) {
    const now = new Date();

    await prisma.splitOrder.update({
      where: { id },
      data: {
        status: "DELIVERED",
        deliveredAt: now,
        autoCompleteAt: getOrderAutoCompleteAt(now),
      },
    });
  }

  const released = await releaseSplitOrderEarnings(id, session.userId);
  if (!released.ok) {
    return { error: released.error };
  }

  await recalculateMainOrderStatus(split.mainOrderId);
  revalidatePath(`/orders/${split.mainOrderId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard/vendor/finance");

  return { ok: true };
}
