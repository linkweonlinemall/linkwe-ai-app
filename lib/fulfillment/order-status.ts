import type { MainOrderStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const TERMINAL_STATUSES: MainOrderStatus[] = [
  "CANCELLED",
  "REFUNDED",
  "CUSTOMER_RECEIVED",
  "COMPLETED",
];

const AT_WAREHOUSE_OR_BEYOND: string[] = [
  "AT_WAREHOUSE",
  "PACKAGED",
  "BUNDLED_FOR_DISPATCH",
  "DISPATCHED",
  "DELIVERED",
];

const DISPATCHED_OR_BEYOND: string[] = ["DISPATCHED", "DELIVERED"];

const PACKAGED_OR_BEYOND: string[] = [
  "PACKAGED",
  "BUNDLED_FOR_DISPATCH",
  "DISPATCHED",
  "DELIVERED",
];

export async function recalculateMainOrderStatus(mainOrderId: string): Promise<void> {
  const mainOrder = await prisma.mainOrder.findUnique({
    where: { id: mainOrderId },
    select: { status: true },
  });

  if (!mainOrder) return;

  if (TERMINAL_STATUSES.includes(mainOrder.status)) return;

  const splitOrders = await prisma.splitOrder.findMany({
    where: { mainOrderId },
    select: { status: true },
  });

  if (splitOrders.length === 0) return;

  const statuses = splitOrders.map((s) => s.status as string);

  let newStatus: MainOrderStatus;

  const allDelivered = statuses.every((s) => s === "DELIVERED");
  const allDispatchedOrBeyond = statuses.every((s) => DISPATCHED_OR_BEYOND.includes(s));
  const allAtWarehouseOrBeyond = statuses.every((s) => AT_WAREHOUSE_OR_BEYOND.includes(s));
  const someAtWarehouseOrBeyond = statuses.some((s) => AT_WAREHOUSE_OR_BEYOND.includes(s));
  const allPackagedOrBeyond = statuses.every((s) => PACKAGED_OR_BEYOND.includes(s));
  const allAwaitingVendorAction = statuses.every((s) => s === "AWAITING_VENDOR_ACTION");

  if (allDelivered) {
    newStatus = "DELIVERED";
  } else if (allDispatchedOrBeyond) {
    newStatus = "SHIPPED";
  } else if (allPackagedOrBeyond) {
    newStatus = "PACKING_COMPLETE";
  } else if (allAtWarehouseOrBeyond) {
    newStatus = "READY_TO_SHIP";
  } else if (someAtWarehouseOrBeyond) {
    newStatus = "PARTIALLY_IN_HOUSE";
  } else if (allAwaitingVendorAction) {
    newStatus = "PAID";
  } else {
    newStatus = "PROCESSING";
  }

  if (newStatus !== mainOrder.status) {
    await prisma.mainOrder.update({
      where: { id: mainOrderId },
      data: { status: newStatus },
    });
  }
}
