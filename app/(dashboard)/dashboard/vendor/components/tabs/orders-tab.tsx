"use client";

import Link from "next/link";
import { ClipboardList, MapPin } from "lucide-react";

import EmptyState from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format/format-display-date-utc";

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

const CARD_CLASS =
  "rounded-xl border border-[rgba(28,28,26,0.08)] bg-white p-4 shadow-sm";

const VIEW_ORDER_LINK_CLASS = "text-sm font-medium text-[#1C1C1A] hover:underline";

function formatMinor(minor: number): string {
  return `TTD ${(minor / 100).toFixed(2)}`;
}

function formatRegion(region: string): string {
  return region.replace(/_/g, " ");
}

function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "AWAITING_VENDOR_ACTION":
      return {
        label: "Action Required",
        className: "bg-[#D4450A] text-white",
      };
    case "VENDOR_PREPARING":
      return {
        label: "Preparing",
        className: "bg-[#FAEEDA] text-[#854F0B]",
      };
    case "AWAITING_COURIER_PICKUP":
    case "COURIER_ASSIGNED":
    case "COURIER_PICKED_UP":
    case "VENDOR_DROPPED_OFF":
      return {
        label:
          status === "AWAITING_COURIER_PICKUP"
            ? "Awaiting courier"
            : status === "COURIER_ASSIGNED"
              ? "Courier assigned"
              : status === "COURIER_PICKED_UP"
                ? "Picked up"
                : "Dropped off",
        className: "bg-[#E6F1FB] text-[#185FA5]",
      };
    case "AT_WAREHOUSE":
    case "PACKAGED":
    case "BUNDLED_FOR_DISPATCH":
      return {
        label: status === "AT_WAREHOUSE" ? "At warehouse" : status === "PACKAGED" ? "Packaged" : "Bundled",
        className: "bg-[#EAF3DE] text-[#3B6D11]",
      };
    case "DISPATCHED":
    case "DELIVERED":
      return {
        label: status === "DELIVERED" ? "Delivered" : "Dispatched",
        className: "bg-[#EAF3DE] text-[#3B6D11]",
      };
    default:
      return {
        label: status.replace(/_/g, " "),
        className: "bg-[#F7F5F2] text-[#45443f]",
      };
  }
}

function primaryItemTitle(order: VendorSplitOrder): string {
  return order.items[0]?.titleSnapshot ?? "Order";
}

function totalItemQuantity(order: VendorSplitOrder): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

export default function OrdersTab({ splitOrders }: Props) {
  if (splitOrders.length === 0) {
    return (
      <div className={CARD_CLASS}>
        <EmptyState
          icon={<ClipboardList strokeWidth={1.25} className="text-current" />}
          title="No orders yet"
          description="Your first sale is on its way. Make sure your store profile is complete."
          actionLabel="Complete profile"
          actionHref="/dashboard/vendor?tab=store"
        />
      </div>
    );
  }

  const actionRequired = splitOrders.filter((o) => o.status === "AWAITING_VENDOR_ACTION");
  const inProgress = splitOrders.filter((o) =>
    ["VENDOR_PREPARING", "AWAITING_COURIER_PICKUP", "COURIER_ASSIGNED", "COURIER_PICKED_UP", "VENDOR_DROPPED_OFF"].includes(
      o.status,
    ),
  );
  const completed = splitOrders.filter((o) =>
    ["AT_WAREHOUSE", "PACKAGED", "BUNDLED_FOR_DISPATCH", "DISPATCHED", "DELIVERED"].includes(o.status),
  );

  function renderOrderCard(order: VendorSplitOrder) {
    const badge = getStatusBadge(order.status);
    const ref = `#LW-${order.mainOrderId.slice(-8).toUpperCase()}`;
    const primary = primaryItemTitle(order);
    const region = formatRegion(order.mainOrder.region ?? "—");
    const qty = totalItemQuantity(order);
    const needsAction = order.status === "AWAITING_VENDOR_ACTION";
    const orderHref = `/dashboard/vendor/orders/${order.id}`;

    return (
      <div key={order.id} className={CARD_CLASS}>
        <div className="flex items-start gap-4">
          {/* Column 1 — ref + date */}
          <div className="w-40 shrink-0">
            <p className="font-mono text-sm font-semibold text-[#1C1C1A]">{ref}</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{formatDate(order.createdAt)}</p>
          </div>

          {/* Column 2 — product */}
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <p
              className="min-w-0 truncate font-medium text-[#1C1C1A]"
              title={order.items.map((i) => i.titleSnapshot).join(", ")}
            >
              {primary}
            </p>
            {qty > 1 ? (
              <span className="shrink-0 rounded-full bg-[#F7F5F2] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[#7c7b77]">
                x{qty}
              </span>
            ) : null}
          </div>

          {/* Column 3 — location, amount, status, view (non-action) */}
          <div className="flex w-48 shrink-0 flex-col items-end gap-1.5 text-right">
            <p className="flex items-center justify-end gap-1 text-sm capitalize text-[var(--text-muted)]">
              <MapPin size={12} className="shrink-0" strokeWidth={2} aria-hidden />
              <span className="min-w-0 truncate">{region}</span>
            </p>
            <p className="font-semibold tabular-nums text-[#1C1C1A]">{formatMinor(order.subtotalMinor)}</p>
            <span
              className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${badge.className}`}
            >
              {badge.label}
            </span>
            {!needsAction ? (
              <Link href={orderHref} className={VIEW_ORDER_LINK_CLASS}>
                View order
              </Link>
            ) : null}
          </div>
        </div>

        {needsAction ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-[#FFF8F0] px-4 py-2">
            <p className="min-w-0 text-sm text-[var(--text-muted)]">Action required — choose fulfilment</p>
            <div className="flex shrink-0 items-center gap-3">
              <Link
                href={orderHref}
                className="text-sm font-medium text-[var(--scarlet)] hover:underline"
              >
                Take action
              </Link>
              <Link href={orderHref} className={VIEW_ORDER_LINK_CLASS}>
                View order
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  function section(title: string, titleClass: string, orders: VendorSplitOrder[]) {
    return (
      <div>
        <p className={`mb-2 text-[10px] font-semibold uppercase tracking-wide ${titleClass}`}>
          {title} ({orders.length})
        </p>
        <div className="flex flex-col gap-3">{orders.map(renderOrderCard)}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {actionRequired.length > 0 ? section("Action required", "text-red-600", actionRequired) : null}
      {inProgress.length > 0 ? section("In progress", "text-[#7c7b77]", inProgress) : null}
      {completed.length > 0 ? section("Completed", "text-[#7c7b77]", completed) : null}
    </div>
  );
}
