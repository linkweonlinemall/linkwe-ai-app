"use client";

import Link from "next/link";

export type SplitOrderItem = {
  id: string;
  titleSnapshot: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
};

export type VendorSplitOrder = {
  id: string;
  mainOrderId: string;
  status: string;
  subtotalMinor: number;
  currency: string;
  createdAt: Date | string;
  pickupRegion: string | null;
  vendorInboundMethod: string | null;
  items: SplitOrderItem[];
  mainOrder: {
    region: string;
    buyer: { fullName: string };
  };
};

type Props = {
  splitOrders: VendorSplitOrder[];
};

function formatMinor(minor: number): string {
  return `TTD ${(minor / 100).toFixed(2)}`;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-TT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "AWAITING_VENDOR_ACTION":
      return { label: "Action Required", className: "bg-red-50 text-red-700 border border-red-200" };
    case "VENDOR_PREPARING":
      return { label: "Preparing", className: "bg-amber-50 text-amber-700 border border-amber-200" };
    case "AWAITING_COURIER_PICKUP":
      return { label: "Awaiting Courier", className: "bg-blue-50 text-blue-700 border border-blue-200" };
    case "COURIER_ASSIGNED":
      return { label: "Courier Assigned", className: "bg-blue-50 text-blue-700 border border-blue-200" };
    case "COURIER_PICKED_UP":
      return { label: "Courier Picked Up", className: "bg-blue-50 text-blue-700 border border-blue-200" };
    case "VENDOR_DROPPED_OFF":
      return { label: "Dropped Off", className: "bg-blue-50 text-blue-700 border border-blue-200" };
    case "AT_WAREHOUSE":
      return { label: "At Warehouse", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    case "DISPATCHED":
      return { label: "Dispatched", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    case "DELIVERED":
      return { label: "Delivered", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    default:
      return { label: status, className: "bg-zinc-100 text-zinc-600 border border-zinc-200" };
  }
}

export default function OrdersTab({ splitOrders }: Props) {
  if (splitOrders.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200/60 bg-white p-12 text-center shadow-sm">
        <p className="text-lg font-semibold text-zinc-900">No orders yet</p>
        <p className="mt-2 text-sm text-zinc-500">
          When customers purchase your products, orders will appear here.
        </p>
      </div>
    );
  }

  const actionRequired = splitOrders.filter((o) => o.status === "AWAITING_VENDOR_ACTION");
  const inProgress = splitOrders.filter((o) =>
    ["VENDOR_PREPARING", "AWAITING_COURIER_PICKUP", "COURIER_ASSIGNED", "COURIER_PICKED_UP", "VENDOR_DROPPED_OFF"].includes(
      o.status,
    ),
  );
  const completed = splitOrders.filter((o) => ["AT_WAREHOUSE", "DISPATCHED", "DELIVERED"].includes(o.status));

  function renderOrderCard(order: VendorSplitOrder) {
    const badge = getStatusBadge(order.status);
    return (
      <div key={order.id} className="rounded-xl border border-zinc-200/60 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              Order #LW-{order.mainOrderId.slice(-8).toUpperCase()}
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">{formatDate(order.createdAt)}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}>{badge.label}</span>
            <a
              href={`/api/vendor-invoice/${order.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Invoice
            </a>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Items</p>
            <div className="flex flex-col gap-1">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-xs">
                  <span className="max-w-[150px] truncate text-zinc-700">{item.titleSnapshot}</span>
                  <span className="ml-2 text-zinc-500">×{item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Details</p>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Customer region</span>
                <span className="font-medium capitalize text-zinc-700">
                  {order.mainOrder.region?.replace(/_/g, " ") ?? "—"}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Order value</span>
                <span className="font-medium text-zinc-700">{formatMinor(order.subtotalMinor)}</span>
              </div>
              {order.vendorInboundMethod ? (
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Fulfillment</span>
                  <span className="font-medium text-zinc-700">
                    {order.vendorInboundMethod === "VENDOR_DROPOFF" ? "Drop off" : "Courier pickup"}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <a
            href={`/dashboard/vendor/orders/${order.id}`}
            className="text-sm text-zinc-600 transition-colors hover:text-zinc-900"
          >
            View order →
          </a>
        </div>

        {order.status === "AWAITING_VENDOR_ACTION" ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <span className="text-sm text-amber-600">⚠</span>
            <p className="min-w-0 flex-1 text-xs font-medium text-amber-700">
              Action required — choose how you will fulfill this order
            </p>
            <Link
              href={`/dashboard/vendor/orders/${order.id}`}
              className="ml-auto inline-flex shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: "#D4450A" }}
            >
              Take action →
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {actionRequired.length > 0 ? (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-red-600">
            Action Required ({actionRequired.length})
          </p>
          <div className="flex flex-col gap-4">{actionRequired.map(renderOrderCard)}</div>
        </div>
      ) : null}

      {inProgress.length > 0 ? (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            In Progress ({inProgress.length})
          </p>
          <div className="flex flex-col gap-4">{inProgress.map(renderOrderCard)}</div>
        </div>
      ) : null}

      {completed.length > 0 ? (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Completed ({completed.length})
          </p>
          <div className="flex flex-col gap-4">{completed.map(renderOrderCard)}</div>
        </div>
      ) : null}
    </div>
  );
}
