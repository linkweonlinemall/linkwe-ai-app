import type { MainOrderStatus } from "@prisma/client";

export type OrderStatusInfo = {
  label: string;
  description: string;
  step: number;
  color: string;
};

/**
 * `step` is the index into `ORDER_PROGRESS_STEPS` (0–3) for the progress bar,
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
    description: "Payment confirmed. The vendor has been notified.",
    step: 0,
    color: "blue",
  },
  PROCESSING: {
    label: "Preparing",
    description: "The vendor is preparing your order.",
    step: 1,
    color: "amber",
  },
  PARTIALLY_IN_HOUSE: {
    label: "Preparing",
    description: "Some stores are still preparing your order.",
    step: 1,
    color: "amber",
  },
  READY_TO_SHIP: {
    label: "Preparing",
    description: "Your order is being prepared.",
    step: 1,
    color: "blue",
  },
  PACKING_COMPLETE: {
    label: "Preparing",
    description: "Your order is being prepared.",
    step: 1,
    color: "emerald",
  },
  SHIPPED: {
    label: "Out for Delivery",
    description: "Your order is on its way.",
    step: 2,
    color: "scarlet",
  },
  CUSTOMER_RECEIVED: {
    label: "Received",
    description: "You confirmed receipt of this order. Thank you for shopping with LinkWe.",
    step: 3,
    color: "emerald",
  },
  DELIVERED: {
    label: "Received",
    description: "Your order has been delivered.",
    step: 3,
    color: "emerald",
  },
  COMPLETED: {
    label: "Received",
    description: "Order complete. Thank you for shopping with LinkWe.",
    step: 3,
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
  "Preparing",
  "Out for Delivery",
  "Received",
];

export function getStatusInfo(status: MainOrderStatus): OrderStatusInfo {
  return ORDER_STATUS_MAP[status];
}

export function getProgressStep(status: MainOrderStatus): number {
  return ORDER_STATUS_MAP[status]?.step ?? 0;
}

export function getSplitOrderStatusLabel(status: string): { label: string; className: string } {
  switch (status) {
    case "AWAITING_VENDOR_ACTION":
      return { label: "Order placed", className: "bg-blue-50 text-blue-700 border border-blue-200" };
    case "PREPARING":
    case "VENDOR_PREPARING":
      return { label: "Preparing", className: "bg-amber-50 text-amber-700 border border-amber-200" };
    case "SHIPPED":
    case "OUT_FOR_DELIVERY":
      return { label: "Out for delivery", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    case "READY_FOR_LINKWE":
      return { label: "Ready for delivery", className: "bg-blue-50 text-blue-700 border border-blue-200" };
    case "AWAITING_COURIER_PICKUP":
      return { label: "Awaiting courier", className: "bg-blue-50 text-blue-700 border border-blue-200" };
    case "COURIER_ASSIGNED":
      return { label: "Courier assigned", className: "bg-blue-50 text-blue-700 border border-blue-200" };
    case "COURIER_PICKED_UP":
      return { label: "En route", className: "bg-blue-50 text-blue-700 border border-blue-200" };
    case "VENDOR_DROPPED_OFF":
      return { label: "Dropped off", className: "bg-blue-50 text-blue-700 border border-blue-200" };
    case "AT_WAREHOUSE":
      return { label: "At warehouse", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    case "PACKAGED":
      return { label: "Packaged", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    case "BUNDLED_FOR_DISPATCH":
      return { label: "Ready to ship", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    case "DISPATCHED":
      return { label: "Out for delivery", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    case "DELIVERED":
      return { label: "Delivered", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    case "COMPLETED":
      return { label: "Completed", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    case "CANCELLED":
      return { label: "Cancelled", className: "bg-red-50 text-red-700 border border-red-200" };
    default:
      return {
        label: status.replace(/_/g, " ").toLowerCase(),
        className: "bg-zinc-100 text-zinc-600 border border-zinc-200",
      };
  }
}
