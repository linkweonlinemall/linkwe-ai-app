"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { getStatusInfo } from "@/lib/orders/order-status";
import type { MainOrderStatus } from "@prisma/client";

type OrderItem = {
  id: string;
  titleSnapshot: string;
  product: { name: string; images: string[] } | null;
};

/** Matches server payload; `_count` required for “+N more items” on cards. */
export type Order = {
  id: string;
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

function getStatusBadgeClass(status: MainOrderStatus): string {
  switch (status) {
    case "DRAFT":
    case "PENDING_PAYMENT":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "PAID":
    case "PROCESSING":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "PARTIALLY_IN_HOUSE":
    case "READY_TO_SHIP":
    case "SHIPPED":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "DELIVERED":
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "CANCELLED":
    case "REFUNDED":
      return "bg-red-50 text-red-700 border border-red-200";
    default:
      return "bg-zinc-100 text-zinc-600 border border-zinc-200";
  }
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
      const regionHaystack = (order.region ?? "").toLowerCase().replace(/_/g, " ");
      const productHaystack = order.items
        .map((item) => `${item.product?.name ?? ""} ${item.titleSnapshot}`)
        .join(" ")
        .toLowerCase();

      const searchableBlob = [idTail, regionHaystack, productHaystack].join(" ");

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
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setSortBy("newest");
              }}
              className="text-xs text-zinc-400 transition-colors hover:text-zinc-700"
            >
              Clear filters
            </button>
          ) : null}

          <span className="ml-auto self-center text-xs text-zinc-400">
            {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {filteredOrders.length === 0 && orders.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm font-medium text-zinc-500">No orders match your search.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
            className="mt-3 text-sm font-medium hover:underline"
            style={{ color: "#D4450A" }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredOrders.map((order, index) => {
            const statusInfo = getStatusInfo(order.status);
            const badgeClass = getStatusBadgeClass(order.status);
            const itemCount = order._count.items;
            const extraItems = itemCount > 3 ? itemCount - 3 : 0;

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: "#D4450A" }}
                    >
                      {filteredOrders.length - index}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        Order #LW-{order.id.slice(-8).toUpperCase()}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-400">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Items
                    </p>
                    <div className="flex flex-col gap-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-100">
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
                          <p className="max-w-[140px] truncate text-xs text-zinc-700">
                            {item.product?.name ?? item.titleSnapshot}
                          </p>
                        </div>
                      ))}
                      {extraItems > 0 ? (
                        <p className="text-xs text-zinc-400">+{extraItems} more items</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Summary
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Subtotal</span>
                        <span className="font-medium text-zinc-700">
                          TTD {(order.subtotalMinor / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Shipping</span>
                        <span className="font-medium text-zinc-700">
                          TTD {(order.shippingMinor / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex justify-between border-t border-zinc-100 pt-1.5 text-xs font-semibold">
                        <span className="text-zinc-900">Total</span>
                        <span style={{ color: "#D4450A" }}>
                          TTD {(order.totalMinor / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-1 flex justify-between text-xs">
                        <span className="text-zinc-500">Delivery to</span>
                        <span className="font-medium capitalize text-zinc-700">
                          {order.region?.replace(/_/g, " ") ?? "—"}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Items</span>
                        <span className="font-medium text-zinc-700">{order.items.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3">
                  <p className="text-sm font-semibold text-zinc-900">
                    TTD {(order.totalMinor / 100).toFixed(2)}
                  </p>
                  <div className="flex items-center gap-3">
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
