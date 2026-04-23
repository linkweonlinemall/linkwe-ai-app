"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

import { deleteAllPayouts } from "@/app/actions/admin-delete";

import UndoDeleteToast from "./undo-delete-toast";
import {
  approveCourierPayout,
  getAdminCouriers,
  getCourierPayoutRequests,
  rejectCourierPayout,
} from "@/app/actions/admin-couriers";
import { getShippingZone, type ShippingZone } from "@/lib/shipping/trinidad-zoning";

type Courier = Awaited<ReturnType<typeof getAdminCouriers>>[number];
type CourierPayout = Awaited<ReturnType<typeof getCourierPayoutRequests>>[number];

function formatTTD(minor: number): string {
  return (minor / 100).toLocaleString("en-TT", {
    style: "currency",
    currency: "TTD",
  });
}

function calcCourierBalance(courier: Courier): number {
  const earnings = courier.courierLedger
    .filter((e) => e.entryType === "PICKUP_EARNING")
    .reduce((s, e) => s + e.amountMinor, 0);
  const paid = courier.courierLedger
    .filter((e) => e.entryType === "PAYOUT")
    .reduce((s, e) => s + e.amountMinor, 0);
  return earnings - paid;
}

function calcPayoutBalance(req: CourierPayout): number {
  const earnings = req.courier.courierLedger
    .filter((e) => e.entryType === "PICKUP_EARNING")
    .reduce((s, e) => s + e.amountMinor, 0);
  const paid = req.courier.courierLedger
    .filter((e) => e.entryType === "PAYOUT")
    .reduce((s, e) => s + e.amountMinor, 0);
  return earnings - paid;
}

function calcPayoutBalanceDetail(req: CourierPayout) {
  const earnings = req.courier.courierLedger
    .filter((e) => e.entryType === "PICKUP_EARNING")
    .reduce((s, e) => s + e.amountMinor, 0);
  const paid = req.courier.courierLedger
    .filter((e) => e.entryType === "PAYOUT")
    .reduce((s, e) => s + e.amountMinor, 0);
  return { earnings, paid, available: earnings - paid };
}

