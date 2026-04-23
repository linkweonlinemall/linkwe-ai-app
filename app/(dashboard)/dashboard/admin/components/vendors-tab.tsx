"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

import { deleteAllPayouts } from "@/app/actions/admin-delete";

import UndoDeleteToast from "./undo-delete-toast";
import {
  approvePayoutRequest,
  getAdminPayoutRequests,
  getAdminVendors,
  getPayoutHistory,
  rejectPayoutRequest,
} from "@/app/actions/admin-vendors";

type Vendor = Awaited<ReturnType<typeof getAdminVendors>>[number];
type PayoutRequest = Awaited<ReturnType<typeof getAdminPayoutRequests>>[number];
type PayoutHistoryRow = Awaited<ReturnType<typeof getPayoutHistory>>[number];

function calcBalance(vendor: Vendor): number {
  const credits = vendor.ledgerEntries
    .filter((e) => e.entryType === "CREDIT_ORDER_SETTLEMENT")
    .reduce((s, e) => s + e.amountMinor, 0);
  const debits = vendor.ledgerEntries
    .filter((e) => ["DEBIT_PLATFORM_FEE", "DEBIT_PAYOUT"].includes(e.entryType))
    .reduce((s, e) => s + e.amountMinor, 0);
  return credits - debits;
}

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

function entryTypeLabel(entryType: string): string {
  const map: Record<string, string> = {
    CREDIT_ORDER_SETTLEMENT: "Credit",
    DEBIT_PLATFORM_FEE: "Platform fee",
    DEBIT_PAYOUT: "Payout",
    DEBIT_REFUND: "Refund",
    CREDIT_ADJUSTMENT: "Credit adj.",
    DEBIT_ADJUSTMENT: "Debit adj.",
  };
  return map[entryType] ?? entryType;
}

function approveErrorMessage(code: string | undefined): string {
  switch (code) {
    case "not_found":
      return "Request not found.";
    case "already_processed":
      return "This request was already processed.";
    case "no_bank_details":
      return "Vendor has no bank details on file.";
    case "insufficient_balance":
      return "Insufficient ledger balance for this payout.";
    default:
      return "Could not approve payout.";
  }
}

