"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { setCourierInactive, updateCourierLocation } from "@/app/actions/courier-location";
import { claimPickup, markPickedUp } from "@/app/actions/courier-ops";
import CourierEarnings from "./courier-earnings";
import { getCourierPickupFee } from "@/lib/fulfillment/courier-pickup-rates";
import { getShippingZone } from "@/lib/shipping/trinidad-zoning";

type ShipmentItem = {
  id: string;
  titleSnapshot: string;
  quantity: number;
};

type ShipmentStore = {
  name: string;
  address: string | null;
  region: string | null;
};

type SplitOrderSummary = {
  id: string;
  store: ShipmentStore;
  items: ShipmentItem[];
} | null;

type PickupShipment = {
  id: string;
  shipmentStatus: string | null;
  region: string | null;
  pickupFeeMinor: number | null;
  totalWeightLbs: number | null;
  claimedAt: Date | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  inboundForSplitOrder: SplitOrderSummary;
};

type CompletedShipment = {
  id: string;
  deliveredAt: Date | null;
  pickupFeeMinor: number | null;
  totalWeightLbs: number | null;
  inboundForSplitOrder: {
    id: string;
    store: { name: string; region: string | null };
  } | null;
};

type Props = {
  courierName: string;
  courierRegion: string | null;
  courierZone: string | null;
  availablePickups: PickupShipment[];
  myActivePickups: PickupShipment[];
  completedPickups: CompletedShipment[];
};

type TabId = "available" | "active" | "completed" | "earnings";

function itemsSummaryLine(items: ShipmentItem[]): string {
  const n = items.reduce((sum, i) => sum + i.quantity, 0);
  if (items.length === 0) return "0 items";
  const first = items[0]?.titleSnapshot ?? "";
  const rest = items.length > 1 ? `, ${items.slice(1).map((i) => i.titleSnapshot).join(", ")}` : "";
  return `${n} items — ${first}${rest}`;
}

function activeStatusLabel(status: string | null): string {
  switch (status) {
    case "COURIER_ASSIGNED":
      return "Assigned — go to vendor";
    case "COURIER_PICKED_UP":
      return "Collected — en route to warehouse";
    default:
      return status ?? "Unknown";
  }
}

function pickupTtdFromShipment(shipment: PickupShipment): number {
  if (shipment.pickupFeeMinor != null) return shipment.pickupFeeMinor / 100;
  const reg = shipment.region ?? shipment.inboundForSplitOrder?.store.region ?? "";
  const w = shipment.totalWeightLbs ?? 1;
  return getCourierPickupFee(reg, w);
}

function completedPickupTtd(shipment: CompletedShipment): number {
  if (shipment.pickupFeeMinor != null) return shipment.pickupFeeMinor / 100;
  const reg = shipment.inboundForSplitOrder?.store.region ?? "";
  const w = shipment.totalWeightLbs ?? 1;
  return getCourierPickupFee(reg, w);
}

