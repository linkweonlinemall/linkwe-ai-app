"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

import { cleanupAbandonedOrders, deleteAllOrders } from "@/app/actions/admin-delete";
import UndoDeleteToast from "./undo-delete-toast";
import {
  completeAllDeliveredSplits,
  completeSplitOrder,
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

// Part 3 token pill colors for split-order statuses in the expand panel.
function splitStatusPill(status: string): { color: string; bg: string } {
  if (status === "AWAITING_VENDOR_ACTION") return { color: "#1A7FB5", bg: "#EFF8FF" };
  if (["PREPARING", "VENDOR_PREPARING", "AWAITING_COURIER_PICKUP"].includes(status))
    return { color: "#E8820C", bg: "#FFF7ED" };
  if (["COURIER_ASSIGNED", "COURIER_PICKED_UP", "VENDOR_DROPPED_OFF"].includes(status))
    return { color: "#E8820C", bg: "#FFF7ED" };
  if (["READY_FOR_LINKWE", "AT_WAREHOUSE", "PACKAGED", "BUNDLED_FOR_DISPATCH"].includes(status))
    return { color: "#1B8C5A", bg: "#F0FDF4" };
  if (["SHIPPED", "OUT_FOR_DELIVERY", "DISPATCHED"].includes(status))
    return { color: "#1D4ED8", bg: "#EFF6FF" };
  if (["DELIVERED", "COMPLETED"].includes(status))
    return { color: "#1B8C5A", bg: "#F0FDF4" };
  if (status === "CANCELLED") return { color: "#D4450A", bg: "#FEF0EC" };
  return { color: "#71717a", bg: "#f4f4f5" };
}

function splitStatusLabel(status: string): string {
  const map: Record<string, string> = {
    AWAITING_VENDOR_ACTION: "Order placed",
    PREPARING: "Preparing",
    VENDOR_PREPARING: "Preparing",
    SHIPPED: "Out for delivery",
    OUT_FOR_DELIVERY: "Out for delivery",
    READY_FOR_LINKWE: "Ready for LinkWe",
    DELIVERED: "Delivered",
    COMPLETED: "Completed",
    AWAITING_COURIER_PICKUP: "Awaiting courier",
    COURIER_ASSIGNED: "Courier assigned",
    COURIER_PICKED_UP: "Picked up",
    VENDOR_DROPPED_OFF: "Dropped off",
    AT_WAREHOUSE: "At warehouse",
    PACKAGED: "Packaged",
    BUNDLED_FOR_DISPATCH: "Bundled",
    DISPATCHED: "Dispatched",
    CANCELLED: "Cancelled",
  };
  return map[status] ?? status.replace(/_/g, " ");
}

const SCARLET = "#D4450A";

type SplitOrderRow = Order["splitOrders"][number];

function SplitStoreFulfillmentCard({
  split,
  onComplete,
}: {
  split: SplitOrderRow;
  onComplete: () => void | Promise<void>;
}) {
  const pill = splitStatusPill(split.status);
  const splitRef = split.referenceNumber ?? split.id.slice(-8).toUpperCase();
  const showPayoutButton = split.status === "DELIVERED" && !split.earningsReleased;
  const showPaidOut = split.status === "COMPLETED" || split.earningsReleased;

  return (
    <div
      className="rounded-xl bg-white p-4 sm:p-5"
      style={{ border: "1px solid var(--card-border)" }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-zinc-900">{split.store.name}</p>
            <span
              className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ color: pill.color, backgroundColor: pill.bg }}
            >
              {splitStatusLabel(split.status)}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-zinc-500">{splitRef}</p>
          <p className="mt-2 text-xs font-medium text-zinc-700">
            Subtotal {formatTTD(split.subtotalMinor)}
          </p>
        </div>
        {showPayoutButton ? (
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              await onComplete();
            }}
            className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: SCARLET }}
          >
            Complete & release payout
          </button>
        ) : showPaidOut ? (
          <p className="shrink-0 text-sm font-semibold text-emerald-700">Paid out ✓</p>
        ) : null}
      </div>
    </div>
  );
}

