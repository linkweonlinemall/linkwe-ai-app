import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  claimPickup,
  markDeliveredToWarehouse,
  markPickedUp,
} from "@/app/actions/courier-ops";
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

function formatMainOrderRegion(region: string): string {
  return region.replace(/_/g, " ");
}

function shipmentStatusBadge(status: string | null): { label: string; className: string } {
  switch (status) {
    case "AWAITING_COURIER_CLAIM":
      return { label: "Available", className: "bg-amber-50 text-amber-800 border border-amber-200" };
    case "COURIER_ASSIGNED":
      return { label: "Assigned", className: "bg-blue-50 text-blue-800 border border-blue-200" };
    case "COURIER_PICKED_UP":
      return { label: "Collected", className: "bg-blue-50 text-blue-800 border border-blue-200" };
    case "DELIVERED_TO_WAREHOUSE":
      return { label: "Delivered to warehouse", className: "bg-emerald-50 text-emerald-800 border border-emerald-200" };
    default:
      return { label: status ?? "—", className: "bg-zinc-100 text-zinc-700 border border-zinc-200" };
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
        include: {
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
          mainOrder: {
            select: {
              region: true,
              buyer: { select: { fullName: true } },
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
  const mainOrder = split?.mainOrder;
  const items = split?.items ?? [];
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
  const pickupFee = getCourierPickupFee(store?.region ?? "");
  const storeZone = store?.region ? getShippingZone(store.region) : null;
  const badge = shipmentStatusBadge(shipment.shipmentStatus);
  const ref = shipment.id.slice(-8).toUpperCase();

  const pickupLocation =
    store?.address?.trim() ||
    store?.region?.replace(/_/g, " ") ||
    "Address not provided";

  const showMap = store?.latitude != null && store?.longitude != null;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/dashboard/courier"
          className="text-sm font-medium text-zinc-600 hover:text-[#D4450A]"
        >
          ← Back to dashboard
        </Link>

        <div className="mt-6">
          <h1 className="text-2xl font-bold text-zinc-900">Pickup Job</h1>
          <p className="mt-1 text-sm text-zinc-500">Shipment ID: #{ref}</p>
          <span
            className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Vendor details</p>
              <div className="mt-4 flex gap-3">
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
                    {storeZone ? (
                      <span className="text-zinc-400"> · {storeZone.replace(/_/g, " ")} zone</span>
                    ) : null}
                  </p>
                  <p className="mt-3 text-sm text-zinc-700">
                    Pickup fee:{" "}
                    <span className="font-semibold text-[#D4450A]">TTD {pickupFee.toFixed(2)}</span> — Paid by
                    vendor
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Items to collect</p>
              <ul className="mt-3 space-y-2 text-sm text-zinc-800">
                {items.map((it) => (
                  <li key={it.id} className="flex justify-between gap-2">
                    <span>
                      {it.titleSnapshot} × {it.quantity}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm font-medium text-zinc-700">Total items: {totalUnits}</p>
              <p className="mt-2 text-xs text-amber-700">
                Collect ALL items before marking as picked up
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Delivery destination
              </p>
              <p className="mt-3 text-sm font-medium text-zinc-900">Delivering to: LinkWe Warehouse</p>
              <p className="mt-2 text-sm text-zinc-600">
                Customer delivery region:{" "}
                <span className="capitalize">{mainOrder ? formatMainOrderRegion(mainOrder.region) : "—"}</span>
              </p>
              <p className="mt-3 text-xs text-zinc-500">
                Items go to the warehouse — not directly to the customer
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {showMap ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
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
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Pickup location
                </p>
                <p className="text-sm text-zinc-700">{pickupLocation}</p>
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(pickupLocation)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium hover:underline"
                  style={{ color: "#D4450A" }}
                >
                  Open in Google Maps →
                </a>
              </div>
            )}

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Action</p>

              {shipment.shipmentStatus === "AWAITING_COURIER_CLAIM" ? (
                <div className="mt-4">
                  <p className="text-center text-2xl font-bold text-[#D4450A]">
                    TTD {pickupFee.toFixed(2)}
                  </p>
                  <p className="mt-1 text-center text-xs text-zinc-500">Pickup fee (paid by vendor)</p>
                  <form action={claimPickupFromJobDetail} className="mt-4">
                    <input type="hidden" name="shipmentId" value={shipment.id} />
                    <button
                      type="submit"
                      className="w-full rounded-xl py-3 text-sm font-medium text-white transition-colors hover:opacity-90"
                      style={{ backgroundColor: "#D4450A" }}
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
                    className="w-full rounded-xl py-3 text-sm font-medium text-white transition-colors hover:opacity-90"
                    style={{ backgroundColor: "#D4450A" }}
                  >
                    Mark as Collected
                  </button>
                </form>
              ) : null}

              {shipment.shipmentStatus === "COURIER_PICKED_UP" && shipment.courierId === session.userId ? (
                <form action={markDeliveredToWarehouse} className="mt-4">
                  <input type="hidden" name="shipmentId" value={shipment.id} />
                  <button
                    type="submit"
                    className="w-full rounded-xl py-3 text-sm font-medium text-white transition-colors hover:opacity-90"
                    style={{ backgroundColor: "#D4450A" }}
                  >
                    Mark as Delivered to Warehouse
                  </button>
                </form>
              ) : null}

              {shipment.shipmentStatus === "DELIVERED_TO_WAREHOUSE" ? (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
                  <span className="text-lg">✓</span>
                  <span className="text-sm font-medium">Delivered to warehouse</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
