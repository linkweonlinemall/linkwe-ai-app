import type { MainOrderStatus } from "@prisma/client";

export type OrderStatusInfo = {
  label: string;
  description: string;
  step: number;
  color: string;
};

/**
 * `step` is the index into `ORDER_PROGRESS_STEPS` (0–6) for the progress bar,
 * or -1 for terminal negative states.
 */
export const ORDER_STATUS_MAP: Record<MainOrderStatus, OrderStatusInfo> = {
  DRAFT: {
    label: "Draft",
    description: "Order not yet placed",
    step: 0,
    color: "zinc",
  },
  PENDING_PAYMENT: {
    label: "Pending Payment",
    description: "Awaiting payment confirmation",
    step: 0,
    color: "amber",
  },
  PAID: {
    label: "Order Placed",
    description: "Payment confirmed. Vendor has been notified.",
    step: 0,
    color: "blue",
  },
  AWAITING_VENDOR_FULFILLMENT: {
    label: "Vendor Preparing",
    description: "The vendor is packing your order.",
    step: 1,
    color: "amber",
  },
  READY_TO_BUNDLE: {
    label: "Processing",
    description: "Your order is being prepared for dispatch.",
    step: 2,
    color: "blue",
  },
  AWAITING_SHIPPING: {
    label: "Out for Delivery",
    description: "Your order is on its way to you.",
    step: 5,
    color: "blue",
  },
  PARTIALLY_IN_HOUSE: {
    label: "Arrived at Warehouse",
    description: "Your order has arrived at the LinkWe warehouse.",
    step: 4,
    color: "blue",
  },
  SHIPPED: {
    label: "Out for Delivery",
    description: "Your order is on its way to you.",
    step: 5,
    color: "scarlet",
  },
  CUSTOMER_RECEIVED: {
    label: "Delivered",
    description: "Your order has been delivered.",
    step: 6,
    color: "emerald",
  },
  COMPLETED: {
    label: "Completed",
    description: "Order complete. Thank you for shopping with LinkWe.",
    step: 6,
    color: "emerald",
  },
  CANCELLED: {
    label: "Cancelled",
    description: "This order has been cancelled.",
    step: -1,
    color: "red",
  },
  REFUNDED: {
    label: "Refunded",
    description: "A refund has been processed for this order.",
    step: -1,
    color: "red",
  },
};

export const ORDER_PROGRESS_STEPS = [
  "Order Placed",
  "Vendor Preparing",
  "Ready for Collection",
  "Collected",
  "At Warehouse",
  "Out for Delivery",
  "Delivered",
];

export function getStatusInfo(status: MainOrderStatus): OrderStatusInfo {
  return ORDER_STATUS_MAP[status];
}

export function getProgressStep(status: MainOrderStatus): number {
  return ORDER_STATUS_MAP[status]?.step ?? 0;
}
