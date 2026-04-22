"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { markOrderReceived } from "@/app/actions/order-received";
import Button from "@/components/ui/Button";
import type { MainOrderStatus } from "@prisma/client";

type OrderItem = {
  id: string;
  titleSnapshot: string;
  product: { name: string; images: string[] } | null;
};

/** Matches server payload; `_count` required for “+N more items” on cards. */
export type Order = {
  id: string;
  referenceNumber: string | null;
  /** ISO strings after RSC serialization are handled in `formatDate`. */
  createdAt: Date | string;
  status: MainOrderStatus;
  region: string | null;
  subtotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
  items: OrderItem[];
  _count: { items: number };
};

type SortBy = "newest" | "oldest" | "highest" | "lowest";

export type Props = {
  orders: Order[];
};

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-TT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getOrderStatusBadge(status: string) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    PAID: { label: "Order Placed", bg: "#DBEAFE", color: "#1D4ED8" },
    PROCESSING: { label: "Processing", bg: "#FEF3C7", color: "#92400E" },
    SHIPPED: { label: "Out for Delivery", bg: "#EFF8FC", color: "#1A7FB5" },
    DELIVERED: { label: "Delivered", bg: "#DCFCE7", color: "#15803D" },
    COMPLETED: { label: "Completed", bg: "#DCFCE7", color: "#15803D" },
    CUSTOMER_RECEIVED: { label: "Received", bg: "#BBF7D0", color: "#065F46" },
    CANCELLED: { label: "Cancelled", bg: "#FEE2E2", color: "#991B1B" },
  };
  const s = map[status] ?? { label: status.replace(/_/g, " "), bg: "#F4F4F5", color: "#52525B" };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

export default function OrdersClient({ orders }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let list = orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      if (!q) return true;

      const idTail = order.id.slice(-8).toLowerCase();
      const refHaystack = (order.referenceNumber ?? "").toLowerCase();
      const regionHaystack = (order.region ?? "").toLowerCase().replace(/_/g, " ");
      const productHaystack = order.items
        .map((item) => `${item.product?.name ?? ""} ${item.titleSnapshot}`)
        .join(" ")
        .toLowerCase();

      const searchableBlob = [idTail, refHaystack, regionHaystack, productHaystack].join(" ");

      return searchableBlob.includes(q);
    });

    list = [...list].sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      switch (sortBy) {
        case "newest":
          return tb - ta;
        case "oldest":
          return ta - tb;
        case "highest":
          return b.totalMinor - a.totalMinor;
        case "lowest":
          return a.totalMinor - b.totalMinor;
        default:
          return tb - ta;
      }
    });

    return list;
  }, [orders, searchQuery, statusFilter, sortBy]);

  const showClearInBar = searchQuery !== "" || statusFilter !== "all";

  return (
    <>
      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by order number, product name or region..."
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none ring-zinc-300 placeholder:text-zinc-400 focus:ring-2"
        />

        <div className="mt-3 flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none ring-zinc-300 focus:ring-2"
          >
            <option value="all">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_PAYMENT">Pending Payment</option>
            <option value="PAID">Order Placed</option>
            <option value="PROCESSING">Processing</option>
            <option value="PARTIALLY_IN_HOUSE">At Warehouse</option>
            <option value="READY_TO_SHIP">Ready to Ship</option>
            <option value="SHIPPED">Out for Delivery</option>
            <option value="DELIVERED">Delivered</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none ring-zinc-300 focus:ring-2"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest value</option>
            <option value="lowest">Lowest value</option>
          </select>

          {showClearInBar ? (
            <Button
              className="!px-2 text-xs text-zinc-400 hover:bg-transparent hover:text-zinc-700"
              type="button"
              variant="ghost"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setSortBy("newest");
              }}
            >
              Clear filters
            </Button>
          ) : null}

          <span className="ml-auto self-center text-xs text-zinc-400">
            {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {filteredOrders.length === 0 && orders.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm font-medium text-zinc-500">No orders match your search.</p>
          <Button
            className="mt-3 !px-0 text-sm font-medium text-[#D4450A] hover:bg-transparent hover:text-[#B83A09] hover:underline"
            type="button"
            variant="ghost"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredOrders.map((order) => {
            const itemCount = order._count.items;
            const extraItems = itemCount > 3 ? itemCount - 3 : 0;
            const summaryParts = order.items.map((item) => item.product?.name ?? item.titleSnapshot);
            const itemSummary =
              order.items.length === 0
                ? `${itemCount} item${itemCount !== 1 ? "s" : ""}`
                : extraItems > 0
                  ? `${summaryParts.join(", ")}${summaryParts.length ? " · " : ""}+${extraItems} more`
                  : summaryParts.join(" · ");

            return (
              <div
                key={order.id}
                className="rounded-xl bg-white p-5 transition-shadow hover:shadow-md"
                style={{ border: "1px solid var(--card-border)" }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      Order #
                      {(order.referenceNumber ?? `LW-${order.id.slice(-8)}`).toUpperCase()}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  {getOrderStatusBadge(order.status)}
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="flex shrink-0 gap-2">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100"
                      >
                        {item.product?.images?.[0] ? (
                          <img
                            src={item.product.images[0]}
                            alt={item.product?.name ?? ""}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-zinc-200" />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="min-w-0 flex-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {itemSummary}
                  </p>
                </div>

                <div
                  className="mt-4 flex items-center justify-between border-t pt-3"
                  style={{ borderColor: "var(--card-border-subtle)" }}
                >
                  <p className="text-base font-bold" style={{ color: "var(--scarlet)" }}>
                    TTD {(order.totalMinor / 100).toFixed(2)}
                  </p>
                  <div className="flex items-center gap-3">
                    {order.status === "SHIPPED" ? (
                      <form action={markOrderReceived}>
                        <input type="hidden" name="orderId" value={order.id} />
                        <button
                          type="submit"
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
                          style={{ backgroundColor: "#059669" }}
                        >
                          ✓ Mark as Received
                        </button>
                      </form>
                    ) : null}
                    {order.status === "CUSTOMER_RECEIVED" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        ✓ Received
                      </span>
                    ) : null}
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-sm text-zinc-600 transition-colors hover:text-zinc-900"
                    >
                      View Order
                    </Link>
                    <a
                      href={`/api/invoice/${order.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90"
                      style={{ backgroundColor: "#D4450A" }}
                    >
                      Invoice
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