function formatCreatedRelative(d: Date | string): string {
  const t = new Date(d).getTime();
  const ms = Date.now() - t;
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return new Date(d).toLocaleString("en-TT", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CourierDashboardClient({
  courierName,
  courierRegion,
  courierZone,
  availablePickups,
  myActivePickups,
  completedPickups,
}: Props) {
  const [tab, setTab] = useState<TabId>("available");

  useEffect(() => {
    if (myActivePickups.length === 0) return;
    if (typeof navigator === "undefined") return;
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const h = position.coords.heading;
        const acc = position.coords.accuracy;
        await updateCourierLocation(
          position.coords.latitude,
          position.coords.longitude,
          h != null && !Number.isNaN(h) ? h : null,
          acc != null && !Number.isNaN(acc) ? acc : null,
        );
      },
      (error) => {
        console.warn("Location tracking error:", error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      void setCourierInactive();
    };
  }, [myActivePickups.length]);

  return (
    <>
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex flex-wrap gap-x-1">
            <button
              type="button"
              onClick={() => setTab("available")}
              className={`inline-block px-4 py-3 text-sm font-medium ${
                tab === "available"
                  ? "border-b-2 border-[#D4450A] font-medium text-[#D4450A]"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              Available Pickups
              {availablePickups.length > 0 ? (
                <span className="ml-1.5 text-xs font-normal tabular-nums text-zinc-400">
                  ({availablePickups.length})
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setTab("active")}
              className={`inline-block px-4 py-3 text-sm font-medium ${
                tab === "active"
                  ? "border-b-2 border-[#D4450A] font-medium text-[#D4450A]"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              My Active Pickups
              {myActivePickups.length > 0 ? (
                <span className="ml-1.5 text-xs font-normal tabular-nums text-zinc-400">
                  ({myActivePickups.length})
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setTab("completed")}
              className={`inline-block px-4 py-3 text-sm font-medium ${
                tab === "completed"
                  ? "border-b-2 border-[#D4450A] font-medium text-[#D4450A]"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              Completed
            </button>
            <button
              type="button"
              onClick={() => setTab("earnings")}
              className={`inline-block px-4 py-3 text-sm font-medium ${
                tab === "earnings"
                  ? "border-b-2 border-[#D4450A] font-medium text-[#D4450A]"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              Earnings
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-zinc-900">Courier Dashboard</h1>
              <p className="mt-1 text-sm text-zinc-600">{courierName}</p>
            </div>
            {courierRegion ? (
              <div className="flex flex-col items-end gap-1">
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium capitalize text-zinc-600">
                  {courierRegion.replace(/_/g, " ")}
                </span>
                {courierZone ? (
                  <span className="text-xs text-zinc-400">{courierZone.replace(/_/g, " ")} zone</span>
                ) : null}
              </div>
            ) : (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                No region set
              </span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-center">
              <p className="text-xl font-bold text-zinc-900">{availablePickups.length}</p>
              <p className="mt-0.5 text-xs text-zinc-500">Available</p>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-center">
              <p className="text-xl font-bold text-zinc-900">{myActivePickups.length}</p>
              <p className="mt-0.5 text-xs text-zinc-500">Active</p>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-center">
              <p className="text-xl font-bold text-zinc-900">{completedPickups.length}</p>
              <p className="mt-0.5 text-xs text-zinc-500">Completed</p>
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <Link
              href="/dashboard/courier/bank"
              className="text-xs text-zinc-500 transition-colors hover:text-zinc-900"
            >
              Bank details →
            </Link>
          </div>
        </div>

        {tab === "available" ? (
        <div className="flex flex-col gap-4">
          {availablePickups.length === 0 ? (
            <p className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
              No pickups available right now. Check back soon.
            </p>
          ) : (
            availablePickups.map((shipment) => {
              const split = shipment.inboundForSplitOrder;
              const store = split?.store;
              const items = split?.items ?? [];
              const itemCount = items.reduce((s, i) => s + i.quantity, 0);
              const zone = getShippingZone(shipment.region ?? "");
              const fee = pickupTtdFromShipment(shipment);
              return (
                <div key={shipment.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-900">{store?.name ?? "Unknown store"}</p>
                      <p className="text-xs capitalize text-zinc-500">{store?.region?.replace(/_/g, " ") ?? "—"}</p>
                      <span className="mt-1 inline-block text-xs font-medium text-zinc-500">
                        {zone.replace(/_/g, " ")} zone
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-zinc-600">{itemCount} items</p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: "#D4450A" }}>
                    TTD {fee.toFixed(2)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">{formatCreatedRelative(shipment.createdAt)}</p>
                  <p className="mt-2 text-sm text-zinc-700">{itemsSummaryLine(items)}</p>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/dashboard/courier/jobs/${shipment.id}`}
                      className="flex flex-1 items-center justify-center rounded-xl border border-zinc-200 py-2.5 text-center text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                    >
                      View details
                    </Link>
                    <form
                      action={async (fd) => {
                        const result = await claimPickup(fd);
                        if (!result.ok && result.error === "already_claimed") {
                          alert("This pickup was already claimed.");
                        }
                      }}
                      className="flex-1"
                    >
                      <input type="hidden" name="shipmentId" value={shipment.id} />
                      <button
                        type="submit"
                        className="w-full rounded-xl py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
                        style={{ backgroundColor: "#D4450A" }}
                      >
                        Accept
                      </button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : null}

      {tab === "active" ? (
        <div className="flex flex-col gap-4">
          {myActivePickups.length === 0 ? (
            <p className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
              You have no active pickups.
            </p>
          ) : (
            myActivePickups.map((shipment) => {
              const split = shipment.inboundForSplitOrder;
              const store = split?.store;
              const items = split?.items ?? [];
              const status = shipment.shipmentStatus;
              return (
                <div key={shipment.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-zinc-900">{store?.name ?? "Unknown store"}</p>
                      <p className="mt-1 text-sm text-zinc-600">
                        {store?.address?.trim() || store?.region || "—"}
                      </p>
                    </div>
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                      {activeStatusLabel(status)}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-zinc-700">
                    {items.map((it) => (
                      <li key={it.id}>
                        {it.titleSnapshot} × {it.quantity}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                      href={`/dashboard/courier/jobs/${shipment.id}`}
                      className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
                    >
                      View job →
                    </Link>
                    <div className="min-w-0 flex-1 sm:max-w-xs">
                      {status === "COURIER_ASSIGNED" ? (
                        <form action={markPickedUp}>
                          <input type="hidden" name="shipmentId" value={shipment.id} />
                          <button
                            type="submit"
                            className="w-full rounded-xl py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
                            style={{ backgroundColor: "#D4450A" }}
                          >
                            Mark as Collected
                          </button>
                        </form>
                      ) : null}
                      {status === "COURIER_PICKED_UP" ? (
                        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                          <p className="text-xs font-medium text-blue-700">
                            Items collected — proceed to the LinkWe warehouse. Warehouse staff will confirm
                            receipt on arrival.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : null}

      {tab === "earnings" ? <CourierEarnings /> : null}

      {tab === "completed" ? (
        <div className="flex flex-col gap-3">
          {completedPickups.length === 0 ? (
            <p className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
              No completed pickups yet.
            </p>
          ) : (
            completedPickups.map((shipment) => (
              <div
                key={shipment.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {shipment.inboundForSplitOrder?.store.name ?? "Unknown store"}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {shipment.deliveredAt
                        ? new Date(shipment.deliveredAt).toLocaleDateString("en-TT", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Date unknown"}
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    Completed
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-2.5 text-center">
                    <p className="text-xs text-zinc-500">Zone</p>
                    <p className="mt-0.5 text-xs font-semibold capitalize text-zinc-900">
                      {shipment.inboundForSplitOrder?.store.region
                        ? getShippingZone(shipment.inboundForSplitOrder.store.region).replace(/_/g, " ")
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-2.5 text-center">
                    <p className="text-xs text-zinc-500">Earned</p>
                    <p className="mt-0.5 text-xs font-semibold" style={{ color: "#D4450A" }}>
                      TTD{" "}
                      {completedPickupTtd(shipment).toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-2.5 text-center">
                    <p className="text-xs text-zinc-500">Region</p>
                    <p className="mt-0.5 text-xs font-semibold capitalize text-zinc-900">
                      {shipment.inboundForSplitOrder?.store.region?.replace(/_/g, " ") ?? "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
      </div>
    </>
  );
}
