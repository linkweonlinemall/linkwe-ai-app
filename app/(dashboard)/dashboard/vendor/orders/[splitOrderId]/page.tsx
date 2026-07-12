import type { CSSProperties } from "react";
import type { StoreShippingMode } from "@prisma/client";
import { redirect } from "next/navigation";

import {
  markReadyForLinkWe,
  markShipped,
  startPreparing,
} from "@/app/actions/fulfillment";
import { getSession } from "@/lib/auth/session";
import { calculateEarningsMinor, getCommissionRate } from "@/lib/finance/commission";
import { resolveVendorPlan } from "@/lib/finance/vendor-plan";
import { getCourierPickupFeeMinor } from "@/lib/fulfillment/courier-pickup-rates";
import { prisma } from "@/lib/prisma";
import { getSplitProgressSteps, getSplitStepIndex } from "@/lib/orders/split-progress";
import { vendorSplitOrderDetailSelect } from "@/lib/vendor/vendor-split-order-query";
import { MessageCustomerButton } from "./message-customer-button";

type Props = { params: Promise<{ splitOrderId: string }> };

const SCARLET = "#D4450A";
const EMERALD = "#059669";

function getStatusBadge(status: string): { label: string; style: CSSProperties } {
  const pill = {
    display: "inline-flex" as const,
    alignItems: "center" as const,
    borderRadius: "9999px",
    borderWidth: "1px",
    borderStyle: "solid" as const,
    padding: "0.25rem 0.75rem",
    fontSize: "0.75rem",
    fontWeight: 600,
  };
  switch (status) {
    case "AWAITING_VENDOR_ACTION":
      return {
        label: "Action Required",
        style: { ...pill, backgroundColor: "#FEF2F2", color: "#B91C1C", borderColor: "#FECACA" },
      };
    case "PREPARING":
    case "VENDOR_PREPARING":
      return {
        label: "Preparing",
        style: { ...pill, backgroundColor: "#FFFBEB", color: "#B45309", borderColor: "#FDE68A" },
      };
    case "SHIPPED":
    case "OUT_FOR_DELIVERY":
      return {
        label: "Out for delivery",
        style: { ...pill, backgroundColor: "#EFF6FF", color: "#1D4ED8", borderColor: "#BFDBFE" },
      };
    case "READY_FOR_LINKWE":
      return {
        label: "Ready for LinkWe",
        style: { ...pill, backgroundColor: "#EFF6FF", color: "#1D4ED8", borderColor: "#BFDBFE" },
      };
    case "AWAITING_COURIER_PICKUP":
    case "COURIER_ASSIGNED":
    case "COURIER_PICKED_UP":
    case "VENDOR_DROPPED_OFF":
      return {
        label:
          status === "AWAITING_COURIER_PICKUP"
            ? "Awaiting Courier"
            : status === "COURIER_ASSIGNED"
              ? "Courier Assigned"
              : status === "COURIER_PICKED_UP"
                ? "Courier Picked Up"
                : "Dropped Off",
        style: { ...pill, backgroundColor: "#EFF6FF", color: "#1D4ED8", borderColor: "#BFDBFE" },
      };
    case "AT_WAREHOUSE":
    case "PACKAGED":
    case "BUNDLED_FOR_DISPATCH":
    case "DISPATCHED":
      return {
        label:
          status === "AT_WAREHOUSE"
            ? "At Warehouse"
            : status === "PACKAGED"
              ? "Packaged"
              : status === "BUNDLED_FOR_DISPATCH"
                ? "Bundled"
                : "Dispatched",
        style: { ...pill, backgroundColor: "#ECFDF5", color: "#047857", borderColor: "#A7F3D0" },
      };
    case "DELIVERED":
    case "COMPLETED":
      return {
        label: status === "COMPLETED" ? "Completed" : "Delivered",
        style: { ...pill, backgroundColor: "#ECFDF5", color: "#047857", borderColor: "#A7F3D0" },
      };
    default:
      return {
        label: status.replace(/_/g, " "),
        style: { ...pill, backgroundColor: "#F4F4F5", color: "#52525B", borderColor: "#E4E4E7" },
      };
  }
}