export default function VendorsTab() {
  function calcPayoutBalance(req: PayoutRequest) {
    const credits = req.store.ledgerEntries
      .filter((e) => e.entryType === "CREDIT_ORDER_SETTLEMENT")
      .reduce((s, e) => s + e.amountMinor, 0);
    const debits = req.store.ledgerEntries
      .filter((e) => ["DEBIT_PLATFORM_FEE", "DEBIT_PAYOUT"].includes(e.entryType))
      .reduce((s, e) => s + e.amountMinor, 0);
    return { credits, debits, available: credits - debits };
  }

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"vendors" | "payouts" | "history">("vendors");
  const [search, setSearch] = useState("");
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [approveError, setApproveError] = useState<{ id: string; message: string } | null>(null);
  const [selectedPayouts, setSelectedPayouts] = useState<Set<string>>(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);
  const [expandedPayout, setExpandedPayout] = useState<string | null>(null);
  const [pendingDeletePayouts, setPendingDeletePayouts] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([getAdminVendors(), getAdminPayoutRequests(), getPayoutHistory()])
      .then(([v, p, h]) => {
        setVendors(v);
        setPayoutRequests(p);
        setPayoutHistory(h);
        setLoading(false);
        if (p.length > 0) setActiveView("payouts");
        else setActiveView("vendors");
      })
      .catch(() => {
        setLoading(false);
      });
  }, [refreshKey]);

  const filteredVendors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.slug.toLowerCase().includes(q) ||
        v.region.toLowerCase().includes(q) ||
        v.owner.fullName.toLowerCase().includes(q) ||
        v.owner.email.toLowerCase().includes(q),
    );
  }, [vendors, search]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Vendors & Payouts</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Manage vendor accounts and approve payout requests
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 shadow-sm">
          {payoutRequests.length > 0 ? (
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: "#E8820C" }}
            >
              {payoutRequests.length}
            </span>
          ) : null}
          <span className="text-sm font-medium text-zinc-700">
            {payoutRequests.length > 0
              ? `${payoutRequests.length} payout${payoutRequests.length !== 1 ? "s" : ""} pending`
              : "No pending payouts"}
          </span>
        </div>
      </div>

      <div className="mb-6 flex overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        {(["payouts", "vendors", "history"] as const).map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => setActiveView(view)}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeView === view ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {view === "payouts"
              ? `Payout Requests (${payoutRequests.length})`
              : view === "vendors"
                ? `All Vendors (${vendors.length})`
                : "Payout History"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse bg-zinc-200" />
          ))}
        </div>
      ) : activeView === "payouts" ? (
        payoutRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center shadow-sm">
            <p className="text-base font-semibold text-zinc-900">No pending payout requests</p>
            <p className="mt-1 text-sm text-zinc-500">
              Vendor payout requests will appear here for approval.
            </p>
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
                          await approvePayoutRequest(id);
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
                            p.store.name,
                            p.store.owner?.bankDetails?.bankName ?? "",
                            p.store.owner?.bankDetails?.accountName ?? "",
                            `****${p.store.owner?.bankDetails?.accountNumber?.slice(-4) ?? ""}`,
                            p.store.owner?.bankDetails?.accountType ?? "",
                            `TTD ${(p.amountMinor / 100).toFixed(2)}`,
                            new Date(p.requestedAt).toLocaleDateString("en-TT"),
                          ].join(","),
                        )
                        .join("\n");
                      const header = "Store,Bank,Account Name,Account Number,Type,Amount,Requested";
                      const csv = `${header}\n${rows}`;
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `linkwe-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
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
                const canApprove =
                  !!req.store.owner?.bankDetails &&
                  calcPayoutBalance(req).available >= req.amountMinor;
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
                        {req.store.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-zinc-900">{req.store.name}</p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="text-xs text-zinc-400">{relativeTime(req.requestedAt)}</span>
                          <span className="text-zinc-300">·</span>
                          <span className="text-xs capitalize text-zinc-400">
                            {req.store.region?.replace(/_/g, " ")}
                          </span>
                          {req.store.owner?.bankDetails ? (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                              {req.store.owner.bankDetails.bankName}
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
                          {formatTTD(calcPayoutBalance(req).available)}
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
                              backgroundColor: !!req.store.owner?.bankDetails ? "#1B8C5A" : "#DC2626",
                            }}
                          />
                          <span className="text-xs text-zinc-400">Bank</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{
                              backgroundColor:
                                calcPayoutBalance(req).available >= req.amountMinor ? "#1B8C5A" : "#DC2626",
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
                        <div className="mb-4 grid grid-cols-2 gap-4">
                          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                              Pay to
                            </p>
                            {req.store.owner?.bankDetails ? (
                              <div className="flex flex-col gap-1.5">
                                <p className="text-sm font-bold text-zinc-900">
                                  {req.store.owner.bankDetails.bankName}
                                </p>
                                <p className="text-sm text-zinc-700">
                                  {req.store.owner.bankDetails.accountName}
                                </p>
                                <p className="font-mono text-sm text-zinc-600">
                                  ****{req.store.owner.bankDetails.accountNumber?.slice(-4)}
                                </p>
                                <span className="mt-1 inline-flex w-fit rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium uppercase text-zinc-600">
                                  {req.store.owner.bankDetails.accountType ?? "Unknown"}
                                </span>
                              </div>
                            ) : (
                              <p className="text-sm text-red-500">No bank details on file</p>
                            )}
                          </div>

                          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                              Account balance
                            </p>
                            <div className="flex flex-col gap-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-zinc-500">Total earned</span>
                                <span className="font-medium text-emerald-600">
                                  +{formatTTD(calcPayoutBalance(req).credits)}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-zinc-500">Deductions</span>
                                <span className="font-medium text-red-500">
                                  -{formatTTD(calcPayoutBalance(req).debits)}
                                </span>
                              </div>
                              <div className="mt-1 flex justify-between border-t border-zinc-200 pt-2 text-xs">
                                <span className="font-semibold text-zinc-700">Available</span>
                                <span className="font-bold text-zinc-900">
                                  {formatTTD(calcPayoutBalance(req).available)}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-zinc-500">After payout</span>
                                <span
                                  className={`font-medium ${
                                    calcPayoutBalance(req).available - req.amountMinor >= 0
                                      ? "text-zinc-600"
                                      : "text-red-500"
                                  }`}
                                >
                                  {formatTTD(
                                    Math.max(0, calcPayoutBalance(req).available - req.amountMinor),
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <details className="mb-4">
                          <summary className="cursor-pointer text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900">
                            View ledger breakdown ({req.store.ledgerEntries.length} entries)
                          </summary>
                          <div className="mt-3 overflow-hidden rounded-xl border border-zinc-100">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-zinc-100 bg-zinc-50">
                                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-zinc-400">
                                    Date
                                  </th>
                                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-zinc-400">
                                    Description
                                  </th>
                                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-zinc-400">
                                    Amount
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {req.store.ledgerEntries.slice(0, 5).map((entry) => {
                                  const isCredit = entry.entryType === "CREDIT_ORDER_SETTLEMENT";
                                  return (
                                    <tr key={entry.id} className="border-b border-zinc-50">
                                      <td className="px-3 py-2 text-zinc-400">
                                        {new Date(entry.createdAt).toLocaleDateString("en-TT", {
                                          day: "numeric",
                                          month: "short",
                                        })}
                                      </td>
                                      <td className="px-3 py-2 text-zinc-600">{entry.description ?? "—"}</td>
                                      <td
                                        className={`px-3 py-2 text-right font-mono font-medium ${
                                          isCredit ? "text-emerald-600" : "text-red-500"
                                        }`}
                                      >
                                        {isCredit ? "+" : "-"}
                                        {formatTTD(entry.amountMinor)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </details>

                        <div className="mb-4 flex items-center gap-4 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                          {[
                            { ok: !!req.store.owner?.bankDetails, label: "Bank details on file" },
                            {
                              ok: calcPayoutBalance(req).available >= req.amountMinor,
                              label: "Balance covers request",
                            },
                            { ok: true, label: "Oldest pending first (FIFO)" },
                          ].map((check) => (
                            <div key={check.label} className="flex items-center gap-1.5">
                              <span
                                className={`text-sm ${check.ok ? "text-emerald-500" : "text-red-500"}`}
                              >
                                {check.ok ? "✓" : "✗"}
                              </span>
                              <span
                                className={`text-xs ${check.ok ? "text-zinc-600" : "font-medium text-red-600"}`}
                              >
                                {check.label}
                              </span>
                            </div>
                          ))}
                        </div>

                        {rejectingId === req.id ? (
                          <div className="flex flex-col gap-2">
                            <input
                              type="text"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Reason for rejection..."
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
                                disabled={!rejectReason.trim()}
                                onClick={async () => {
                                  await rejectPayoutRequest(req.id, rejectReason.trim());
                                  setRejectingId(null);
                                  setRejectReason("");
                                  setExpandedPayout(null);
                                  setRefreshKey((k) => k + 1);
                                }}
                                className="flex-1 rounded-xl py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                                style={{ backgroundColor: "#DC2626" }}
                              >
                                Confirm Reject
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={async () => {
                                setApprovingId(req.id);
                                setApproveError(null);
                                const result = await approvePayoutRequest(req.id);
                                if (result.ok) {
                                  setExpandedPayout(null);
                                  setRefreshKey((k) => k + 1);
                                } else {
                                  setApproveError({
                                    id: req.id,
                                    message: approveErrorMessage(result.error),
                                  });
                                }
                                setApprovingId(null);
                              }}
                              disabled={!canApprove || approvingId === req.id}
                              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                              style={{ backgroundColor: "#1B8C5A" }}
                            >
                              {isApproving ? "Approving..." : "✓ Approve Payout"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectingId(req.id)}
                              className="rounded-xl border-2 border-red-300 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                            >
                              Reject
                            </button>
                            {approveError?.id === req.id ? (
                              <p className="ml-2 text-xs text-red-600">{approveError.message}</p>
                            ) : null}
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
        )
      ) : activeView === "history" ? (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {payoutHistory.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-base font-semibold text-zinc-900">No payout history yet</p>
              <p className="mt-1 text-sm text-zinc-500">
                Approved and rejected payouts will appear here.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Store
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Requested
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Processed
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody>
                {payoutHistory.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`border-b border-zinc-50 ${i % 2 === 0 ? "bg-white" : "bg-zinc-50/30"}`}
                    style={{
                      borderLeft: `3px solid ${p.status === "APPROVED" ? "#1B8C5A" : "#DC2626"}`,
                    }}
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900">{p.store.name}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {new Date(p.requestedAt).toLocaleDateString("en-TT", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {p.processedAt
                        ? new Date(p.processedAt).toLocaleDateString("en-TT", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-zinc-900">
                      {formatTTD(p.amountMinor)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          p.status === "APPROVED"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-red-200 bg-red-50 text-red-600"
                        }`}
                      >
                        {p.status === "APPROVED" ? "Approved" : "Rejected"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{p.failureReason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stores, owners, region…"
            className="mb-4 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none ring-zinc-300 focus:ring-2"
          />

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Store
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Owner
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Region
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Balance
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Status
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Bank
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Payouts
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((v) => {
                    const balance = calcBalance(v);
                    const pendingCount = v.payoutRequests.filter((p) => p.status === "PENDING").length;
                    const bank = v.owner.bankDetails;
                    const expanded = expandedVendor === v.id;

                    return (
                      <Fragment key={v.id}>
                        <tr
                          className={`cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50 ${
                            expanded ? "bg-zinc-50/80" : ""
                          }`}
                          onClick={() => setExpandedVendor((id) => (id === v.id ? null : v.id))}
                        >
                          <td className="px-3 py-3 font-medium text-zinc-900">{v.name}</td>
                          <td className="px-3 py-3">
                            <p className="text-xs font-medium text-zinc-800">{v.owner.fullName}</p>
                            <p className="text-xs text-zinc-400">{v.owner.email}</p>
                          </td>
                          <td className="px-3 py-3 text-xs capitalize text-zinc-600">
                            {v.region.replace(/_/g, " ")}
                          </td>
                          <td
                            className={`px-3 py-3 text-right font-mono text-xs font-semibold ${
                              balance >= 0 ? "text-zinc-900" : "text-red-600"
                            }`}
                          >
                            {formatTTD(balance)}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                v.status === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-800"
                                  : v.status === "PENDING_APPROVAL"
                                    ? "bg-amber-50 text-amber-800"
                                    : "bg-zinc-100 text-zinc-600"
                              }`}
                            >
                              {v.status === "ACTIVE" ? "Live" : v.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs text-zinc-600">
                            {bank ? bank.bankName : "—"}
                          </td>
                          <td className="px-3 py-3 text-center text-xs text-zinc-700">{pendingCount}</td>
                          <td className="px-3 py-3 text-right">
                            <a
                              href={`/store/${v.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs font-medium text-[#D4450A] hover:underline"
                            >
                              View store
                            </a>
                          </td>
                        </tr>
                        {expanded ? (
                          <tr className="border-b border-zinc-200 bg-zinc-50">
                            <td colSpan={8} className="px-4 py-4">
                              <div className="grid gap-6 lg:grid-cols-2">
                                <div>
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                                    Ledger history
                                  </p>
                                  <div className="max-h-56 overflow-y-auto rounded-xl border border-zinc-100 bg-white">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-zinc-100 bg-zinc-50">
                                          <th className="px-2 py-1.5 text-left font-medium text-zinc-500">
                                            Date
                                          </th>
                                          <th className="px-2 py-1.5 text-left font-medium text-zinc-500">
                                            Type
                                          </th>
                                          <th className="px-2 py-1.5 text-right font-medium text-zinc-500">
                                            Amt
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {v.ledgerEntries.map((e) => {
                                          const isCredit = e.entryType === "CREDIT_ORDER_SETTLEMENT";
                                          return (
                                            <tr key={e.id} className="border-b border-zinc-50">
                                              <td className="px-2 py-1.5 text-zinc-600">
                                                {new Date(e.createdAt).toLocaleDateString("en-TT")}
                                              </td>
                                              <td className="px-2 py-1.5 text-zinc-700">
                                                {entryTypeLabel(e.entryType)}
                                              </td>
                                              <td
                                                className={`px-2 py-1.5 text-right font-mono ${
                                                  isCredit ? "text-emerald-600" : "text-red-600"
                                                }`}
                                              >
                                                {isCredit ? "+" : "−"}
                                                {formatTTD(e.amountMinor)}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                <div>
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                                    Bank details
                                  </p>
                                  {bank ? (
                                    <div className="rounded-xl border border-zinc-100 bg-white p-3 text-xs">
                                      <p className="font-semibold">{bank.bankName}</p>
                                      <p className="text-zinc-600">{bank.accountName}</p>
                                      <p className="font-mono">****{bank.accountNumber.slice(-4)}</p>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-zinc-500">No bank details.</p>
                                  )}
                                  <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                                    Payout history
                                  </p>
                                  <ul className="space-y-2 text-xs">
                                    {v.payoutRequests.length === 0 ? (
                                      <li className="text-zinc-500">No payout requests yet.</li>
                                    ) : (
                                      v.payoutRequests.map((p) => (
                                        <li
                                          key={p.id}
                                          className="flex justify-between rounded-lg border border-zinc-100 bg-white px-3 py-2"
                                        >
                                          <span className="text-zinc-600">
                                            {new Date(p.requestedAt).toLocaleDateString("en-TT")} · {p.status}
                                          </span>
                                          <span className="font-mono font-medium">{formatTTD(p.amountMinor)}</span>
                                        </li>
                                      ))
                                    )}
                                  </ul>
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
            {filteredVendors.length === 0 ? (
              <p className="p-8 text-center text-sm text-zinc-500">No vendors match your search.</p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
