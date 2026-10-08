import type { MainOrderStatus, Prisma } from "@prisma/client";
import { exportDateRange } from "@/lib/admin/csv-stream";

export const ORDER_QUEUES = ["all", "attention", "payment", "fulfillment", "transit", "payout", "closed"] as const;
export type OrderQueue = typeof ORDER_QUEUES[number];
export type OrderFilters = { search?: string; queue?: OrderQueue; from?: string; to?: string; sort?: "newest" | "oldest" | "value"; status?: MainOrderStatus; limit?: number; offset?: number };
export const PROCESSING_STATUSES: MainOrderStatus[] = ["PAID", "PROCESSING", "PARTIALLY_IN_HOUSE", "READY_TO_SHIP", "PACKING_COMPLETE"];
const closed: MainOrderStatus[] = ["COMPLETED", "CANCELLED", "REFUNDED"];
export function orderQueueWhere(queue: OrderQueue = "all", now = new Date()): Prisma.MainOrderWhereInput {
  switch (queue) {
    case "payment": return { status: "PENDING_PAYMENT" };
    case "fulfillment": return { status: { in: PROCESSING_STATUSES } };
    case "transit": return { status: "SHIPPED" };
    case "payout": return { status: { notIn: closed }, splitOrders: { some: { status: "DELIVERED", earningsReleased: false } } };
    case "closed": return { status: { in: closed } };
    case "attention": return { status: { notIn: ["DRAFT", ...closed] }, OR: [
      { status: { in: ["PENDING_PAYMENT", ...PROCESSING_STATUSES, "SHIPPED"] }, updatedAt: { lte: new Date(now.getTime() - 48 * 3600000) } },
      { splitOrders: { some: { status: "DELIVERED", earningsReleased: false } } },
    ] };
    default: return { status: { not: "DRAFT" } };
  }
}
export function adminOrderWhere(filters: OrderFilters = {}): Prisma.MainOrderWhereInput {
  if (filters.queue && !ORDER_QUEUES.includes(filters.queue)) throw new Error("Choose a valid order queue.");
  const search = filters.search?.trim().slice(0, 100);
  const dateParams = new URLSearchParams();
  if (filters.from) dateParams.set("from", filters.from);
  if (filters.to) dateParams.set("to", filters.to);
  return { AND: [orderQueueWhere(filters.queue), ...(filters.status ? [{ status: filters.status }] : []),
    ...(filters.from || filters.to ? [{ createdAt: exportDateRange(dateParams) }] : []),
    ...(search ? [{ OR: [
      { id: search }, { referenceNumber: { contains: search, mode: "insensitive" as const } },
      { buyer: { fullName: { contains: search, mode: "insensitive" as const } } },
      { buyer: { email: { contains: search, mode: "insensitive" as const } } },
      { items: { some: { titleSnapshot: { contains: search, mode: "insensitive" as const } } } },
      { splitOrders: { some: { store: { name: { contains: search, mode: "insensitive" as const } } } } },
    ] }] : []),
  ] };
}
export function orderNextStep(order: { status: string; splitOrders: { status: string; earningsReleased: boolean }[] }) {
  const splits = order.splitOrders;
  if (order.status === "PENDING_PAYMENT") return "Check payment status";
  if (order.status === "CANCELLED") return "Review any refund due";
  if (["COMPLETED", "REFUNDED"].includes(order.status)) return "No action needed";
  if (splits.some(s => s.status === "DELIVERED" && !s.earningsReleased)) return "Review vendor earnings";
  if (splits.length && splits.every(s => s.status === "PACKAGED")) return "Arrange delivery or pickup";
  if (splits.length && splits.every(s => s.status === "AT_WAREHOUSE")) return "Combine and pack parcels";
  if (order.status === "SHIPPED") return "Track delivery progress";
  if (["DELIVERED", "CUSTOMER_RECEIVED"].includes(order.status)) return "Review completion";
  return "Follow up with vendors";
}
export function orderStatusLabel(status: string) {
  const labels: Record<string, string> = { PAID: "Order placed", PENDING_PAYMENT: "Awaiting payment", PARTIALLY_IN_HOUSE: "Partly received", READY_TO_SHIP: "Ready to pack", PACKING_COMPLETE: "Packed", CUSTOMER_RECEIVED: "Customer received", AWAITING_VENDOR_ACTION: "Awaiting vendor", VENDOR_PREPARING: "Preparing", READY_FOR_LINKWE: "Ready for LinkWe" };
  return labels[status] ?? status.toLowerCase().replaceAll("_", " ").replace(/^./, s => s.toUpperCase());
}