function formatMinor(minor: number): string {
  return `TTD ${(minor / 100).toFixed(2)}`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-TT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatRegion(region: string): string {
  return region.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function lineItemImageUrl(imageUrl: string | null | undefined): string | null {
  const url = imageUrl?.trim();
  return url ? url : null;
}

function LineItemThumbnail({ imageUrl, alt }: { imageUrl: string | null; alt: string }) {
  return (
    <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote Cloudinary / listing URLs
        <img src={imageUrl} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full" aria-hidden />
      )}
    </div>
  );
}

export default async function VendorOrderDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "VENDOR") redirect("/");

  const { splitOrderId } = await params;

  const splitOrder = await prisma.splitOrder.findFirst({
    where: {
      id: splitOrderId,
      store: { ownerId: session.userId },
    },
    select: vendorSplitOrderDetailSelect,
  });

  if (!splitOrder) redirect("/dashboard/vendor");

  const shippingMode = splitOrder.store.shippingMode;
  const badge = getStatusBadge(splitOrder.status);
  const splitRef = `SP-${splitOrder.id.slice(-8).toUpperCase()}`;
  const mainRef = `LW-${splitOrder.mainOrderId.slice(-8).toUpperCase()}`;
  const flowSteps = getSplitProgressSteps(shippingMode, "vendor");
  const stepIndex = getSplitStepIndex(splitOrder.status, shippingMode);
  const plan = resolveVendorPlan(splitOrder.store.subscriptionPlan);
  const { commissionMinor, netMinor: netAfterCommission } = calculateEarningsMinor(
    splitOrder.subtotalMinor,
    "product",
    plan,
  );
  const commissionRatePct = Math.round(getCommissionRate("product", plan) * 100);
  const pickupFeeMinor =
    splitOrder.vendorInboundMethod === "PICKUP_REQUESTED"
      ? getCourierPickupFeeMinor(splitOrder.store.region ?? "", 1)
      : 0;
  const netEarningsMinor = netAfterCommission - pickupFeeMinor;

  const showStartPreparing = splitOrder.status === "AWAITING_VENDOR_ACTION";
  const showMarkShipped = splitOrder.status === "PREPARING" && shippingMode === "SELF";
  const showMarkReadyForLinkWe = splitOrder.status === "PREPARING" && shippingMode === "LINKWE";
  const showShippedPanel = splitOrder.status === "SHIPPED";
  const showReadyForLinkWePanel = splitOrder.status === "READY_FOR_LINKWE";
  const showOutForDeliveryPanel = splitOrder.status === "OUT_FOR_DELIVERY";
  const showDeliveredPanel = splitOrder.status === "DELIVERED" || splitOrder.status === "COMPLETED";

  return (
    <div className="bg-[#f5f5f5] pb-24 sm:pb-0">
      <div className="max-w-4xl mx-auto px-6 py-6">
        <a
          href="/dashboard/vendor/orders"
          className="mb-4 inline-flex items-center gap-1 text-xs hover:underline"
          style={{ color: "var(--blue)" }}
        >
          ← Back to dashboard
        </a>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              {splitRef}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">Main order: {mainRef}</p>
            <p className="mt-1 text-sm text-zinc-600">Placed {formatDate(splitOrder.mainOrder.createdAt)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span style={badge.style}>{badge.label}</span>
              <span
                className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                style={{
                  backgroundColor: shippingMode === "SELF" ? "#FFF7ED" : "#EFF6FF",
                  color: shippingMode === "SELF" ? "#C2410C" : "#1D4ED8",
                  borderColor: shippingMode === "SELF" ? "#FED7AA" : "#BFDBFE",
                }}
              >
                {shippingMode === "SELF" ? "You deliver this order" : "LinkWe delivers this order"}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <a
              href={`/api/vendor-invoice/${splitOrderId}`}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
            >
              Download Invoice
            </a>
          </div>
        </div>

        <div
          className="mt-8 rounded-xl bg-white p-5 sm:p-6"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Your progress
          </h2>
          <div className="flex flex-wrap items-start justify-between gap-2">
            {flowSteps.map((label, i) => {
              const isPast = i < stepIndex;
              const isCurrent = i === stepIndex;
              return (
                <div key={label} className="flex min-w-[72px] flex-1 flex-col items-center text-center">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: isCurrent ? SCARLET : isPast ? EMERALD : "#f4f4f5",
                      color: isCurrent || isPast ? "#fff" : "#a1a1aa",
                    }}
                  >
                    {isPast ? "✓" : i + 1}
                  </div>
                  <p
                    className="mt-2 text-[10px] font-medium leading-tight sm:text-xs"
                    style={{ color: isCurrent ? SCARLET : isPast ? EMERALD : "#a1a1aa" }}
                  >
                    {label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div
              className="rounded-xl bg-white p-5 sm:p-6"
              style={{ border: "1px solid var(--card-border)" }}
            >
              <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Items
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-400">
                      <th className="pb-2 pr-2 font-medium">Item</th>
                      <th className="pb-2 pr-2 font-medium">Qty</th>
                      <th className="pb-2 pr-2 text-right font-medium">Unit</th>
                      <th className="pb-2 text-right font-medium">Line</th>
                    </tr>
                  </thead>
                  <tbody>
                    {splitOrder.items.map((item) => {
                      const imageUrl = lineItemImageUrl(item.listing?.imageUrl);
                      return (
                      <tr key={item.id} className="border-b border-zinc-100">
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-2">
                            <LineItemThumbnail imageUrl={imageUrl} alt={item.titleSnapshot} />
                            <span className="font-medium text-zinc-900">{item.titleSnapshot}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-2 text-zinc-600">{item.quantity}</td>
                        <td className="py-2 pr-2 text-right text-zinc-600">{formatMinor(item.unitPriceMinor)}</td>
                        <td className="py-2 text-right font-medium text-zinc-900">{formatMinor(item.lineTotalMinor)}</td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end border-t border-zinc-100 pt-4">
                <p className="text-sm font-semibold text-zinc-900">Subtotal {formatMinor(splitOrder.subtotalMinor)}</p>
              </div>
            </div>

            {showStartPreparing ? (
              <div
                className="rounded-xl bg-white p-5 sm:p-6"
                style={{ border: "1px solid var(--card-border)" }}
              >
                <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Fulfillment
                </h2>
                <p className="mb-4 text-sm text-zinc-600">
                  Confirm you&apos;ve received this order and are packing it.
                </p>
                <form action={startPreparing}>
                  <input type="hidden" name="splitOrderId" value={splitOrder.id} />
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
                    style={{ backgroundColor: SCARLET }}
                  >
                    Start preparing
                  </button>
                </form>
              </div>
            ) : null}

            {showMarkShipped ? (
              <div
                className="rounded-xl bg-white p-5 sm:p-6"
                style={{ border: "1px solid var(--card-border)" }}
              >
                <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Fulfillment
                </h2>
                <p className="mb-4 text-sm text-zinc-600">
                  Mark when the order is out for delivery to the customer.
                </p>
                <form action={markShipped}>
                  <input type="hidden" name="splitOrderId" value={splitOrder.id} />
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
                    style={{ backgroundColor: SCARLET }}
                  >
                    Mark as shipped
                  </button>
                </form>
              </div>
            ) : null}

            {showMarkReadyForLinkWe ? (
              <div
                className="rounded-xl bg-white p-5 sm:p-6"
                style={{ border: "1px solid var(--card-border)" }}
              >
                <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Fulfillment
                </h2>
                <p className="mb-4 text-sm text-zinc-600">
                  LinkWe will collect this order and handle delivery.
                </p>
                <form action={markReadyForLinkWe}>
                  <input type="hidden" name="splitOrderId" value={splitOrder.id} />
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
                    style={{ backgroundColor: SCARLET }}
                  >
                    Mark ready for LinkWe pickup
                  </button>
                </form>
              </div>
            ) : null}

            {showShippedPanel ? (
              <div
                className="rounded-xl bg-white p-5 sm:p-6"
                style={{ border: "1px solid var(--card-border)" }}
              >
                <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Fulfillment
                </h2>
                <p className="text-sm text-zinc-600">
                  Out for delivery — waiting for the customer to confirm receipt.
                </p>
              </div>
            ) : null}

            {showReadyForLinkWePanel ? (
              <div
                className="rounded-xl bg-white p-5 sm:p-6"
                style={{ border: "1px solid var(--card-border)" }}
              >
                <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Fulfillment
                </h2>
                <p className="text-sm text-zinc-600">
                  Ready for LinkWe. We&apos;ll collect and deliver it.
                </p>
              </div>
            ) : null}

            {showOutForDeliveryPanel ? (
              <div
                className="rounded-xl bg-white p-5 sm:p-6"
                style={{ border: "1px solid var(--card-border)" }}
              >
                <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Fulfillment
                </h2>
                <p className="text-sm text-zinc-600">LinkWe is delivering this order.</p>
              </div>
            ) : null}

            {showDeliveredPanel ? (
              <div
                className="rounded-xl bg-white p-5 sm:p-6"
                style={{ border: "1px solid var(--card-border)" }}
              >
                <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Fulfillment
                </h2>
                <p className="text-sm text-zinc-600">
                  {splitOrder.status === "COMPLETED" ? "Order completed." : "Delivered to the customer."}
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-6 lg:col-span-1">
            <div
              className="rounded-xl bg-white p-5 sm:p-6"
              style={{ border: "1px solid var(--card-border)" }}
            >
              <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Order summary
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Vendor subtotal</dt>
                  <dd className="font-medium text-zinc-900">{formatMinor(splitOrder.subtotalMinor)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Shipping</dt>
                  <dd className="font-medium text-zinc-900">{formatMinor(splitOrder.shippingMinor)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Commission ({commissionRatePct}%)</dt>
                  <dd className="font-medium text-zinc-700">−{formatMinor(commissionMinor)}</dd>
                </div>
                {pickupFeeMinor > 0 ? (
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Courier pickup fee</dt>
                    <dd className="font-medium text-zinc-700">−{formatMinor(pickupFeeMinor)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-zinc-100 pt-3">
                  <dt className="font-semibold text-zinc-900">Net earnings</dt>
                  <dd className="font-semibold" style={{ color: EMERALD }}>
                    {formatMinor(netEarningsMinor)}
                  </dd>
                </div>
              </dl>
            </div>

            <div
              className="rounded-xl bg-white p-5 sm:p-6"
              style={{ border: "1px solid var(--card-border)" }}
            >
              <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Customer
              </h2>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-zinc-500">Name</dt>
                  <dd className="font-medium text-zinc-900">{splitOrder.mainOrder.buyer.fullName}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Email</dt>
                  <dd className="text-zinc-700">{splitOrder.mainOrder.buyer.email}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Delivery region</dt>
                  <dd className="font-medium text-zinc-900">{formatRegion(splitOrder.mainOrder.region)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Order placed</dt>
                  <dd className="text-zinc-700">{formatDate(splitOrder.mainOrder.createdAt)}</dd>
                </div>
              </dl>
            </div>

            <div
              className="rounded-xl bg-white p-5 sm:p-6"
              style={{ border: "1px solid var(--card-border)" }}
            >
              <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Main order
              </h2>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-zinc-500">Reference</dt>
                  <dd className="font-mono font-medium text-zinc-900">{mainRef}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Status</dt>
                  <dd className="font-medium capitalize text-zinc-900">
                    {splitOrder.mainOrder.status.replace(/_/g, " ").toLowerCase()}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Vendors in this order</dt>
                  <dd className="font-medium text-zinc-900">{splitOrder.mainOrder._count.splitOrders}</dd>
                </div>
              </dl>
            </div>

            <div
              className="rounded-xl bg-white p-5 sm:p-6"
              style={{ border: "1px solid var(--card-border)" }}
            >
              <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Quick actions
              </h2>
              <div className="flex flex-col gap-2">
                <a
                  href={`/api/vendor-invoice/${splitOrderId}`}
                  className="inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: SCARLET }}
                >
                  Download Invoice
                </a>
                <MessageCustomerButton
                  customerId={splitOrder.mainOrder.buyer.id}
                  storeId={splitOrder.storeId}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
