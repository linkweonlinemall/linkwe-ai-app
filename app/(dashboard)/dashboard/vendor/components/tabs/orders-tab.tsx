"use client";

import OrdersWorkspace from "@/components/vendor/orders/OrdersWorkspace";
import { productOrderRow, type VendorSplitOrder, type OrderRow } from "@/lib/vendor/order-workspace";
export type { VendorSplitOrder, SplitOrderItem } from "@/lib/vendor/order-workspace";

export default function OrdersTab({ splitOrders, serviceOrders = [], view = "products", now }: { splitOrders: VendorSplitOrder[]; serviceOrders?: OrderRow[]; view?: "products" | "services"; now: number }) {
  return <OrdersWorkspace key={view} orders={[...splitOrders.map(productOrderRow), ...serviceOrders]} view={view} now={now}/>;
}
