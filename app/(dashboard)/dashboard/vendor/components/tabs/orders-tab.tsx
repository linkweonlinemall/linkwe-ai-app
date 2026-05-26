"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";

import EmptyState from "@/components/ui/empty-state";

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

const CARD_BORDER = "border-[0.5px] border-[rgba(28,28,26,0.12)]";

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

/** Compact pills aligned with dashboard overview palette */
function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "AWAITING_VENDOR_ACTION":
      return {
        label: "Action Required",
        className: "bg-[#FAEEDA] text-[#854F0B]",
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

export default function OrdersTab({ splitOrders }: Props) {
  if (splitOrders.length === 0) {
    return (
      <div className={`overflow-hidden rounded-[12px] bg-white ${CARD_BORDER}`}>
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
    const region = order.mainOrder.region?.replace(/_/g, " ") ?? "—";

    return (
      <div key={order.id} className={`overflow-hidden rounded-[12px] bg-white ${CARD_BORDER}`}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-[14px] md:flex-nowrap">
          {/* Order # + date */}
          <div className="min-w-[7.5rem] shrink-0">
            <p className="text-[12px] font-medium tabular-nums text-[#1C1C1A]">{ref}</p>
            <p className="mt-0.5 text-[10px] text-[#7c7b77]">{formatDate(order.createdAt)}</p>
          </div>

          {/* Items (one line) + count badge */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-[12px] text-[#1C1C1A]" title={order.items.map((i) => i.titleSnapshot).join(", ")}>
              {primary}
            </p>
            {order.items.length > 1 ? (
              <span className="shrink-0 rounded-md bg-[#F7F5F2] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[#45443f]">
                {order.items.length}
              </span>
            ) : null}
          </div>

          {/* Region + order value */}
          <div className="shrink-0 text-[12px] md:text-right">
            <p className="truncate capitalize text-[#1C1C1A]">{region}</p>
            <p className="font-medium tabular-nums text-[#1C1C1A]">{formatMinor(order.subtotalMinor)}</p>
          </div>

          {/* Status + View */}
          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
              {badge.label}
            </span>
            <Link
              href={`/dashboard/vendor/orders/${order.id}`}
              className="whitespace-nowrap rounded-lg border border-[rgba(28,28,26,0.12)] px-2.5 py-1 text-[11px] font-semibold text-[#1C1C1A] transition-colors hover:bg-[#F7F5F2]"
            >
              View order
            </Link>
          </div>
        </div>

        {order.status === "AWAITING_VENDOR_ACTION" ? (
          <div
            className="flex h-8 items-center gap-2 border-t border-[rgba(133,79,11,0.15)] px-4"
            style={{ backgroundColor: "#FAEEDA" }}
          >
            <span className="min-w-0 truncate text-[10px] font-medium leading-none text-[#854F0B]">
              Action required — choose fulfillment
            </span>
            <Link
              href={`/dashboard/vendor/orders/${order.id}`}
              className="ml-auto shrink-0 text-[11px] font-semibold leading-none text-[#D4450A] underline-offset-2 hover:underline"
            >
              Take action
            </Link>
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
        <div className="flex flex-col gap-2">{orders.map(renderOrderCard)}</div>
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
