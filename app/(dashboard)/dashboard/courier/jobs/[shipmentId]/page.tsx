import type { CSSProperties } from "react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { claimPickup, markPickedUp } from "@/app/actions/courier-ops";
import { getSession } from "@/lib/auth/session";
import { getCourierPickupFee } from "@/lib/fulfillment/courier-pickup-rates";
import { getShippingZone } from "@/lib/shipping/trinidad-zoning";
import { prisma } from "@/lib/prisma";
import { StorefrontMapAndProducts } from "@/components/storefront/StorefrontMapAndProducts";

type Props = { params: Promise<{ shipmentId: string }> };

async function claimPickupFromJobDetail(formData: FormData) {
  "use server";
  const result = await claimPickup(formData);
  const id = String(formData.get("shipmentId") ?? "").trim();
  if (result.ok && id) {
    revalidatePath(`/dashboard/courier/jobs/${id}`);
    redirect(`/dashboard/courier/jobs/${id}`);
  }
}

function shipmentStatusBadge(status: string | null): { label: string; style: CSSProperties } {
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
    case "AWAITING_COURIER_CLAIM":
      return {
        label: "Available",
        style: { ...pill, backgroundColor: "#FFFBEB", color: "#B45309", borderColor: "#FDE68A" },
      };
    case "COURIER_ASSIGNED":
    case "COURIER_PICKED_UP":
      return {
        label: status === "COURIER_ASSIGNED" ? "Assigned" : "Collected",
        style: { ...pill, backgroundColor: "#EFF6FF", color: "#1D4ED8", borderColor: "#BFDBFE" },
      };
    case "DELIVERED_TO_WAREHOUSE":
      return {
        label: "Arrived at warehouse",
        style: { ...pill, backgroundColor: "#ECFDF5", color: "#047857", borderColor: "#A7F3D0" },
      };
    default:
      return {
        label: status ?? "—",
        style: { ...pill, backgroundColor: "#F4F4F5", color: "#52525B", borderColor: "#E4E4E7" },
      };
  }
}

