/** Shared display and filtering rules; never changes an order's persisted state. */
export type OrderKind = "product" | "booking" | "request" | "quote" | "subscription";
export type OrderBucket = "action" | "progress" | "completed" | "cancelled";
export type OrderRow = {
  id: string; kind: OrderKind; reference: string; secondaryReference?: string;
  title: string; searchText?: string; customer: string; status: string; amountMinor: number | null;
  currency: string; createdAt: string; detail: string; region?: string;
  image?: string | null; quantity?: number; href: string; inboundMethod?: string | null;
};
export type SplitOrderItem = {
  id: string; titleSnapshot: string; quantity: number; unitPriceMinor: number;
  lineTotalMinor: number; listing: { imageUrl: string | null } | null;
};
export type VendorSplitOrder = {
  id: string; mainOrderId: string; referenceNumber?: string | null; storeId?: string;
  status: string; subtotalMinor: number; shippingMinor: number; currency: string;
  createdAt: Date | string; pickupRegion: string | null; vendorInboundMethod: string | null;
  items: SplitOrderItem[];
  mainOrder: {
    region: string; referenceNumber?: string | null; status?: string; shippingAddressId?: string | null;
    buyer: { fullName: string };
    items?: { storeId: string; product: { isDigital: boolean } | null }[];
  };
};
export const kindLabels: Record<OrderKind, string> = { product: "Product", booking: "Booking", request: "On-demand", quote: "Quote", subscription: "Subscription" };
export const bucketLabels: Record<OrderBucket, string> = { action: "Needs attention", progress: "In progress", completed: "Completed", cancelled: "Closed" };
const statusLabels: Record<string, string> = {
  AWAITING_VENDOR_ACTION: "New order", PREPARING: "Preparing", VENDOR_PREPARING: "Preparing drop-off",
  READY_FOR_CUSTOMER_PICKUP: "Ready for customer pickup", READY_FOR_LINKWE: "Ready for LinkWe",
  AWAITING_COURIER_PICKUP: "Collection requested", COURIER_ASSIGNED: "Courier assigned", COURIER_PICKED_UP: "Collected",
  VENDOR_DROPPED_OFF: "Dropped off", AT_WAREHOUSE: "At the warehouse", PACKAGED: "Packed",
  BUNDLED_FOR_DISPATCH: "Ready for dispatch", SHIPPED: "Out for delivery", OUT_FOR_DELIVERY: "Out for delivery",
  DISPATCHED: "Dispatched", DELIVERED: "Delivered", COMPLETED: "Completed", CANCELLED: "Cancelled", CANCELED: "Cancelled",
  AWAITING_CUSTOMER_CONFIRMATION: "Awaiting customer confirmation",
  PENDING_PAYMENT: "Awaiting payment", PAST_DUE: "Payment overdue", ENDING_SOON: "Ending at period end",
  DEPOSIT_PAID: "Deposit paid", NO_SHOW: "No-show", TRIALING: "Trial active", PAUSED: "Paused",
};
export function orderStatusLabel(status: string) { return statusLabels[status] ?? status.toLowerCase().replaceAll("_", " ").replace(/^./, c => c.toUpperCase()); }
export function orderBucket(row: Pick<OrderRow, "kind" | "status" | "inboundMethod">): OrderBucket {
  if (["CANCELLED", "CANCELED", "DECLINED", "NO_SHOW", "EXPIRED", "REFUNDED"].includes(row.status)) return "cancelled";
  if (["COMPLETED", "DELIVERED"].includes(row.status)) return "completed";
  if (row.kind === "product") return (["AWAITING_VENDOR_ACTION", "PREPARING"].includes(row.status) && !row.inboundMethod) ? "action" : "progress";
  return ["PENDING", "PAST_DUE"].includes(row.status) ? "action" : "progress";
}
export function orderNextStep(row: Pick<OrderRow, "kind" | "status" | "inboundMethod" | "detail">) {
  const bucket = orderBucket(row);
  if (bucket === "cancelled") return "Closed · view the order record";
  if (bucket === "completed") return row.status === "DELIVERED" ? "Delivered · customer confirmation may still be pending" : "Complete · view the order record";
  if (row.status === "AWAITING_CUSTOMER_CONFIRMATION") return "Service provided · waiting for customer confirmation";
  if (row.status === "PENDING_PAYMENT") return "Waiting for payment confirmation";
  if (row.kind === "product") {
    if (bucket === "action") return row.detail === "Digital delivery" ? "Provide the content, then confirm fulfilment" : "Pack your order and choose a handover option";
    if (row.status === "READY_FOR_CUSTOMER_PICKUP") return "Waiting for customer collection at LinkWe";
    if (["VENDOR_PREPARING", "PREPARING"].includes(row.status)) return "Bring the labelled parcel to LinkWe";
    if (["AWAITING_COURIER_PICKUP", "COURIER_ASSIGNED"].includes(row.status)) return "Keep your parcel packed for collection";
    return "LinkWe is handling the next step";
  }
  if (row.kind === "booking") return row.status === "PENDING" ? "Review the appointment and respond" : "Check the appointment details and customer notes";
  if (row.kind === "request" || row.kind === "quote") return row.status === "PENDING" ? "Review the request and send your response" : row.status === "ACCEPTED" ? "Waiting for the customer to pay" : "Review progress and manage the service";
  return row.status === "PAST_DUE" ? "Review this subscriber’s payment status" : row.status === "ENDING_SOON" ? "Access continues until the current period ends" : "Manage sessions and subscription details";
}
export function orderMoney(minor: number | null, currency = "TTD") {
  return minor == null ? "Not quoted yet" : `${currency} ${(minor / 100).toLocaleString("en-TT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function orderDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-TT", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Port_of_Spain" });
}
export function productOrderRow(order: VendorSplitOrder): OrderRow {
  const ownItems = order.mainOrder.items?.filter(item => item.storeId === order.storeId) ?? [];
  const digital = ownItems.length > 0 && ownItems.every(item => item.product?.isDigital);
  return {
    id: order.id, kind: "product", reference: order.mainOrder.referenceNumber ?? `LW-${order.mainOrderId.slice(-8).toUpperCase()}`,
    secondaryReference: order.referenceNumber ?? `SP-${order.id.slice(-8).toUpperCase()}`,
    title: `${order.items[0]?.titleSnapshot ?? "Product order"}${order.items.length > 1 ? ` +${order.items.length-1} more` : ""}`, searchText: order.items.map(item=>item.titleSnapshot).join(" "), customer: order.mainOrder.buyer.fullName,
    status: effectiveOrderStatus(order.status, order.mainOrder.status),
    amountMinor: order.subtotalMinor, currency: order.currency, createdAt: new Date(order.createdAt).toISOString(),
    detail: digital ? "Digital delivery" : order.mainOrder.shippingAddressId === null ? "Warehouse pickup" : "LinkWe delivery",
    region: order.mainOrder.region.replaceAll("_", " "), image: order.items[0]?.listing?.imageUrl,
    quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
    href: `/dashboard/vendor/orders/${order.id}`, inboundMethod: order.vendorInboundMethod,
  };
}
export type OrderFilters = { search: string; bucket: string; kind: string; days: number; sort: string };
export function filterOrders(rows: OrderRow[], filters: OrderFilters, now: number): OrderRow[] {
  const words = filters.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const rank = { action: 0, progress: 1, completed: 2, cancelled: 3 };
  return rows.filter(row =>
    (filters.bucket === "all" || orderBucket(row) === filters.bucket) &&
    (filters.kind === "all" || row.kind === filters.kind) &&
    (!filters.days || new Date(row.createdAt).getTime() >= now - filters.days * 86400000) &&
    words.every(word => `${row.reference} ${row.secondaryReference ?? ""} ${row.title} ${row.searchText ?? ""} ${row.customer} ${row.region ?? ""} ${row.detail} ${orderStatusLabel(row.status)}`.toLowerCase().includes(word)),
  ).sort((a,b) => {
    const recent = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (filters.sort === "oldest") return -recent;
    if (filters.sort === "value") return (b.amountMinor ?? -1) - (a.amountMinor ?? -1) || recent;
    if (filters.sort === "attention") return rank[orderBucket(a)] - rank[orderBucket(b)] || recent;
    return recent;
  });
}
export function ordersCSV(rows: OrderRow[]) {
  const cell = (input: unknown) => {
    const value = String(input ?? "");
    // Prevent spreadsheet formulas in customer-entered names and listing titles.
    const safe = /^[\s]*[=+@\-]/.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const table = [["Order", "Type", "Customer", "Item / service", "Status", "Placed", "Currency", "Value", "Next step"], ...rows.map(row => [row.reference, kindLabels[row.kind], row.customer, row.title, orderStatusLabel(row.status), row.createdAt, row.currency, row.amountMinor == null ? "" : (row.amountMinor / 100).toFixed(2), orderNextStep(row)])];
  return '\uFEFF' + table.map(row => row.map(cell).join(',')).join('\r\n');
}

export function effectiveOrderStatus(status: string, mainStatus?: string) {
  return mainStatus === "DRAFT" ? "PENDING_PAYMENT" : ["PENDING_PAYMENT", "CANCELLED", "REFUNDED"].includes(mainStatus ?? "") ? mainStatus! : status;
}
export function orderProgress(status: string, digital: boolean, pickup: boolean) {
  if (["CANCELLED", "REFUNDED", "PENDING_PAYMENT"].includes(status)) return null;
  if (digital) return { steps: ["Order received", "Content delivered", "Complete"], current: status === "COMPLETED" ? 2 : status === "DELIVERED" ? 1 : 0 };
  const steps = ["Order received", "Vendor handover", "At LinkWe", pickup ? "Ready for pickup" : "Out for delivery", pickup ? "Collected" : "Delivered"];
  const current = ["DELIVERED", "COMPLETED"].includes(status) ? 4 : ["READY_FOR_CUSTOMER_PICKUP", "SHIPPED", "OUT_FOR_DELIVERY", "DISPATCHED"].includes(status) ? 3 : ["AT_WAREHOUSE", "PACKAGED", "BUNDLED_FOR_DISPATCH"].includes(status) ? 2 : ["PREPARING", "VENDOR_PREPARING", "READY_FOR_LINKWE", "AWAITING_COURIER_PICKUP", "COURIER_ASSIGNED", "COURIER_PICKED_UP", "VENDOR_DROPPED_OFF"].includes(status) ? 1 : 0;
  return { steps, current };
}
export function safeOrderLink(value: string) {
  try { const url = new URL(value, "https://www.linkweonlinemall.com"); return ["https:", "http:"].includes(url.protocol) && (value.startsWith("http://") || value.startsWith("https://") || (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\"))) ? value : null; } catch { return null; }
}
