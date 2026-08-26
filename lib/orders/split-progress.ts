import type { StoreShippingMode } from "@prisma/client";

export type SplitProgressAudience = "customer" | "vendor";
export type SplitFulfillment = "delivery" | "pickup";

const CUSTOMER_PICKUP_STEPS = ["Placed", "Preparing", "Ready for pickup", "Picked up"] as const;

const CUSTOMER_SELF_STEPS = ["Placed", "Preparing", "Out for delivery", "Received"] as const;
const CUSTOMER_LINKWE_STEPS = [
  "Placed",
  "Preparing",
  "Ready",
  "Out for delivery",
  "Received",
] as const;

const VENDOR_SELF_STEPS = ["Action", "Preparing", "Shipped", "Delivered"] as const;
const VENDOR_LINKWE_STEPS = [
  "Action",
  "Preparing",
  "Ready for LinkWe",
  "Out for delivery",
  "Delivered",
] as const;

export function getSplitProgressSteps(
  shippingMode: StoreShippingMode,
  audience: SplitProgressAudience = "customer",
  fulfillment: SplitFulfillment = "delivery",
): readonly string[] {
  if (audience === "customer" && fulfillment === "pickup") return CUSTOMER_PICKUP_STEPS;
  if (audience === "vendor") {
    return shippingMode === "SELF" ? VENDOR_SELF_STEPS : VENDOR_LINKWE_STEPS;
  }
  return shippingMode === "SELF" ? CUSTOMER_SELF_STEPS : CUSTOMER_LINKWE_STEPS;
}

export function getSplitStepIndex(
  status: string,
  shippingMode: StoreShippingMode,
  fulfillment: SplitFulfillment = "delivery",
): number {
  if (fulfillment === "pickup") {
    switch (status) {
      case "AWAITING_VENDOR_ACTION": return 0;
      case "PREPARING":
      case "VENDOR_PREPARING": return 1;
      case "DELIVERED":
      case "COMPLETED": return 3;
      default: return 2;
    }
  }
  if (shippingMode === "SELF") {
    switch (status) {
      case "AWAITING_VENDOR_ACTION":
        return 0;
      case "PREPARING":
      case "VENDOR_PREPARING":
      case "AWAITING_COURIER_PICKUP":
      case "COURIER_ASSIGNED":
      case "COURIER_PICKED_UP":
      case "VENDOR_DROPPED_OFF":
        return 1;
      case "SHIPPED":
      case "OUT_FOR_DELIVERY":
      case "AT_WAREHOUSE":
      case "PACKAGED":
      case "BUNDLED_FOR_DISPATCH":
      case "DISPATCHED":
        return 2;
      case "DELIVERED":
      case "COMPLETED":
        return 3;
      default:
        return 0;
    }
  }

  switch (status) {
    case "AWAITING_VENDOR_ACTION":
      return 0;
    case "PREPARING":
    case "VENDOR_PREPARING":
    case "AWAITING_COURIER_PICKUP":
    case "COURIER_ASSIGNED":
    case "COURIER_PICKED_UP":
    case "VENDOR_DROPPED_OFF":
      return 1;
    case "READY_FOR_LINKWE":
    case "AT_WAREHOUSE":
    case "PACKAGED":
    case "BUNDLED_FOR_DISPATCH":
      return 2;
    case "OUT_FOR_DELIVERY":
    case "DISPATCHED":
    case "SHIPPED":
      return 3;
    case "DELIVERED":
    case "COMPLETED":
      return 4;
    default:
      return 0;
  }
}