export default async function CourierJobDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "COURIER") redirect("/");

  const { shipmentId } = await params;

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      inboundForSplitOrder: {
        select: {
          referenceNumber: true,
          store: {
            select: {
              name: true,
              address: true,
              region: true,
              latitude: true,
              longitude: true,
              logoUrl: true,
            },
          },
          items: {
            select: {
              id: true,
              titleSnapshot: true,
              quantity: true,
              unitPriceMinor: true,
            },
          },
        },
      },
      courier: {
        select: { fullName: true, region: true },
      },
    },
  });

  if (!shipment) redirect("/dashboard/courier");

  if (
    shipment.courierId &&
    shipment.courierId !== session.userId &&
    shipment.shipmentStatus !== "AWAITING_COURIER_CLAIM"
  ) {
    redirect("/dashboard/courier");
  }

  const split = shipment.inboundForSplitOrder;
  const store = split?.store;
  const items = split?.items ?? [];
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
  const pickupFee = getCourierPickupFee(store?.region ?? "");
  const storeZone = store?.region ? getShippingZone(store.region) : null;
  const badge = shipmentStatusBadge(shipment.shipmentStatus);
  const shipmentRef = shipment.id.slice(-8).toUpperCase();

  const pickupLocation =
    store?.address?.trim() ||
    store?.region?.replace(/_/g, " ") ||
    "Address not provided";

  const showMap = store?.latitude != null && store?.longitude != null;

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <a
          href="/dashboard/courier"
          className="mb-4 inline-flex items-center gap-1 text-xs hover:underline"
          style={{ color: "var(--blue)" }}
        >
          ← Back to dashboard
        </a>

        <div className="mb-6">
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Pickup Job
          </h1>
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Shipment #{shipmentRef}
          </p>
          {split?.referenceNumber ? (
            <p className="mt-1 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
              Split order: {split.referenceNumber}
            </p>
          ) : null}
          <div className="mt-3">
            <span style={badge.style}>{badge.label}</span>
          </div>
        </div>

        <div
          className="mb-4 rounded-xl bg-white p-5"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Vendor details
          </p>
          <div className="flex gap-3">
            {store?.logoUrl ? (
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={store.logoUrl} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold text-zinc-600">
                {(store?.name ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-zinc-900">{store?.name ?? "—"}</p>
              <p className="mt-1 text-sm text-zinc-600">{pickupLocation}</p>
              <p className="mt-2 text-xs text-zinc-500">
                <span className="font-medium capitalize">{store?.region?.replace(/_/g, " ") ?? "—"}</span>
                {storeZone ? <span className="text-zinc-400"> · {storeZone.replace(/_/g, " ")} zone</span> : null}
              </p>
              <p className="mt-3 text-sm text-zinc-700">
                Pickup fee:{" "}
                <span className="font-semibold" style={{ color: "var(--scarlet)" }}>
                  TTD {pickupFee.toFixed(2)}
                </span>{" "}
                — Paid by vendor
              </p>
            </div>
          </div>
        </div>

        <div
          className="mb-4 rounded-xl bg-white p-5"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Items to collect
          </p>
          <ul className="space-y-2 text-sm text-zinc-800">
            {items.map((it) => (
              <li key={it.id} className="flex justify-between gap-2">
                <span>
                  {it.titleSnapshot} × {it.quantity}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-medium text-zinc-700">Total items: {totalUnits}</p>
          <p className="mt-2 text-xs text-amber-700">Collect ALL items before marking as picked up</p>
        </div>

        <div
          className="mb-4 rounded-xl bg-white p-5"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Delivery destination
          </p>
          <p className="text-sm font-medium text-zinc-900">Delivering to: LinkWe Warehouse</p>
          <p className="mt-3 text-xs text-zinc-500">Items go to the warehouse — not directly to the customer</p>
        </div>

        {showMap ? (
          <div
            className="mb-4 rounded-xl bg-white p-5"
            style={{ border: "1px solid var(--card-border)" }}
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Pickup location
            </p>
            <StorefrontMapAndProducts
              latitude={store!.latitude}
              longitude={store!.longitude}
              address={store!.address}
              region={store!.region}
              products={[]}
            />
          </div>
        ) : (
          <div
            className="mb-4 rounded-xl bg-white p-5"
            style={{ border: "1px solid var(--card-border)" }}
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Pickup location
            </p>
            <p className="text-sm text-zinc-700">{pickupLocation}</p>
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(pickupLocation)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium hover:underline"
              style={{ color: "var(--blue)" }}
            >
              Open in Google Maps →
            </a>
          </div>
        )}

        <div className="rounded-xl bg-white p-5" style={{ border: "1px solid var(--card-border)" }}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Action
          </p>

          {shipment.shipmentStatus === "AWAITING_COURIER_CLAIM" ? (
            <div>
              <p className="text-center text-2xl font-bold" style={{ color: "var(--scarlet)" }}>
                TTD {pickupFee.toFixed(2)}
              </p>
              <p className="mt-1 text-center text-xs text-zinc-500">Pickup fee (paid by vendor)</p>
              <form action={claimPickupFromJobDetail} className="mt-4">
                <input type="hidden" name="shipmentId" value={shipment.id} />
                <button
                  type="submit"
                  className="w-full rounded-xl py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "var(--scarlet)" }}
                >
                  Accept pickup
                </button>
              </form>
            </div>
          ) : null}

          {shipment.shipmentStatus === "COURIER_ASSIGNED" && shipment.courierId === session.userId ? (
            <form action={markPickedUp} className="mt-4">
              <input type="hidden" name="shipmentId" value={shipment.id} />
              <button
                type="submit"
                className="w-full rounded-xl py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--scarlet)" }}
              >
                Mark as Collected
              </button>
            </form>
          ) : null}

          {shipment.shipmentStatus === "COURIER_PICKED_UP" && shipment.courierId === session.userId ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
              <p className="text-sm font-semibold text-blue-800">Items collected — head to the LinkWe warehouse</p>
              <p className="mt-1 text-xs text-blue-600">Warehouse staff will confirm receipt when you arrive.</p>
            </div>
          ) : null}

          {shipment.shipmentStatus === "DELIVERED_TO_WAREHOUSE" ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
              <span className="text-lg">✓</span>
              <span className="text-sm font-medium">Arrived at warehouse</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
