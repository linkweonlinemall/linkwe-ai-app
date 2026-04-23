"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

import { bundleAndDispatch, markPackaged } from "@/app/actions/assembly";
import { cleanupAbandonedOrders, deleteAllOrders } from "@/app/actions/admin-delete";
import UndoDeleteToast from "./undo-delete-toast";
import {
  completeOrders,
  exportOrdersCSV,
  getAdminOrders,
  getAdminOrderStats,
  updateOrderStatus,
} from "@/app/actions/admin-orders";
import type { MainOrderStatus } from "@prisma/client";

type Order = Awaited<ReturnType<typeof getAdminOrders>>[number];
type Stats = Awaited<ReturnType<typeof getAdminOrderStats>>;

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PAID: { label: "Order Placed", color: "#1A7FB5", bg: "#EFF8FF" },
  PROCESSING: { label: "Processing", color: "#E8820C", bg: "#FFF7ED" },
  PARTIALLY_IN_HOUSE: { label: "Partial Warehouse", color: "#7F77DD", bg: "#F5F3FF" },
  READY_TO_SHIP: { label: "Ready to Package", color: "#1B8C5A", bg: "#F0FDF4" },
  PACKING_COMPLETE: { label: "Packing Complete", color: "#7F77DD", bg: "#F5F3FF" },
  SHIPPED: { label: "Shipped", color: "#1A7FB5", bg: "#EFF8FF" },
  CUSTOMER_RECEIVED: { label: "Customer Received", color: "#059669", bg: "#F0FDF4" },
  DELIVERED: { label: "Delivered", color: "#1B8C5A", bg: "#F0FDF4" },
  COMPLETED: { label: "Completed", color: "#1B8C5A", bg: "#F0FDF4" },
  CANCELLED: { label: "Cancelled", color: "#DC2626", bg: "#FEF2F2" },
  REFUNDED: { label: "Refunded", color: "#DC2626", bg: "#FEF2F2" },
};

function formatTTD(minor: number): string {
  return (minor / 100).toLocaleString("en-TT", {
    style: "currency",
    currency: "TTD",
  });
}