function VendorFulfillmentCards({
  splits,
  onRefresh,
}: {
  splits: SplitOrderRow[];
  onRefresh: () => void;
}) {
  if (splits.length === 0) {
    return <p className="text-xs text-zinc-400">No split orders</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {splits.map((split) => (
        <SplitStoreFulfillmentCard
          key={split.id}
          split={split}
          onComplete={async () => {
            await completeSplitOrder(split.id);
            onRefresh();
          }}
        />
      ))}
    </div>
  );
}

// ─── Fulfillment derived data ─────────────────────────────────────────────────

// Statuses that mean an item has left the vendor and is in transit to or at the warehouse.
// Starts at COURIER_ASSIGNED (courier confirmed, bay may be pre-assigned) — everything from
// that point on counts as received for "X of N received" purposes. CANCELLED is excluded.
const RECEIVED_STATUSES: Set<string> = new Set([
  "COURIER_ASSIGNED",
  "COURIER_PICKED_UP",
  "VENDOR_DROPPED_OFF",
  "AT_WAREHOUSE",
  "PACKAGED",
  "BUNDLED_FOR_DISPATCH",
  "DISPATCHED",
  "DELIVERED",
  "COMPLETED",
]);

// Group 1 — warehouse action needed right now.
const ACTION_STATUSES: Set<string> = new Set(["READY_TO_SHIP", "PACKING_COMPLETE"]);

// Group 2 — pieces still incoming from vendors.
const WAITING_STATUSES: Set<string> = new Set(["PAID", "PROCESSING", "PARTIALLY_IN_HOUSE"]);

// Group 3 — past warehouse action, monitoring only (NOT dimmed).
const MOTION_STATUSES: Set<string> = new Set(["SHIPPED", "CUSTOMER_RECEIVED"]);

// Group 4 — truly terminal; dimmed.
const DONE_STATUSES: Set<string> = new Set(["DELIVERED", "COMPLETED", "CANCELLED", "REFUNDED"]);

/** Orders open longer than this without full warehouse receipt are flagged stale. */
const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

/**
 * Main-order statuses that are only reachable AFTER every split order has been
 * dispatched from the warehouse. If a split order's raw enum status disagrees
 * with one of these, the order-level status is authoritative — we display N of N
 * and treat the split mismatch as a data inconsistency (order manually advanced).
 */
const POST_DISPATCH_STATUSES: Set<string> = new Set([
  "SHIPPED",
  "CUSTOMER_RECEIVED",
  "DELIVERED",
  "COMPLETED",
]);

function receivedCount(order: Order): number {
  return order.splitOrders.filter((s) => RECEIVED_STATUSES.has(s.status)).length;
}

function fullyReceived(order: Order): boolean {
  return order.splitOrders.length > 0 && receivedCount(order) === order.splitOrders.length;
}

function orderIsStale(order: Order): boolean {
  if (DONE_STATUSES.has(order.status)) return false;
  if (POST_DISPATCH_STATUSES.has(order.status)) return false; // in motion — never stale
  if (fullyReceived(order)) return false;
  return Date.now() - new Date(order.createdAt).getTime() > STALE_THRESHOLD_MS;
}

function staleAge(order: Order): string {
  const ms = Date.now() - new Date(order.createdAt).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor(ms / (1000 * 60 * 60));
  return days >= 1 ? `${days}d` : `${hours}h`;
}

// ─── Per-order display values ─────────────────────────────────────────────────
// Pre-computed once per order so both the mobile card view and the desktop table
// can destructure from the same object — no duplicated logic.

type RowMeta = {
  kind: "row";
  order: Order;
  isDone: boolean;
  recvd: number;
  total: number;
  ready: boolean;
  stale: boolean;
  isMotion: boolean;
  edgeColor: string;
  pillColor: string;
  pillBg: string;
  itemsLabel: string;
  panelReadiness: { text: string; color: string };
};

