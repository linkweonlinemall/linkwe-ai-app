"use server";

import type { MainOrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getCourierPickupFeeLabel,
  getCourierPickupFeeMinor,
} from "@/lib/fulfillment/courier-pickup-rates";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { calculateCommissionMinor, calculateVendorNetMinor } from "@/lib/platform/commission";

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
            store: { select: { region: true } },
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
        const existingEntry = await tx.vendorLedgerEntry.findFirst({
          where: {
            splitOrderRef: splitOrder.id,
            ledgerEntryType: "ORDER_REVENUE",
          },
        });

        if (existingEntry) continue;

        const commissionMinor = calculateCommissionMinor(splitOrder.subtotalMinor);
        const vendorNetMinor = calculateVendorNetMinor(splitOrder.subtotalMinor);

        await tx.vendorLedgerEntry.create({
          data: {
            storeId: splitOrder.storeId,
            currency: "TTD",
            entryType: "CREDIT_ORDER_SETTLEMENT",
            ledgerEntryType: "ORDER_REVENUE",
            amountMinor: vendorNetMinor,
            splitOrderId: splitOrder.id,
            splitOrderRef: splitOrder.id,
            mainOrderId: orderId,
            description: `Revenue from completed order — customer confirmed receipt`,
          },
        });

        await tx.vendorLedgerEntry.create({
          data: {
            storeId: splitOrder.storeId,
            currency: "TTD",
            entryType: "DEBIT_PLATFORM_FEE",
            ledgerEntryType: "PLATFORM_COMMISSION",
            amountMinor: commissionMinor,
            splitOrderId: splitOrder.id,
            splitOrderRef: splitOrder.id,
            mainOrderId: orderId,
            description: `Platform commission 12% on completed order`,
          },
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
      ...(filters?.status ? { status: filters.status } : { status: { not: "PENDING_PAYMENT" } }),
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
