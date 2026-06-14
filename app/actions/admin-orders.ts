"use server";

import type { MainOrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getCourierPickupFeeLabel,
  getCourierPickupFeeMinor,
} from "@/lib/fulfillment/courier-pickup-rates";
import { getSession } from "@/lib/auth/session";
import { releaseSplitOrderEarnings } from "@/lib/finance/complete-order";
import { createProductOrderEarningsLedger } from "@/lib/finance/release-earnings";
import { resolveVendorPlan } from "@/lib/finance/vendor-plan";
import { recalculateMainOrderStatus } from "@/lib/fulfillment/order-status";
import { prisma } from "@/lib/prisma";

export async function completeOrders(orderIds: string[]): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  for (const orderId of orderIds) {
    const order = await prisma.mainOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        splitOrders: {
          select: {
            id: true,
            storeId: true,
            subtotalMinor: true,
            vendorInboundMethod: true,
            inboundShipmentId: true,
            store: { select: { region: true, subscriptionPlan: true } },
            earningsReleased: true,
          },
        },
      },
    });

    if (!order) continue;
    if (order.status !== "CUSTOMER_RECEIVED") continue;

    await prisma.$transaction(async (tx) => {
      await tx.mainOrder.update({
        where: { id: orderId },
        data: { status: "COMPLETED" },
      });

      const debitedPickupShipments = new Set<string>();

      for (const splitOrder of order.splitOrders) {
        if (splitOrder.earningsReleased) continue;

        const plan = resolveVendorPlan(splitOrder.store.subscriptionPlan);

        await createProductOrderEarningsLedger(tx, {
          storeId: splitOrder.storeId,
          splitOrderId: splitOrder.id,
          mainOrderId: orderId,
          subtotalMinor: splitOrder.subtotalMinor,
          plan,
          ledgerEntryType: "ORDER_REVENUE",
          idempotencyKey: `split:${splitOrder.id}:ORDER_REVENUE`,
          description: "Revenue from completed order — customer confirmed receipt",
        });

        await tx.splitOrder.update({
          where: { id: splitOrder.id },
          data: { earningsReleased: true, status: "COMPLETED", completedAt: new Date() },
        });

        if (splitOrder.vendorInboundMethod === "PICKUP_REQUESTED") {
          let feeMinor = 0;
          let description = "";
          let shouldRecordPickup = true;

          if (splitOrder.inboundShipmentId) {
            if (debitedPickupShipments.has(splitOrder.inboundShipmentId)) {
              shouldRecordPickup = false;
            } else {
              debitedPickupShipments.add(splitOrder.inboundShipmentId);
              const ship = await tx.shipment.findUnique({
                where: { id: splitOrder.inboundShipmentId },
                select: { pickupFeeMinor: true, totalWeightLbs: true, region: true },
              });
              const region = splitOrder.store.region ?? ship?.region ?? "";
              const w = ship?.totalWeightLbs ?? 1;
              feeMinor = ship?.pickupFeeMinor ?? getCourierPickupFeeMinor(region, w);
              description = getCourierPickupFeeLabel(region, w);
            }
          } else {
            feeMinor = getCourierPickupFeeMinor(splitOrder.store.region ?? "", 1);
            description = "Courier pickup fee deducted";
          }

          if (shouldRecordPickup && feeMinor > 0) {
            await tx.vendorLedgerEntry.create({
              data: {
                storeId: splitOrder.storeId,
                currency: "TTD",
                entryType: "DEBIT_PLATFORM_FEE",
                ledgerEntryType: "COURIER_PICKUP_FEE",
                amountMinor: feeMinor,
                splitOrderId: splitOrder.id,
                splitOrderRef: splitOrder.id,
                mainOrderId: orderId,
                description,
              },
            });
          }
        }
      }
    });
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/orders");
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

const CANCELLABLE_MAIN_STATUSES: MainOrderStatus[] = ["PAID", "PROCESSING"];

const TERMINAL_SPLIT_STATUSES = ["DELIVERED", "COMPLETED", "CANCELLED"] as const;

export async function cancelOrders(
  orderIds: string[],
): Promise<{ cancelled: number; skipped: number }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const ids = orderIds.map((id) => id.trim()).filter(Boolean);
  let cancelled = 0;
  let skipped = 0;

  for (const id of ids) {
    const order = await prisma.mainOrder.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        splitOrders: {
          select: { id: true, status: true, earningsReleased: true },
        },
      },
    });

    if (!order) {
      skipped += 1;
      continue;
    }

    const isCancellable = CANCELLABLE_MAIN_STATUSES.includes(order.status);
    const hasReleasedEarnings = order.splitOrders.some((s) => s.earningsReleased);

    if (!isCancellable || hasReleasedEarnings) {
      skipped += 1;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.mainOrder.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });

      for (const split of order.splitOrders) {
        if (
          !TERMINAL_SPLIT_STATUSES.includes(
            split.status as (typeof TERMINAL_SPLIT_STATUSES)[number],
          )
        ) {
          await tx.splitOrder.update({
            where: { id: split.id },
            data: { status: "CANCELLED" },
          });
        }
      }
    });

    cancelled += 1;
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/orders");

  return { cancelled, skipped };
}

export async function updateOrderStatus(orderIds: string[], status: string): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  await prisma.mainOrder.updateMany({
    where: { id: { in: orderIds } },
    data: { status: status as MainOrderStatus },
  });

  revalidatePath("/dashboard/admin");
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
      ].join(","),
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
        : { status: { notIn: ["DRAFT", "PENDING_PAYMENT"] as MainOrderStatus[] } }),
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