function makeRowItem(order: Order, isDone: boolean): RowMeta {
  const total = order.splitOrders.length;
  const rawRecvd = order.splitOrders.filter((s) => RECEIVED_STATUSES.has(s.status)).length;
  const recvd = POST_DISPATCH_STATUSES.has(order.status) ? total : rawRecvd;
  const ready = total > 0 && recvd === total;
  const stale = !isDone && orderIsStale(order);
  const isMotion = MOTION_STATUSES.has(order.status);

  const edgeColor = stale
    ? "#D4450A"
    : isDone
      ? "#D4D4D8"
      : isMotion
        ? "#1A7FB5"
        : ready
          ? "#1B8C5A"
          : "#E8820C";

  const pillColor = ready ? "#1B8C5A" : recvd > 0 ? "#E8820C" : "#1A7FB5";
  const pillBg    = ready ? "#F0FDF4" : recvd > 0 ? "#FFF7ED" : "#EFF8FF";

  const firstItem  = order.items[0];
  const itemsLabel =
    order.items.length === 0
      ? "0 items"
      : `${order.items.length} item${order.items.length !== 1 ? "s" : ""} · ${firstItem.titleSnapshot}`;

  const panelReadiness: { text: string; color: string } = isDone
    ? { text: STATUS_CONFIG[order.status]?.label ?? order.status, color: "#A1A1AA" }
    : order.status === "SHIPPED"
      ? { text: "Dispatched", color: "#1A7FB5" }
      : order.status === "CUSTOMER_RECEIVED"
        ? { text: "With customer", color: "#1A7FB5" }
        : stale
          ? { text: `Waiting ${staleAge(order)}`, color: "#D4450A" }
          : ready && ACTION_STATUSES.has(order.status)
            ? { text: "Ready to bundle", color: "#1B8C5A" }
            : ready &&
                order.splitOrders.some((s) =>
                  ["COURIER_ASSIGNED", "COURIER_PICKED_UP"].includes(s.status),
                )
              ? { text: "In transit to warehouse", color: "#E8820C" }
              : ready
                ? { text: "Awaiting check-in", color: "#E8820C" }
                : {
                    text:
                      total - recvd === 1
                        ? "Awaiting vendor"
                        : `Waiting on ${total - recvd} vendors`,
                    color: "#71717a",
                  };

  return {
    kind: "row",
    order,
    isDone,
    recvd,
    total,
    ready,
    stale,
    isMotion,
    edgeColor,
    pillColor,
    pillBg,
    itemsLabel,
    panelReadiness,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

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

  const hasDeliveredSplitsToComplete = filtered
    .filter((o) => selectedRows.has(o.id))
    .some((o) =>
      o.splitOrders.some((s) => s.status === "DELIVERED" && !s.earningsReleased),
    );

  const deliveredSplitCount = filtered
    .filter((o) => selectedRows.has(o.id))
    .reduce(
      (n, o) =>
        n + o.splitOrders.filter((s) => s.status === "DELIVERED" && !s.earningsReleased).length,
      0,
    );

  // ── Four fulfillment groups ──────────────────────────────────────────────────
  // Helper: sort oldest-first; within waiting group, stale orders float to top.
  function sortOldest(a: Order, b: Order, stalePriority = false): number {
    if (stalePriority) {
      const aS = orderIsStale(a), bS = orderIsStale(b);
      if (aS !== bS) return aS ? -1 : 1;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }

  // Group 1 — Needs action (ready to bundle now).
  const actionGroup = filtered
    .filter((o) => ACTION_STATUSES.has(o.status))
    .sort((a, b) => sortOldest(a, b));

  // Group 2 — Waiting on vendors (pieces still incoming).
  const waitingGroup = filtered
    .filter((o) => WAITING_STATUSES.has(o.status))
    .sort((a, b) => sortOldest(a, b, true));

  // Group 3 — In motion (dispatched / with customer — active but not actionable by warehouse).
  const motionGroup = filtered
    .filter((o) => MOTION_STATUSES.has(o.status))
    .sort((a, b) => sortOldest(a, b));

  // Group 4 — Completed (terminal; dimmed).
  const doneGroup = filtered
    .filter((o) => DONE_STATUSES.has(o.status))
    .sort((a, b) => sortOldest(a, b));

  type TableItem =
    | { kind: "header"; label: string; sublabel?: string; color: string; bg: string; count: number }
    | RowMeta;

  const tableItems: TableItem[] = [];
  if (actionGroup.length > 0) {
    tableItems.push({
      kind: "header",
      label: "Needs action",
      sublabel: "ready to bundle",
      color: "#1B8C5A",
      bg: "#F0FDF4",
      count: actionGroup.length,
    });
    actionGroup.forEach((o) => tableItems.push(makeRowItem(o, false)));
  }
  if (waitingGroup.length > 0) {
    tableItems.push({
      kind: "header",
      label: "Waiting on vendors",
      color: "#E8820C",
      bg: "#FFF7ED",
      count: waitingGroup.length,
    });
    waitingGroup.forEach((o) => tableItems.push(makeRowItem(o, false)));
  }
  if (motionGroup.length > 0) {
    tableItems.push({
      kind: "header",
      label: "In motion",
      sublabel: "dispatched · with customer",
      color: "#1A7FB5",
      bg: "#EFF8FF",
      count: motionGroup.length,
    });
    motionGroup.forEach((o) => tableItems.push(makeRowItem(o, false)));
  }
  if (doneGroup.length > 0) {
    tableItems.push({
      kind: "header",
      label: "Completed",
      color: "#A1A1AA",
      bg: "#F9FAFB",
      count: doneGroup.length,
    });
    doneGroup.forEach((o) => tableItems.push(makeRowItem(o, true)));
  }

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

          {hasDeliveredSplitsToComplete ? (
            <button
              type="button"
              disabled={bulkProcessing}
              onClick={async () => {
                setBulkProcessing(true);
                try {
                  for (const order of filtered.filter((o) => selectedRows.has(o.id))) {
                    await completeAllDeliveredSplits(order.id);
                  }
                  setRefreshKey((k) => k + 1);
                } finally {
                  setBulkProcessing(false);
                }
              }}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#059669" }}
            >
              Complete all delivered ({deliveredSplitCount})
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
        <>
          {/* Loading — desktop table skeleton */}
          <div className="hidden overflow-hidden rounded-xl bg-white md:block" style={{ border: "1px solid var(--card-border)" }}>
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
                  <th className="px-5 py-3 text-left">Received</th>
                  <th className="px-5 py-3 text-left">Readiness</th>
                  <th className="px-5 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-b border-zinc-100">
                    <td colSpan={8} className="px-3 py-2">
                      <div className="h-10 animate-pulse rounded-lg bg-zinc-100" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Loading — mobile card skeletons */}
          <div className="flex flex-col gap-2 md:hidden">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-[88px] animate-pulse rounded-xl bg-white"
                style={{ border: "1px solid var(--card-border)" }}
              />
            ))}
          </div>
        </>
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
        <>
          {/* ── Mobile card list (<md) ─────────────────────────────────── */}
          <div className="overflow-hidden rounded-xl md:hidden" style={{ border: "1px solid var(--card-border)" }}>
            {tableItems.map((item) => {
              if (item.kind === "header") {
                return (
                  <div
                    key={`mhdr-${item.label}`}
                    className="border-b border-zinc-100 px-4 py-1.5"
                    style={{ backgroundColor: item.bg }}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: item.color }}>
                      {item.label}
                    </span>
                    {item.sublabel ? (
                      <span className="ml-1 text-[10px] font-normal normal-case tracking-normal" style={{ color: item.color, opacity: 0.65 }}>
                        · {item.sublabel}
                      </span>
                    ) : null}
                    <span className="ml-1.5 text-[10px] font-normal normal-case tracking-normal" style={{ color: item.color, opacity: 0.5 }}>
                      · {item.count}
                    </span>
                  </div>
                );
              }

              const {
                order: row, isDone, recvd, total, ready, stale,
                edgeColor, pillColor, pillBg, itemsLabel, panelReadiness,
              } = item;
              const sCfg = STATUS_CONFIG[row.status];

              return (
                <Fragment key={`m-${row.id}`}>
                  {/* Tappable card row */}
                  <div
                    className={`relative border-b border-zinc-100 px-4 py-3 transition-colors${isDone ? " opacity-70" : ""}`}
                    style={{
                      borderLeft: `3px solid ${edgeColor}`,
                      backgroundColor: selectedRows.has(row.id) ? "#EFF6FF" : isDone ? "#FAFAFA" : "#FFFFFF",
                    }}
                    onClick={() => setExpandedRow((prev) => (prev === row.id ? null : row.id))}
                  >
                    {/* Line 1: checkbox + ref + caret  ·  status pill */}
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedRows.has(row.id)}
                            onChange={() => toggleRow(row.id)}
                            className="rounded"
                          />
                        </div>
                        <span className="font-mono text-xs font-semibold text-zinc-800">
                          {row.referenceNumber ?? row.id.slice(-8).toUpperCase()}
                        </span>
                        <svg
                          width="12" height="12" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2"
                          className={`shrink-0 text-zinc-400 transition-transform duration-150 ${expandedRow === row.id ? "rotate-180" : ""}`}
                          aria-hidden
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                      <span
                        className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ color: sCfg?.color ?? panelReadiness.color, backgroundColor: sCfg?.bg ?? "#F4F4F5" }}
                      >
                        {panelReadiness.text}
                      </span>
                    </div>
                    {/* Line 2: customer name + region */}
                    <div className="mb-1 flex items-center gap-2 pl-5">
                      <span className="text-xs font-medium text-zinc-900">{row.buyer.fullName}</span>
                      <span className="text-[10px] capitalize text-zinc-400">{row.region.replace(/_/g, " ")}</span>
                    </div>
                    {/* Line 3: received pill + items summary */}
                    <div className="flex flex-wrap items-center gap-2 pl-5">
                      {total > 0 ? (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{ color: pillColor, backgroundColor: pillBg }}
                        >
                          {recvd}/{total} recv
                        </span>
                      ) : null}
                      <span className="line-clamp-1 min-w-0 text-[10px] text-zinc-500">{itemsLabel}</span>
                    </div>
                    {/* Staleness flag */}
                    {stale ? (
                      <p className="mt-1 pl-5 text-[10px] font-semibold" style={{ color: "#D4450A" }}>
                        Waiting {staleAge(row)}
                      </p>
                    ) : null}
                  </div>

                  {/* Mobile expand panel — fully stacked, no inner tables */}
                  {expandedRow === row.id ? (
                    <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-4">

                      {/* Panel header */}
                      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-zinc-100 pb-3">
                        {total > 0 ? (
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ color: pillColor, backgroundColor: pillBg }}
                          >
                            {recvd} of {total} received
                          </span>
                        ) : null}
                        <span className="text-xs font-medium" style={{ color: panelReadiness.color }}>
                          {panelReadiness.text}
                        </span>
                        <span className="ml-auto font-mono text-sm font-semibold text-zinc-900">
                          {formatTTD(row.totalMinor)}
                        </span>
                      </div>

                      {/* Line items */}
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Line items</p>
                      <ul className="mb-4 flex flex-col gap-1.5">
                        {row.items.map((li) => (
                          <li key={li.id} className="flex items-start justify-between gap-3 rounded-lg border border-zinc-100 bg-white px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-zinc-800">{li.titleSnapshot}</p>
                              <p className="text-[10px] text-zinc-500">{li.store.name} · qty {li.quantity}</p>
                            </div>
                            <span className="shrink-0 font-mono text-xs text-zinc-900">
                              {formatTTD(li.priceMinor * li.quantity)}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* Vendor fulfillment */}
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Vendor fulfillment</p>
                      <div className="mb-4">
                        <VendorFulfillmentCards
                          splits={row.splitOrders}
                          onRefresh={() => setRefreshKey((k) => k + 1)}
                        />
                      </div>

                      {/* Order financials */}
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Order financials</p>
                      <div className="mb-3 space-y-2 rounded-xl border border-zinc-200 bg-white p-3 text-sm">
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
                          <span className="font-mono" style={{ color: "#D4450A" }}>{formatTTD(row.totalMinor)}</span>
                        </div>
                      </div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Customer</p>
                      <p className="text-sm font-medium text-zinc-900">{row.buyer.fullName}</p>
                      <p className="mb-4 text-sm text-zinc-500">{row.buyer.email}</p>

                    </div>
                  ) : null}
                </Fragment>
              );
            })}
          </div>

          {/* ── Desktop table (md+) ───────────────────────────────────── */}
          <div className="hidden overflow-hidden rounded-xl bg-white md:block" style={{ border: "1px solid var(--card-border)" }}>
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
                  <th className="px-5 py-3 text-left">Received</th>
                  <th className="px-5 py-3 text-left">Readiness</th>
                  <th className="px-5 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {tableItems.map((item) => {
                  if (item.kind === "header") {
                    return (
                      <tr key={`grp-${item.label}`}>
                        <td
                          colSpan={8}
                          className="border-b border-zinc-100 px-5 py-1.5"
                          style={{ backgroundColor: item.bg }}
                        >
                          <span
                            className="text-[10px] font-semibold uppercase tracking-widest"
                            style={{ color: item.color }}
                          >
                            {item.label}
                          </span>
                          {item.sublabel ? (
                            <span
                              className="ml-1 text-[10px] font-normal normal-case tracking-normal"
                              style={{ color: item.color, opacity: 0.65 }}
                            >
                              · {item.sublabel}
                            </span>
                          ) : null}
                          <span
                            className="ml-1.5 text-[10px] font-normal normal-case tracking-normal"
                            style={{ color: item.color, opacity: 0.5 }}
                          >
                            · {item.count}
                          </span>
                        </td>
                      </tr>
                    );
                  }

                  // All display values pre-computed by makeRowItem — read from item
                  const {
                    order: row, isDone, recvd, total, ready, stale,
                    edgeColor, pillColor, pillBg, itemsLabel, panelReadiness,
                  } = item;

                  return (
                    <Fragment key={row.id}>
                      <tr
                        onClick={() => setExpandedRow((prev) => (prev === row.id ? null : row.id))}
                        style={{
                          borderLeft: `3px solid ${edgeColor}`,
                          backgroundColor: selectedRows.has(row.id) ? "#EFF6FF" : isDone ? "#FAFAFA" : "#FFFFFF",
                        }}
                        className={`cursor-pointer border-b border-zinc-100 text-zinc-800 transition-colors hover:brightness-[0.985]${isDone ? " opacity-70" : ""}`}
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
                              className={`shrink-0 text-zinc-400 transition-transform duration-150 ${
                                expandedRow === row.id ? "rotate-180" : ""
                              }`}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-xs font-medium text-zinc-900">{row.buyer.fullName}</p>
                          <p className="text-[11px] text-zinc-400 capitalize">{row.region.replace(/_/g, " ")}</p>
                        </td>
                        <td className="max-w-[180px] px-3 py-3">
                          <span className="line-clamp-2 text-xs text-zinc-600">{itemsLabel}</span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-xs font-medium text-zinc-900">
                          {formatTTD(row.totalMinor)}
                        </td>
                        <td className="px-3 py-3">
                          {total === 0 ? (
                            <span className="text-xs text-zinc-300">—</span>
                          ) : (
                            <span
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                              style={{ color: pillColor, backgroundColor: pillBg }}
                            >
                              {recvd} of {total}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {isDone ? (
                            <span className="text-xs text-zinc-400">
                              {STATUS_CONFIG[row.status]?.label ?? row.status}
                            </span>
                          ) : row.status === "SHIPPED" ? (
                            <span className="text-xs font-medium" style={{ color: "#1A7FB5" }}>
                              Dispatched
                            </span>
                          ) : row.status === "CUSTOMER_RECEIVED" ? (
                            <span className="text-xs font-medium" style={{ color: "#1A7FB5" }}>
                              With customer
                            </span>
                          ) : stale ? (
                            <span className="text-xs font-semibold" style={{ color: "#D4450A" }}>
                              Waiting {staleAge(row)}
                            </span>
                          ) : ready && ACTION_STATUSES.has(row.status) ? (
                            // ACTION group only (READY_TO_SHIP / PACKING_COMPLETE)
                            <span className="text-xs font-medium" style={{ color: "#1B8C5A" }}>
                              Ready to bundle
                            </span>
                          ) : ready &&
                            row.splitOrders.some((s) =>
                              ["COURIER_ASSIGNED", "COURIER_PICKED_UP"].includes(s.status),
                            ) ? (
                            // All splits left the vendor, but at least one is still in transit
                            <span className="text-xs font-medium" style={{ color: "#E8820C" }}>
                              In transit to warehouse
                            </span>
                          ) : ready ? (
                            // All splits are VENDOR_DROPPED_OFF or AT_WAREHOUSE+ but
                            // admin hasn't formally checked them in yet (markItemsReceivedAtWarehouse)
                            <span className="text-xs font-medium" style={{ color: "#E8820C" }}>
                              Awaiting check-in
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-500">
                              {total - recvd === 1
                                ? "Awaiting vendor"
                                : `Waiting on ${total - recvd} vendors`}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right text-xs text-zinc-500">
                          {relativeTime(row.createdAt)}
                        </td>
                      </tr>
                      {expandedRow === row.id ? (
                        <tr className="border-b border-zinc-200 bg-zinc-50">
                          <td colSpan={8} className="px-6 py-5">

                            {/* ── Panel header ────────────────────────────────── */}
                            <div className="mb-4 flex items-center gap-3 border-b border-zinc-100 pb-3">
                              {total > 0 ? (
                                <span
                                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                                  style={{ color: pillColor, backgroundColor: pillBg }}
                                >
                                  {recvd} of {total} received
                                </span>
                              ) : null}
                              <span className="text-xs font-medium" style={{ color: panelReadiness.color }}>
                                {panelReadiness.text}
                              </span>
                              <span className="ml-auto font-mono text-sm font-semibold text-zinc-900">
                                {formatTTD(row.totalMinor)}
                              </span>
                            </div>

                            {/* ── Main grid ───────────────────────────────────── */}
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                              {/* Line items */}
                              <div>
                                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                                  Line items
                                </p>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-zinc-200">
                                      <th className="py-1.5 text-left text-zinc-400">Item</th>
                                      <th className="py-1.5 text-left text-zinc-400">Store</th>
                                      <th className="py-1.5 text-center text-zinc-400">Qty</th>
                                      <th className="py-1.5 text-right text-zinc-400">Total</th>
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

                              {/* Vendor fulfillment */}
                              <div>
                                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                                  Vendor fulfillment
                                </p>
                                <VendorFulfillmentCards
                                  splits={row.splitOrders}
                                  onRefresh={() => setRefreshKey((k) => k + 1)}
                                />
                              </div>

                              {/* Order financials + customer */}
                              <div>
                                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
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
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
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
        </>
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
                    await updateOrderStatus(Array.from(selectedRows), bulkAction);
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
                  backgroundColor: bulkAction === "CANCELLED" ? "#DC2626" : "#D4450A",
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