function relativeTime(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

function getRowAccentColor(status: string): string {
  switch (status) {
    case "PAID":
      return "#1A7FB5";
    case "PROCESSING":
      return "#E8820C";
    case "PARTIALLY_IN_HOUSE":
      return "#7F77DD";
    case "READY_TO_SHIP":
      return "#1B8C5A";
    case "PACKING_COMPLETE":
      return "#0D9488";
    case "SHIPPED":
      return "#1A7FB5";
    case "CUSTOMER_RECEIVED":
      return "#059669";
    case "DELIVERED":
    case "COMPLETED":
      return "#059669";
    case "CANCELLED":
    case "REFUNDED":
      return "#DC2626";
    default:
      return "#E4E4E7";
  }
}

function getRowBgColor(status: string): string {
  switch (status) {
    case "PAID":
      return "#DBEAFE";
    case "PROCESSING":
      return "#FEF3C7";
    case "PARTIALLY_IN_HOUSE":
      return "#EDE9FE";
    case "READY_TO_SHIP":
      return "#D1FAE5";
    case "PACKING_COMPLETE":
      return "#CCFBF1";
    case "SHIPPED":
      return "#BFDBFE";
    case "DELIVERED":
    case "COMPLETED":
      return "#A7F3D0";
    case "CUSTOMER_RECEIVED":
      return "#BBF7D0";
    case "CANCELLED":
    case "REFUNDED":
      return "#FEE2E2";
    default:
      return "#FFFFFF";
  }
}

function splitStatusLabel(status: string): string {
  const map: Record<string, string> = {
    AWAITING_VENDOR_ACTION: "Awaiting vendor",
    VENDOR_PREPARING: "Preparing",
    AWAITING_COURIER_PICKUP: "Awaiting courier",
    COURIER_ASSIGNED: "Courier assigned",
    COURIER_PICKED_UP: "Picked up",
    VENDOR_DROPPED_OFF: "Dropped off",
    AT_WAREHOUSE: "At warehouse",
    PACKAGED: "Packaged",
    BUNDLED_FOR_DISPATCH: "Bundled",
    DISPATCHED: "Dispatched",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
  };
  return map[status] ?? status.replace(/_/g, " ");
}

export default function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MainOrderStatus | "ALL">("ALL");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanedCount, setCleanedCount] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([getAdminOrders(), getAdminOrderStats()])
      .then(([o, s]) => {
        setOrders(o);
        setStats(s);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [refreshKey]);

  const filtered = useMemo(() => {
    let data = orders;
    if (statusFilter !== "ALL") {
      data = data.filter((o) => o.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (o) =>
          (o.referenceNumber ?? "").toLowerCase().includes(q) ||
          o.buyer.fullName.toLowerCase().includes(q) ||
          o.buyer.email.toLowerCase().includes(q),
      );
    }
    return data;
  }, [orders, statusFilter, search]);

  const visibleIds = filtered.map((o) => o.id);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedRows.has(id));
  const someSelected =
    visibleIds.some((id) => selectedRows.has(id)) && !allSelected;

  const hasCustomerReceived = filtered
    .filter((o) => selectedRows.has(o.id))
    .some((o) => o.status === "CUSTOMER_RECEIVED");

  const hasPackingComplete = filtered
    .filter((o) => selectedRows.has(o.id))
    .some((o) => o.status === "PACKING_COMPLETE");

  function toggleAll() {
    if (allSelected) {
      setSelectedRows((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedRows((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  function toggleRow(id: string) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Orders
          </h2>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            All customer orders across the platform
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right">
            <p className="text-2xl font-bold text-zinc-900">{orders.length}</p>
            <p className="text-xs text-zinc-400">total loaded</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              setCleaning(true);
              const result = await cleanupAbandonedOrders();
              setCleanedCount(result.deleted);
              setCleaning(false);
              setRefreshKey((k) => k + 1);
              setTimeout(() => setCleanedCount(null), 3000);
            }}
            disabled={cleaning}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            {cleaning ? "Cleaning..." : "Clean abandoned"}
          </button>
          {cleanedCount !== null ? (
            <span className="text-xs font-medium text-emerald-600">✓ {cleanedCount} removed</span>
          ) : null}
          <button
            type="button"
            onClick={() => setPendingDelete(true)}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
          >
            Delete all
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            backgroundColor: statusFilter === "ALL" ? "var(--scarlet)" : "white",
            color: statusFilter === "ALL" ? "white" : "var(--text-secondary)",
            border: statusFilter === "ALL" ? "none" : "1px solid var(--card-border)",
          }}
        >
          All ({orders.length})
        </button>
        {stats
          ? Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const count = stats[status as MainOrderStatus] ?? 0;
              if (count === 0) return null;
              const active = statusFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status as MainOrderStatus)}
                  className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: active ? "var(--scarlet)" : "white",
                    color: active ? "white" : "var(--text-secondary)",
                    border: active ? "none" : "1px solid var(--card-border)",
                  }}
                >
                  {config.label} ({count})
                </button>
              );
            })
          : null}
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by order ref, customer name or email..."
        className="mb-4 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none ring-zinc-300 focus:ring-2"
      />

      {selectedRows.size > 0 ? (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-sm font-medium text-zinc-700">
            {selectedRows.size} order{selectedRows.size !== 1 ? "s" : ""} selected
          </span>
          <div className="h-4 w-px bg-zinc-200" />

          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 outline-none focus:ring-2 ring-zinc-300"
          >
            <option value="">Change status to...</option>
            <option value="PROCESSING">Processing</option>
            <option value="READY_TO_SHIP">Ready to Ship</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="COMPLETED">Complete orders</option>
            <option value="CANCELLED">Cancel orders</option>
          </select>

          {bulkAction ? (
            <button
              type="button"
              onClick={() => setShowBulkConfirm(true)}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: bulkAction === "CANCELLED" ? "#DC2626" : "#D4450A" }}
            >
              Apply to {selectedRows.size}
            </button>
          ) : null}

          {hasCustomerReceived ? (
            <button
              type="button"
              onClick={() => {
                setBulkAction("COMPLETED");
                setShowBulkConfirm(true);
              }}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: "#059669" }}
            >
              Complete & Release Earnings (
              {filtered.filter((o) => selectedRows.has(o.id) && o.status === "CUSTOMER_RECEIVED").length})
            </button>
          ) : null}

          {hasPackingComplete ? (
            <button
              type="button"
              onClick={async () => {
                setBulkProcessing(true);
                try {
                  const packingCompleteOrders = filtered.filter(
                    (o) => selectedRows.has(o.id) && o.status === "PACKING_COMPLETE",
                  );
                  for (const order of packingCompleteOrders) {
                    const fd = new FormData();
                    fd.append("mainOrderId", order.id);
                    await bundleAndDispatch(fd);
                  }
                  setSelectedRows(new Set());
                  setRefreshKey((k) => k + 1);
                } finally {
                  setBulkProcessing(false);
                }
              }}
              disabled={bulkProcessing}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#1B8C5A" }}
            >
              Bundle & Dispatch (
              {filtered.filter((o) => selectedRows.has(o.id) && o.status === "PACKING_COMPLETE").length})
            </button>
          ) : null}

          <div className="h-4 w-px bg-zinc-200" />

          <button
            type="button"
            onClick={async () => {
              const csv = await exportOrdersCSV(Array.from(selectedRows));
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `linkwe-orders-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedRows(new Set());
              setBulkAction("");
            }}
            className="ml-auto text-xs text-zinc-400 transition-colors hover:text-zinc-700"
          >
            Clear selection
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="overflow-hidden rounded-xl bg-white" style={{ border: "1px solid var(--card-border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-xs font-semibold uppercase tracking-wide"
                style={{
                  color: "var(--text-muted)",
                  backgroundColor: "#F7F7F6",
                  borderBottom: "1px solid var(--card-border-subtle)",
                }}
              >
                <th className="w-9 py-3 pl-5" />
                <th className="px-5 py-3 text-left">Ref</th>
                <th className="px-5 py-3 text-left">Customer</th>
                <th className="px-5 py-3 text-left">Items</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-left">Region</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Vendors</th>
                <th className="px-5 py-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-zinc-100">
                  <td colSpan={9} className="px-3 py-2">
                    <div className="h-10 animate-pulse rounded-lg bg-zinc-100" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-16 text-center shadow-sm">
          <p className="text-base font-semibold text-zinc-900">
            {search.trim()
              ? "No orders match your search"
              : statusFilter !== "ALL"
                ? "No orders with this status in the loaded list"
                : "No orders to show"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {search.trim()
              ? `Try a different search term${statusFilter !== "ALL" ? " or clear filters." : "."}`
              : orders.length === 0
                ? "Paid and processing orders will appear here."
                : "Adjust filters or search to see more orders."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white" style={{ border: "1px solid var(--card-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{
                    color: "var(--text-muted)",
                    backgroundColor: "#F7F7F6",
                    borderBottom: "1px solid var(--card-border-subtle)",
                  }}
                >
                  <th className="w-9 py-3 pl-5">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-5 py-3 text-left">Ref</th>
                  <th className="px-5 py-3 text-left">Customer</th>
                  <th className="px-5 py-3 text-left">Items</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-left">Region</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Vendors</th>
                  <th className="px-5 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const cfg = STATUS_CONFIG[row.status] ?? {
                    label: row.status,
                    color: "#71717a",
                    bg: "#f4f4f5",
                  };
                  const firstItem = row.items[0];
                  const itemsLabel =
                    row.items.length === 0
                      ? "0 items"
                      : `${row.items.length} item${row.items.length !== 1 ? "s" : ""} · ${firstItem.titleSnapshot}`;

                  const allSplitOrdersPackaged =
                    row.splitOrders.length > 0 &&
                    row.splitOrders.every((so) =>
                      ["PACKAGED", "BUNDLED_FOR_DISPATCH", "DISPATCHED"].includes(so.status),
                    );

                  const hasAnyPackageable = row.splitOrders.some((so) =>
                    ["AT_WAREHOUSE", "PACKAGED"].includes(so.status),
                  );

                  return (
                    <Fragment key={row.id}>
                      <tr
                        onClick={() => setExpandedRow((prev) => (prev === row.id ? null : row.id))}
                        style={{
                          borderLeft: `3px solid ${getRowAccentColor(row.status)}`,
                          backgroundColor: selectedRows.has(row.id) ? "#EFF6FF" : getRowBgColor(row.status),
                        }}
                        className="cursor-pointer border-b border-zinc-100 text-zinc-800 transition-colors hover:brightness-[0.985]"
                      >
                        <td
                          className="py-3 pl-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRows.has(row.id)}
                            onChange={() => toggleRow(row.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-zinc-800">
                              {row.referenceNumber ?? row.id.slice(-8).toUpperCase()}
                            </span>
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className={`shrink-0 text-zinc-700 transition-transform duration-150 ${
                                expandedRow === row.id ? "rotate-180" : ""
                              }`}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-xs font-medium text-zinc-900">{row.buyer.fullName}</p>
                          <p className="text-xs text-zinc-700">{row.buyer.email}</p>
                        </td>
                        <td className="max-w-[200px] px-3 py-3">
                          <span className="line-clamp-2 text-xs text-zinc-800">{itemsLabel}</span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-xs font-medium text-zinc-900">
                          {formatTTD(row.totalMinor)}
                        </td>
                        <td className="px-3 py-3 text-xs capitalize text-zinc-800">
                          {row.region.replace(/_/g, " ")}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ color: cfg.color, backgroundColor: cfg.bg }}
                          >
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-zinc-800">{row.splitOrders.length}</td>
                        <td className="px-3 py-3 text-right text-xs text-zinc-700">
                          {relativeTime(row.createdAt)}
                        </td>
                      </tr>
                      {expandedRow === row.id ? (
                        <tr className="border-b border-zinc-200 bg-zinc-50">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                              <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                                  Line items
                                </p>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-zinc-200">
                                      <th className="py-1.5 text-left text-zinc-400">Item</th>
                                      <th className="py-1.5 text-left text-zinc-400">Store</th>
                                      <th className="py-1.5 text-center text-zinc-400">Qty</th>
                                      <th className="py-1.5 text-right text-zinc-400">Line total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.items.map((item) => (
                                      <tr key={item.id} className="border-b border-zinc-100">
                                        <td className="py-2 text-zinc-800">{item.titleSnapshot}</td>
                                        <td className="py-2 text-zinc-600">{item.store.name}</td>
                                        <td className="py-2 text-center text-zinc-600">{item.quantity}</td>
                                        <td className="py-2 text-right font-mono text-zinc-900">
                                          {formatTTD(item.priceMinor * item.quantity)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                                  Split orders (vendors)
                                </p>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-zinc-200">
                                      <th className="py-1.5 text-left text-zinc-400">Ref</th>
                                      <th className="py-1.5 text-left text-zinc-400">Vendor</th>
                                      <th className="py-1.5 text-left text-zinc-400">Status</th>
                                      <th className="py-1.5 text-center text-zinc-400">Bay</th>
                                      <th className="py-1.5 text-right text-zinc-400">Subtotal</th>
                                      <th className="py-2 text-right text-xs font-semibold uppercase text-zinc-400">
                                        Pack
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.splitOrders.length === 0 ? (
                                      <tr>
                                        <td colSpan={6} className="py-3 text-zinc-500">
                                          No split orders
                                        </td>
                                      </tr>
                                    ) : (
                                      row.splitOrders.map((so) => (
                                        <tr key={so.id} className="border-b border-zinc-100">
                                          <td className="py-2 font-mono text-zinc-600">
                                            {so.referenceNumber ?? so.id.slice(-8)}
                                          </td>
                                          <td className="py-2 text-zinc-800">{so.store.name}</td>
                                          <td className="py-2 text-zinc-700">{splitStatusLabel(so.status)}</td>
                                          <td className="py-2 text-center">
                                            {so.bayNumber != null ? (
                                              <span
                                                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-white"
                                                style={{ backgroundColor: "var(--scarlet)" }}
                                              >
                                                {so.bayNumber}
                                              </span>
                                            ) : (
                                              <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                                                —
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2 text-right font-mono text-zinc-900">
                                            {formatTTD(so.subtotalMinor)}
                                          </td>
                                          <td className="py-2 text-right">
                                            {["AT_WAREHOUSE", "PACKAGED"].includes(so.status) ? (
                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  const fd = new FormData();
                                                  fd.append("splitOrderId", so.id);
                                                  await markPackaged(fd);
                                                  setRefreshKey((k) => k + 1);
                                                }}
                                                className={`ml-auto flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                                                  so.status === "PACKAGED"
                                                    ? "border-emerald-500 bg-emerald-500 hover:bg-emerald-600"
                                                    : "border-zinc-300 bg-white hover:border-[#D4450A]"
                                                }`}
                                                title={
                                                  so.status === "PACKAGED"
                                                    ? "Click to unpack"
                                                    : "Click to mark as packed"
                                                }
                                              >
                                                {so.status === "PACKAGED" ? (
                                                  <svg
                                                    width="10"
                                                    height="10"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="white"
                                                    strokeWidth="3"
                                                  >
                                                    <polyline points="20 6 9 17 4 12" />
                                                  </svg>
                                                ) : null}
                                              </button>
                                            ) : (
                                              <span className="text-xs text-zinc-300">—</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>

                                {hasAnyPackageable ? (
                                  <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3">
                                    <p className="text-xs text-zinc-500">
                                      {allSplitOrdersPackaged
                                        ? "All vendor packages packed — ready to dispatch."
                                        : `${row.splitOrders.filter((so) => !["PACKAGED", "BUNDLED_FOR_DISPATCH", "DISPATCHED"].includes(so.status)).length} vendor package${row.splitOrders.filter((so) => !["PACKAGED", "BUNDLED_FOR_DISPATCH", "DISPATCHED"].includes(so.status)).length !== 1 ? "s" : ""} still need packing.`}
                                    </p>
                                    <button
                                      type="button"
                                      disabled={!allSplitOrdersPackaged}
                                      onClick={async () => {
                                        const fd = new FormData();
                                        fd.append("mainOrderId", row.id);
                                        await bundleAndDispatch(fd);
                                        setRefreshKey((k) => k + 1);
                                        setExpandedRow(null);
                                      }}
                                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
                                      style={{
                                        backgroundColor: allSplitOrdersPackaged ? "#1B8C5A" : "#9CA3AF",
                                      }}
                                    >
                                      Bundle & Dispatch →
                                    </button>
                                  </div>
                                ) : null}
                              </div>

                              <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                                  Order financials
                                </p>
                                <div className="mb-4 space-y-2 rounded-xl border border-zinc-200 bg-white p-3 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-zinc-500">Subtotal</span>
                                    <span className="font-mono text-zinc-900">{formatTTD(row.subtotalMinor)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-zinc-500">Shipping</span>
                                    <span className="font-mono text-zinc-900">{formatTTD(row.shippingMinor)}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-zinc-100 pt-2 font-semibold">
                                    <span className="text-zinc-900">Total</span>
                                    <span className="font-mono" style={{ color: "#D4450A" }}>
                                      {formatTTD(row.totalMinor)}
                                    </span>
                                  </div>
                                </div>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                                  Customer
                                </p>
                                <p className="text-sm font-medium text-zinc-900">{row.buyer.fullName}</p>
                                <p className="text-sm text-zinc-500">{row.buyer.email}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showBulkConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-zinc-900">Confirm Bulk Update</h3>
            <p className="mb-4 text-sm text-zinc-600">
              You are about to change {selectedRows.size} order{selectedRows.size !== 1 ? "s" : ""} to{" "}
              <span className="font-semibold">
                {STATUS_CONFIG[bulkAction]?.label ?? bulkAction}
              </span>
              .
              {bulkAction === "CANCELLED" ? (
                <span className="font-medium text-red-600"> This action cannot be undone.</span>
              ) : null}
            </p>

            <div className="mb-4 max-h-40 overflow-y-auto rounded-xl border border-zinc-100">
              {filtered
                .filter((o) => selectedRows.has(o.id))
                .map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between border-b border-zinc-50 px-3 py-2 last:border-0"
                  >
                    <span className="font-mono text-xs text-zinc-500">
                      {o.referenceNumber ?? o.id.slice(-8).toUpperCase()}
                    </span>
                    <span className="text-xs text-zinc-700">{o.buyer.fullName}</span>
                  </div>
                ))}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowBulkConfirm(false)}
                disabled={bulkProcessing}
                className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setBulkProcessing(true);
                  try {
                    if (bulkAction === "COMPLETED") {
                      await completeOrders(Array.from(selectedRows));
                    } else {
                      await updateOrderStatus(Array.from(selectedRows), bulkAction);
                    }
                    setSelectedRows(new Set());
                    setBulkAction("");
                    setShowBulkConfirm(false);
                    setRefreshKey((k) => k + 1);
                  } finally {
                    setBulkProcessing(false);
                  }
                }}
                disabled={bulkProcessing}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                style={{
                  backgroundColor:
                    bulkAction === "CANCELLED"
                      ? "#DC2626"
                      : bulkAction === "COMPLETED"
                        ? "#059669"
                        : "#D4450A",
                }}
              >
                {bulkProcessing ? "Updating..." : `Confirm`}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <UndoDeleteToast
          message={`Delete all ${orders.length} orders`}
          onConfirm={async () => {
            await deleteAllOrders();
            setPendingDelete(false);
            setRefreshKey((k) => k + 1);
          }}
          onCancel={() => setPendingDelete(false)}
        />
      ) : null}
    </div>
  );
}
