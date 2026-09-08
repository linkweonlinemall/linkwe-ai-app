import { NotificationType, type MainOrderStatus } from "@prisma/client";

import { getOrderAutoCompleteAt } from "@/lib/finance/complete-order";
import { createNotification } from "@/lib/notifications/create";
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
  "COMPLETED",
  "OUT_FOR_DELIVERY",
  "READY_FOR_CUSTOMER_PICKUP",
];

const DISPATCHED_OR_BEYOND: string[] = [
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DISPATCHED",
  "DELIVERED",
  "COMPLETED",
];

const PACKAGED_OR_BEYOND: string[] = [
  "PACKAGED",
  "BUNDLED_FOR_DISPATCH",
  "DISPATCHED",
  "DELIVERED",
  "COMPLETED",
  "OUT_FOR_DELIVERY",
  "READY_FOR_CUSTOMER_PICKUP",
];

export async function recalculateMainOrderStatus(mainOrderId: string): Promise<void> {
  const mainOrder = await prisma.mainOrder.findUnique({
    where: { id: mainOrderId },
    select: {
      status: true,
      buyerId: true,
      referenceNumber: true,
      shippingAddressId: true,
    },
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

  const allDelivered = statuses.every((s) => s === "DELIVERED" || s === "COMPLETED");
  const allDispatchedOrBeyond = statuses.every((s) => DISPATCHED_OR_BEYOND.includes(s));
  const allAtWarehouseOrBeyond = statuses.every((s) => AT_WAREHOUSE_OR_BEYOND.includes(s));
  const someAtWarehouseOrBeyond = statuses.some((s) => AT_WAREHOUSE_OR_BEYOND.includes(s));
  const allPackagedOrBeyond = statuses.every((s) => PACKAGED_OR_BEYOND.includes(s));
  const allAwaitingVendorAction = statuses.every((s) => s === "AWAITING_VENDOR_ACTION");

  if (statuses.every(s => s === "COMPLETED")) {
    newStatus = "COMPLETED";
  } else if (allDelivered) {
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

    const trackingCopy: Partial<
      Record<MainOrderStatus, { title: string; body: string }>
    > = {
      PROCESSING: {
        title: "Your order is being prepared",
        body: "Your vendors are preparing their portions of the order.",
      },
      PARTIALLY_IN_HOUSE: {
        title: "Part of your order has reached LinkWe",
        body: "We are still waiting for the remaining vendor parcels.",
      },
      READY_TO_SHIP: {
        title: "All parcels have reached LinkWe",
        body: "Your vendor parcels are ready to be combined.",
      },
      PACKING_COMPLETE: mainOrder.shippingAddressId
        ? {
            title: "Your combined order is packed",
            body: "Your order is ready for dispatch.",
          }
        : {
            title: "Your order is ready for pickup",
            body: "All vendor parcels are combined and ready at LinkWe.",
          },
      SHIPPED: {
        title: "Your combined order is on its way",
        body: "Open your order to view the latest delivery status.",
      },
      DELIVERED: {
        title: "Your order has been delivered",
        body: "Please confirm receipt from your order page.",
      },
    };
    const message = trackingCopy[newStatus];
    if (message) {
      await createNotification({
        userId: mainOrder.buyerId,
        type: NotificationType.ORDER_STATUS_UPDATED,
        title: message.title,
        body: mainOrder.referenceNumber
          ? `${message.body} Order #${mainOrder.referenceNumber}.`
          : message.body,
        linkUrl: `/orders/${mainOrderId}`,
      });
    }
  }

  if (newStatus === "DELIVERED") {
    const now = new Date();
    await prisma.splitOrder.updateMany({
      where: {
        mainOrderId,
        status: "DELIVERED",
        autoCompleteAt: null,
      },
      data: {
        deliveredAt: now,
        autoCompleteAt: getOrderAutoCompleteAt(now),
      },
    });
  }
}
