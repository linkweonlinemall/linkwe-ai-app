import type { CSSProperties } from "react";
import { redirect } from "next/navigation";

import { chooseCourierPickup, chooseVendorDropoff } from "@/app/actions/fulfillment";
import { getSession } from "@/lib/auth/session";
import { getCourierPickupFee } from "@/lib/fulfillment/courier-pickup-rates";
import { calculateCommissionMinor, calculateVendorNetMinor } from "@/lib/platform/commission";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ splitOrderId: string }> };

const SCARLET = "#D4450A";
const EMERALD = "#059669";

const VENDOR_FLOW_STEPS = [
  "Action",
  "Preparing",
  "At warehouse",
  "Packaged",
  "Dispatched",
  "Delivered",
] as const;

function getVendorStepIndex(status: string): number {
  switch (status) {
    case "AWAITING_VENDOR_ACTION":
      return 0;
    case "VENDOR_PREPARING":
    case "AWAITING_COURIER_PICKUP":
    case "COURIER_ASSIGNED":
    case "COURIER_PICKED_UP":
    case "VENDOR_DROPPED_OFF":
      return 1;
    case "AT_WAREHOUSE":
      return 2;
    case "PACKAGED":
      return 3;
    case "BUNDLED_FOR_DISPATCH":
    case "DISPATCHED":
      return 4;
    case "DELIVERED":
      return 5;
    default:
      return 0;
  }
}

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
    case "VENDOR_PREPARING":
      return {
        label: "Preparing",
        style: { ...pill, backgroundColor: "#FFFBEB", color: "#B45309", borderColor: "#FDE68A" },
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
    case "DELIVERED":
      return {
        label:
          status === "AT_WAREHOUSE"
            ? "At Warehouse"
            : status === "PACKAGED"
              ? "Packaged"
              : status === "BUNDLED_FOR_DISPATCH"
                ? "Bundled"
                : status === "DISPATCHED"
                  ? "Dispatched"
                  : "Delivered",
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
    include: {
      store: {
        select: {
          name: true,
          region: true,
          address: true,
          logoUrl: true,
        },
      },
      items: {
        select: {
          id: true,
          titleSnapshot: true,
          quantity: true,
          unitPriceMinor: true,
          lineTotalMinor: true,
        },
      },
      mainOrder: {
        select: {
          id: true,
          referenceNumber: true,
          status: true,
          region: true,
          shippingMinor: true,
          totalMinor: true,
          createdAt: true,
          buyer: {
            select: { fullName: true, email: true },
          },
          _count: {
            select: { splitOrders: true },
          },
        },
      },
      inboundShipment: {
        select: {
          id: true,
          shipmentStatus: true,
          region: true,
          claimedAt: true,
          pickedUpAt: true,
          courierId: true,
          courier: {
            select: { fullName: true, region: true, phone: true },
          },
        },
      },
    },
  });

  if (!splitOrder) redirect("/dashboard/vendor");

  const badge = getStatusBadge(splitOrder.status);
  const splitRef = splitOrder.referenceNumber ?? `SP-${splitOrder.id.slice(-8).toUpperCase()}`;
  const mainRef =
    splitOrder.mainOrder.referenceNumber ?? `LW-${splitOrder.mainOrderId.slice(-8).toUpperCase()}`;
  const stepIndex = getVendorStepIndex(splitOrder.status);
  const commissionMinor = calculateCommissionMinor(splitOrder.subtotalMinor);
  const netAfterCommission = calculateVendorNetMinor(splitOrder.subtotalMinor);
  const pickupFeeMinor =
    splitOrder.vendorInboundMethod === "PICKUP_REQUESTED"
      ? Math.round(getCourierPickupFee(splitOrder.store.region ?? "") * 100)
      : 0;
  const netEarningsMinor = netAfterCommission - pickupFeeMinor;

  const showFulfillmentChoice = splitOrder.status === "AWAITING_VENDOR_ACTION";
  const showCourierAssigned = Boolean(splitOrder.inboundShipment?.courierId && splitOrder.inboundShipment.courier);
  const showCourierWaiting =
    splitOrder.status === "AWAITING_COURIER_PICKUP" && !splitOrder.inboundShipment?.courierId;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="max-w-4xl mx-auto px-6 py-6">
        <a
          href="/dashboard/vendor"
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
            <div className="mt-3">
              <span style={badge.style}>{badge.label}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <a
              href={`/api/vendor-invoice/${splitOrderId}`}
              target="_blank"
              rel="noopener noreferrer"
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
            {VENDOR_FLOW_STEPS.map((label, i) => {
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
                    {splitOrder.items.map((item) => (
                      <tr key={item.id} className="border-b border-zinc-100">
                        <td className="py-2 pr-2 font-medium text-zinc-900">{item.titleSnapshot}</td>
                        <td className="py-2 pr-2 text-zinc-600">{item.quantity}</td>
                        <td className="py-2 pr-2 text-right text-zinc-600">{formatMinor(item.unitPriceMinor)}</td>
                        <td className="py-2 text-right font-medium text-zinc-900">{formatMinor(item.lineTotalMinor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end border-t border-zinc-100 pt-4">
                <p className="text-sm font-semibold text-zinc-900">Subtotal {formatMinor(splitOrder.subtotalMinor)}</p>
              </div>
            </div>

            {showFulfillmentChoice ? (
              <div
                className="rounded-xl bg-white p-5 sm:p-6"
                style={{ border: "1px solid var(--card-border)" }}
              >
                <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Fulfillment
                </h2>
                <p className="mb-4 text-sm text-zinc-600">Choose how you will get items to the LinkWe warehouse.</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <form action={chooseVendorDropoff}>
                    <input type="hidden" name="splitOrderId" value={splitOrder.id} />
                    <button
                      type="submit"
                      className="w-full rounded-xl border-2 border-zinc-200 bg-white p-4 text-left transition-colors hover:border-[#D4450A]"
                    >
                      <p className="text-sm font-semibold text-zinc-900">Drop off at warehouse</p>
                      <p className="mt-1 text-xs text-zinc-500">Bring your items to the LinkWe warehouse yourself.</p>
                      <p className="mt-2 text-xs font-semibold text-emerald-600">Free — no fee</p>
                    </button>
                  </form>

                  <form action={chooseCourierPickup}>
                    <input type="hidden" name="splitOrderId" value={splitOrder.id} />
                    <button
                      type="submit"
                      className="w-full rounded-xl border-2 border-zinc-200 bg-white p-4 text-left transition-colors hover:border-[#D4450A]"
                    >
                      <p className="text-sm font-semibold text-zinc-900">Request courier pickup</p>
                      <p className="mt-1 text-xs text-zinc-500">A LinkWe courier will collect your items.</p>
                      <p className="mt-2 text-xs font-semibold text-amber-600">
                        TTD {getCourierPickupFee(splitOrder.store.region ?? "").toFixed(2)} pickup fee — deducted from
                        earnings
                      </p>
                    </button>
                  </form>
                </div>
              </div>
            ) : null}

            {showCourierWaiting ? (
              <div
                className="rounded-xl bg-white p-5 sm:p-6"
                style={{ border: "1px solid var(--card-border)" }}
              >
                <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Courier pickup
                </h2>
                <p className="text-sm text-zinc-600">Waiting for a courier to accept this pickup.</p>
              </div>
            ) : null}

            {showCourierAssigned && splitOrder.inboundShipment?.courier ? (
              <div
                className="rounded-xl bg-white p-5 sm:p-6"
                style={{ border: "1px solid var(--card-border)" }}
              >
                <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Courier
                </h2>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold text-zinc-700">
                    {splitOrder.inboundShipment.courier.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900">{splitOrder.inboundShipment.courier.fullName}</p>
                    <p className="text-sm capitalize text-zinc-500">
                      {splitOrder.inboundShipment.courier.region?.replace(/_/g, " ") ?? "—"}
                    </p>
                    {splitOrder.inboundShipment.courier.phone ? (
                      <p className="mt-1 text-sm text-zinc-600">{splitOrder.inboundShipment.courier.phone}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-zinc-500">
                      Status: {splitOrder.inboundShipment.shipmentStatus?.replace(/_/g, " ") ?? "—"}
                    </p>
                    {splitOrder.inboundShipment.claimedAt ? (
                      <p className="text-xs text-zinc-500">
                        Claimed: {formatDate(splitOrder.inboundShipment.claimedAt)}
                      </p>
                    ) : null}
                    {splitOrder.inboundShipment.pickedUpAt ? (
                      <p className="text-xs text-zinc-500">
                        Picked up: {formatDate(splitOrder.inboundShipment.pickedUpAt)}
                      </p>
                    ) : null}
                  </div>
                </div>
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
                  <dt className="text-zinc-500">Commission (12%)</dt>
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
              <a
                href={`/api/vendor-invoice/${splitOrderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: SCARLET }}
              >
                Download Invoice
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