function getStatusColor(status: string | null): string {
  switch (status) {
    case "AWAITING_COURIER_CLAIM":
      return "#E8820C";
    case "COURIER_ASSIGNED":
      return "#1A7FB5";
    case "COURIER_PICKED_UP":
      return "#7F77DD";
    case "DELIVERED_TO_WAREHOUSE":
      return "#1B8C5A";
    default:
      return "#A1A1AA";
  }
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

function shipmentLifecycle(s: {
  shipmentStatus: string | null;
  status: string;
}): string {
  return s.shipmentStatus ?? s.status;
}

function approveErrorMessage(code: string | undefined): string {
  switch (code) {
    case "not_found":
      return "Request not found.";
    case "already_processed":
      return "This request was already processed.";
    case "no_bank_details":
      return "Courier has no bank details on file.";
    case "insufficient_balance":
      return "Insufficient balance for this payout.";
    default:
      return "Could not approve payout.";
  }
}

function modeZone(regions: (string | null)[]): string {
  const zones = regions
    .filter((r): r is string => !!r)
    .map((r) => getShippingZone(r));
  if (zones.length === 0) return "—";
  const counts = new Map<ShippingZone, number>();
  for (const z of zones) {
    counts.set(z, (counts.get(z) ?? 0) + 1);
  }
  let best: ShippingZone = zones[0]!;
  let bestN = 0;
  for (const [z, n] of counts) {
    if (n > bestN) {
      best = z;
      bestN = n;
    }
  }
  return best.replace(/_/g, " ");
}

export default function CouriersTab() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<CourierPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"couriers" | "payouts">("couriers");
  const [search, setSearch] = useState("");
  const [expandedCourier, setExpandedCourier] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedPayout, setExpandedPayout] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingSubmit, setRejectingSubmit] = useState(false);
  const [approveError, setApproveError] = useState<{ id: string; message: string } | null>(null);
  const [selectedPayouts, setSelectedPayouts] = useState<Set<string>>(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);
  const [pendingDeletePayouts, setPendingDeletePayouts] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([getAdminCouriers(), getCourierPayoutRequests()])
      .then(([c, p]) => {
        setCouriers(c);
        setPayoutRequests(p);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [refreshKey]);

  const filteredCouriers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return couriers;
    return couriers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.region?.toLowerCase().includes(q) ?? false),
    );
  }, [couriers, search]);

  const stats = useMemo(() => {
    const activeNow = couriers.filter((c) => c.courierLocation?.isActive === true).length;
    const totalJobsCompleted = couriers.reduce((sum, c) => sum + (c.completedInboundJobs ?? 0), 0);
    const totalPaidOut = couriers.reduce(
      (sum, c) =>
        sum +
        c.courierLedger.filter((e) => e.entryType === "PAYOUT").reduce((s, e) => s + e.amountMinor, 0),
      0,
    );
    return {
      totalCouriers: couriers.length,
      activeNow,
      totalJobsCompleted,
      totalPaidOut,
    };
  }, [couriers]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Couriers</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Manage courier accounts, jobs, and payout requests
          </p>
        </div>
        <div className="flex items-center gap-3">
          {payoutRequests.length > 0 ? (
            <button
              type="button"
              onClick={() => setActiveView("payouts")}
              className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 shadow-sm"
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: "#E8820C" }}
              >
                {payoutRequests.length}
              </span>
              <span className="text-sm font-medium text-amber-700">Payout requests</span>
            </button>
          ) : null}
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-center shadow-sm">
            <p className="text-lg font-bold text-zinc-900">{couriers.length}</p>
            <p className="text-xs text-zinc-400">Couriers</p>
          </div>
        </div>
      </div>

      <div className="mb-6 flex overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        {(["couriers", "payouts"] as const).map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => setActiveView(view)}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeView === view ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {view === "couriers"
              ? `All Couriers (${couriers.length})`
              : `Payout Requests (${payoutRequests.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse bg-zinc-200" />
          ))}
        </div>
      ) : activeView === "couriers" ? (
        <>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or region…"
            className="mb-4 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none ring-zinc-300 focus:ring-2"
          />

          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total couriers", value: String(stats.totalCouriers) },
              { label: "Active now", value: String(stats.activeNow) },
              { label: "Jobs completed", value: String(stats.totalJobsCompleted) },
              { label: "Earnings paid out", value: formatTTD(stats.totalPaidOut) },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm"
              >
                <p className="text-xs text-zinc-400">{card.label}</p>
                <p className="mt-1 text-lg font-bold text-zinc-900">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <th className="px-4 py-3 font-semibold text-zinc-600">Courier</th>
                    <th className="px-4 py-3 font-semibold text-zinc-600">Region</th>
                    <th className="px-4 py-3 font-semibold text-zinc-600">Zone</th>
                    <th className="px-4 py-3 font-semibold text-zinc-600">Jobs</th>
                    <th className="px-4 py-3 font-semibold text-zinc-600">Balance</th>
                    <th className="px-4 py-3 font-semibold text-zinc-600">Status</th>
                    <th className="px-4 py-3 font-semibold text-zinc-600">Active</th>
                    <th className="px-4 py-3 font-semibold text-zinc-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCouriers.map((c) => {
                    const isActive = c.courierLocation?.isActive === true;
                    const zone = c.region ? getShippingZone(c.region) : "—";
                    return (
                      <Fragment key={c.id}>
                        <tr
                          className="border-b border-zinc-50"
                          style={{
                            boxShadow: isActive
                              ? "inset 4px 0 0 0 #1B8C5A"
                              : "inset 4px 0 0 0 #E4E4E7",
                          }}
                        >
                          <td className="px-4 py-3">
                            <p className="font-bold text-zinc-900">{c.fullName}</p>
                            <p className="text-xs text-zinc-400">{c.email}</p>
                          </td>
                          <td className="px-4 py-3 capitalize text-zinc-700">
                            {c.region?.replace(/_/g, " ") ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-zinc-600">{zone.replace(/_/g, " ")}</td>
                          <td className="px-4 py-3 text-zinc-700">{c._count.shipments}</td>
                          <td className="px-4 py-3 font-medium text-zinc-900">
                            {formatTTD(calcCourierBalance(c))}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                isActive ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                              }`}
                            >
                              {isActive ? "Active now" : "Offline"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isActive ? (
                              <span className="relative flex h-3 w-3">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                              </span>
                            ) : (
                              <span className="inline-block h-3 w-3 rounded-full bg-zinc-200" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedCourier(expandedCourier === c.id ? null : c.id)
                              }
                              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                            >
                              {expandedCourier === c.id ? "Hide details" : "View details"}
                            </button>
                          </td>
                        </tr>
                        {expandedCourier === c.id ? (
                          <tr className="border-b border-zinc-100 bg-zinc-50/80">
                            <td colSpan={8} className="px-4 py-4">
                              <div className="flex flex-col gap-6">
                                <div>
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                                    Performance
                                  </p>
                                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div className="rounded-xl border border-zinc-200 bg-white p-3">
                                      <p className="text-xs text-zinc-500">Pickups completed</p>
                                      <p className="mt-1 text-lg font-bold text-zinc-900">
                                        {c.completedInboundJobs ?? 0}
                                      </p>
                                    </div>
                                    <div className="rounded-xl border border-zinc-200 bg-white p-3">
                                      <p className="text-xs text-zinc-500">Typical zone</p>
                                      <p className="mt-1 text-lg font-bold text-zinc-900">
                                        {modeZone(c.shipments.map((s) => s.region))}
                                      </p>
                                    </div>
                                    <div className="rounded-xl border border-zinc-200 bg-white p-3">
                                      <p className="text-xs text-zinc-500">Member since</p>
                                      <p className="mt-1 text-lg font-bold text-zinc-900">
                                        {new Date(c.createdAt).toLocaleDateString("en-TT", {
                                          month: "short",
                                          year: "numeric",
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                                    Recent jobs
                                  </p>
                                  <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-zinc-100 bg-zinc-50">
                                          <th className="px-3 py-2 text-left font-semibold text-zinc-500">
                                            Date
                                          </th>
                                          <th className="px-3 py-2 text-left font-semibold text-zinc-500">
                                            Region
                                          </th>
                                          <th className="px-3 py-2 text-left font-semibold text-zinc-500">
                                            Status
                                          </th>
                                          <th className="px-3 py-2 text-right font-semibold text-zinc-500">
                                            Earned
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {c.shipments.slice(0, 10).map((s) => {
                                          const life = shipmentLifecycle(s);
                                          const earnedEntry = c.courierLedger.find(
                                            (e) =>
                                              e.shipmentId === s.id && e.entryType === "PICKUP_EARNING",
                                          );
                                          return (
                                            <tr key={s.id} className="border-b border-zinc-50">
                                              <td className="px-3 py-2 text-zinc-600">
                                                {new Date(s.createdAt).toLocaleDateString("en-TT")}
                                              </td>
                                              <td className="px-3 py-2 capitalize text-zinc-600">
                                                {s.region?.replace(/_/g, " ") ?? "—"}
                                              </td>
                                              <td className="px-3 py-2">
                                                <span
                                                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                                                  style={{ backgroundColor: getStatusColor(life) }}
                                                >
                                                  {life.replace(/_/g, " ")}
                                                </span>
                                              </td>
                                              <td className="px-3 py-2 text-right font-mono text-zinc-700">
                                                {earnedEntry
                                                  ? formatTTD(earnedEntry.amountMinor)
                                                  : "—"}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                    {c.shipments.length === 0 ? (
                                      <p className="p-4 text-center text-sm text-zinc-500">
                                        No inbound jobs yet
                                      </p>
                                    ) : null}
                                  </div>
                                </div>

                                <div>
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                                    Bank details
                                  </p>
                                  <div className="rounded-xl border border-zinc-100 bg-white p-4">
                                    {c.courierBankDetails ? (
                                      <div className="flex flex-col gap-1.5">
                                        <p className="text-sm font-bold text-zinc-900">
                                          {c.courierBankDetails.bankName}
                                        </p>
                                        <p className="text-sm text-zinc-700">
                                          {c.courierBankDetails.accountName}
                                        </p>
                                        <p className="font-mono text-sm text-zinc-600">
                                          ****{c.courierBankDetails.accountNumber.slice(-4)}
                                        </p>
                                        <span className="mt-1 inline-flex w-fit rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium uppercase text-zinc-600">
                                          {c.courierBankDetails.accountType}
                                        </span>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-red-500">No bank details</p>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                                    Earnings ledger
                                  </p>
                                  <div className="overflow-hidden rounded-xl border border-zinc-100 bg-white">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-zinc-100 bg-zinc-50">
                                          <th className="px-3 py-2 text-left font-semibold text-zinc-500">
                                            Date
                                          </th>
                                          <th className="px-3 py-2 text-left font-semibold text-zinc-500">
                                            Type
                                          </th>
                                          <th className="px-3 py-2 text-left font-semibold text-zinc-500">
                                            Description
                                          </th>
                                          <th className="px-3 py-2 text-right font-semibold text-zinc-500">
                                            Amount
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {c.courierLedger.slice(0, 10).map((e) => {
                                          const isCredit = e.entryType === "PICKUP_EARNING";
                                          return (
                                            <tr key={e.id} className="border-b border-zinc-50">
                                              <td className="px-3 py-2 text-zinc-500">
                                                {new Date(e.createdAt).toLocaleDateString("en-TT")}
                                              </td>
                                              <td className="px-3 py-2 text-zinc-600">{e.entryType}</td>
                                              <td className="px-3 py-2 text-zinc-600">{e.description}</td>
                                              <td
                                                className={`px-3 py-2 text-right font-mono font-medium ${
                                                  isCredit ? "text-emerald-600" : "text-red-500"
                                                }`}
                                              >
                                                {isCredit ? "+" : "-"}
                                                {formatTTD(e.amountMinor)}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
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
            {filteredCouriers.length === 0 ? (
              <p className="p-8 text-center text-sm text-zinc-500">No couriers match your search.</p>
            ) : null}
          </div>
        </>
      ) : payoutRequests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center shadow-sm">
          <p className="text-base font-semibold text-zinc-900">No pending courier payout requests</p>
          <p className="mt-1 text-sm text-zinc-500">Requests will appear here when couriers submit them.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <input
              type="checkbox"
              checked={
                selectedPayouts.size === payoutRequests.length && payoutRequests.length > 0
              }
              onChange={() => {
                if (selectedPayouts.size === payoutRequests.length) {
                  setSelectedPayouts(new Set());
                } else {
                  setSelectedPayouts(new Set(payoutRequests.map((p) => p.id)));
                }
              }}
              className="rounded"
            />
            <span className="text-sm text-zinc-600">
              {selectedPayouts.size > 0 ? `${selectedPayouts.size} selected` : "Select all"}
            </span>

            {selectedPayouts.size > 0 ? (
              <>
                <div className="h-4 w-px bg-zinc-200" />
                <button
                  type="button"
                  onClick={async () => {
                    setBulkApproving(true);
                    try {
                      const ids = Array.from(selectedPayouts);
                      for (const id of ids) {
                        await approveCourierPayout(id);
                      }
                      setSelectedPayouts(new Set());
                      setRefreshKey((k) => k + 1);
                    } finally {
                      setBulkApproving(false);
                    }
                  }}
                  disabled={bulkApproving}
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#1B8C5A" }}
                >
                  {bulkApproving ? "Approving..." : `Approve Selected (${selectedPayouts.size})`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const selected = payoutRequests.filter((p) => selectedPayouts.has(p.id));
                    const rows = selected
                      .map((p) =>
                        [
                          p.courier.fullName,
                          p.courier.email,
                          p.courier.region?.replace(/_/g, " ") ?? "",
                          p.courier.courierBankDetails?.bankName ?? "",
                          p.courier.courierBankDetails?.accountName ?? "",
                          `****${p.courier.courierBankDetails?.accountNumber?.slice(-4) ?? ""}`,
                          p.courier.courierBankDetails?.accountType ?? "",
                          `TTD ${(p.amountMinor / 100).toFixed(2)}`,
                          new Date(p.requestedAt).toLocaleDateString("en-TT"),
                        ].join(","),
                      )
                      .join("\n");
                    const header =
                      "Courier,Email,Region,Bank,Account Name,Account Number,Type,Amount,Requested";
                    const csv = `${header}\n${rows}`;
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `linkwe-courier-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
                >
                  Export CSV
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => setPendingDeletePayouts(true)}
              className="ml-auto rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
            >
              Clear all payouts
            </button>
          </div>

          <div className="flex flex-col gap-4">
          {payoutRequests.map((req) => {
            const available = calcPayoutBalance(req);
            const detail = calcPayoutBalanceDetail(req);
            const hasBank = !!req.courier.courierBankDetails;
            const canApprove = hasBank && available >= req.amountMinor;
            const isApproving = approvingId === req.id;

            return (
              <div
                key={req.id}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
              >
                <div
                  className="h-1.5 w-full"
                  style={{
                    backgroundColor: canApprove ? "#1B8C5A" : "#E8820C",
                  }}
                />

                <div className="flex items-center gap-4 px-5 py-4">
                  <input
                    type="checkbox"
                    checked={selectedPayouts.has(req.id)}
                    onChange={() => {
                      setSelectedPayouts((prev) => {
                        const next = new Set(prev);
                        if (next.has(req.id)) next.delete(req.id);
                        else next.add(req.id);
                        return next;
                      });
                    }}
                    className="shrink-0 rounded"
                    onClick={(e) => e.stopPropagation()}
                  />

                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: "#1C1C1A" }}
                  >
                    {req.courier.fullName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-zinc-900">{req.courier.fullName}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-xs text-zinc-400">{relativeTime(req.requestedAt)}</span>
                      <span className="text-zinc-300">·</span>
                      <span className="text-xs capitalize text-zinc-400">
                        {req.courier.region?.replace(/_/g, " ") ?? "—"}
                      </span>
                      {req.courier.courierBankDetails ? (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                          {req.courier.courierBankDetails.bankName}
                        </span>
                      ) : (
                        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-500">
                          No bank
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="hidden shrink-0 flex-col items-end sm:flex">
                    <p className="text-xs text-zinc-400">Available balance</p>
                    <p className="mt-0.5 text-sm font-semibold text-zinc-900">
                      {formatTTD(available)}
                    </p>
                  </div>

                  <div className="h-10 w-px shrink-0 bg-zinc-100" />

                  <div className="shrink-0 text-right">
                    <p className="mb-0.5 text-xs text-zinc-400">Request</p>
                    <p className="text-xl font-bold" style={{ color: "#D4450A" }}>
                      {formatTTD(req.amountMinor)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: hasBank ? "#1B8C5A" : "#DC2626",
                        }}
                      />
                      <span className="text-xs text-zinc-400">Bank</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: available >= req.amountMinor ? "#1B8C5A" : "#DC2626",
                        }}
                      />
                      <span className="text-xs text-zinc-400">Balance</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedPayout(expandedPayout === req.id ? null : req.id)}
                    className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${
                      expandedPayout === req.id
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                    }`}
                  >
                    {expandedPayout === req.id ? "Close ↑" : "Review ↓"}
                  </button>
                </div>

                {expandedPayout === req.id ? (
                  <div className="border-t border-zinc-100 px-5 pb-5 pt-4">
                    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          Pay to
                        </p>
                        {req.courier.courierBankDetails ? (
                          <div className="flex flex-col gap-1.5">
                            <p className="text-sm font-bold text-zinc-900">
                              {req.courier.courierBankDetails.bankName}
                            </p>
                            <p className="text-sm text-zinc-700">
                              {req.courier.courierBankDetails.accountName}
                            </p>
                            <p className="font-mono text-sm text-zinc-600">
                              ****{req.courier.courierBankDetails.accountNumber.slice(-4)}
                            </p>
                            <span className="mt-1 inline-flex w-fit rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium uppercase text-zinc-600">
                              {req.courier.courierBankDetails.accountType}
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm text-red-500">No bank details on file</p>
                        )}
                      </div>

                      <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          Balance breakdown
                        </p>
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-500">Pickup earnings</span>
                            <span className="font-medium text-emerald-600">
                              +{formatTTD(detail.earnings)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-500">Paid out</span>
                            <span className="font-medium text-red-500">-{formatTTD(detail.paid)}</span>
                          </div>
                          <div className="mt-1 flex justify-between border-t border-zinc-200 pt-2 text-xs">
                            <span className="font-semibold text-zinc-700">Available</span>
                            <span className="font-bold text-zinc-900">{formatTTD(detail.available)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 overflow-hidden rounded-xl border border-zinc-100">
                      <p className="bg-zinc-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        Recent ledger (5)
                      </p>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-zinc-100 bg-zinc-50">
                            <th className="px-3 py-2 text-left font-semibold text-zinc-400">Date</th>
                            <th className="px-3 py-2 text-left font-semibold text-zinc-400">Description</th>
                            <th className="px-3 py-2 text-right font-semibold text-zinc-400">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {req.courier.courierLedger.slice(0, 5).map((e) => {
                            const isCredit = e.entryType === "PICKUP_EARNING";
                            return (
                              <tr key={e.id} className="border-b border-zinc-50">
                                <td className="px-3 py-2 text-zinc-500">
                                  {new Date(e.createdAt).toLocaleDateString("en-TT", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </td>
                                <td className="px-3 py-2 text-zinc-600">{e.description}</td>
                                <td
                                  className={`px-3 py-2 text-right font-mono font-medium ${
                                    isCredit ? "text-emerald-600" : "text-red-500"
                                  }`}
                                >
                                  {isCredit ? "+" : "-"}
                                  {formatTTD(e.amountMinor)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {approveError?.id === req.id ? (
                      <p className="mb-3 text-sm text-red-600">{approveError.message}</p>
                    ) : null}

                    {rejectingId === req.id ? (
                      <div className="mb-4 flex flex-col gap-2">
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Reason for rejection…"
                          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-zinc-300 focus:ring-2"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingId(null);
                              setRejectReason("");
                            }}
                            className="flex-1 rounded-xl border border-zinc-200 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={!rejectReason.trim() || rejectingSubmit}
                            onClick={async () => {
                              setRejectingSubmit(true);
                              try {
                                const res = await rejectCourierPayout(req.id, rejectReason.trim());
                                if (res.ok) {
                                  setRejectingId(null);
                                  setRejectReason("");
                                  setExpandedPayout(null);
                                  setRefreshKey((k) => k + 1);
                                }
                              } finally {
                                setRejectingSubmit(false);
                              }
                            }}
                            className="flex-1 rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                          >
                            {rejectingSubmit ? "Rejecting…" : "Confirm reject"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={!canApprove || isApproving}
                          onClick={async () => {
                            setApproveError(null);
                            setApprovingId(req.id);
                            try {
                              const res = await approveCourierPayout(req.id);
                              if (res.ok) {
                                setExpandedPayout(null);
                                setSelectedPayouts((prev) => {
                                  const next = new Set(prev);
                                  next.delete(req.id);
                                  return next;
                                });
                                setRefreshKey((k) => k + 1);
                              } else {
                                setApproveError({ id: req.id, message: approveErrorMessage(res.error) });
                              }
                            } finally {
                              setApprovingId(null);
                            }
                          }}
                          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{ backgroundColor: "#1B8C5A" }}
                        >
                          {isApproving ? "Approving…" : "Approve payout"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingId(req.id);
                            setRejectReason("");
                          }}
                          className="rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
          </div>

          {pendingDeletePayouts ? (
            <UndoDeleteToast
              message="Clear all payout requests and ledger entries"
              onConfirm={async () => {
                await deleteAllPayouts();
                setPendingDeletePayouts(false);
                setRefreshKey((k) => k + 1);
              }}
              onCancel={() => setPendingDeletePayouts(false)}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
