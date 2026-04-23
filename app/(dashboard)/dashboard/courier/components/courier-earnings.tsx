"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getCourierFinanceData, requestCourierPayout } from "@/app/actions/courier-payout";

type FinanceData = Awaited<ReturnType<typeof getCourierFinanceData>>;

function formatTTD(minor: number): string {
  return (minor / 100).toLocaleString("en-TT", {
    style: "currency",
    currency: "TTD",
  });
}

export default function CourierEarnings() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestAmount, setRequestAmount] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"ledger" | "history">("ledger");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    getCourierFinanceData()
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [refreshKey]);

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl animate-pulse bg-zinc-200" />
        ))}
      </div>
    );
  }

  const pendingPayout = data.payoutRequests.find((p) => p.status === "PENDING");
  const hasBankDetails = !!data.bankDetails;

  async function handleRequest() {
    setRequestError(null);
    setRequesting(true);
    const fd = new FormData();
    const minor = Math.round(parseFloat(requestAmount) * 100);
    fd.append("amountMinor", String(minor));
    const result = await requestCourierPayout(fd);
    if (result.ok) {
      setRequestSuccess(true);
      setRequestAmount("");
      setRefreshKey((k) => k + 1);
    } else {
      setRequestError(result.error ?? "Something went wrong");
    }
    setRequesting(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Total Earned</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900">{formatTTD(data.totalEarnings)}</p>
          <p className="mt-1 text-xs text-zinc-500">From all completed pickups</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Total Paid Out</p>
          <p className="mt-2 text-2xl font-bold text-zinc-500">{formatTTD(data.totalPaid)}</p>
          <p className="mt-1 text-xs text-zinc-500">Approved payouts to date</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div
            className="-mx-5 -mt-5 mb-4 h-1 w-[calc(100%+40px)]"
            style={{ backgroundColor: "#D4450A" }}
          />
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Available</p>
          <p className="mt-2 text-2xl font-bold" style={{ color: "#D4450A" }}>
            {formatTTD(data.availableBalance)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Ready to withdraw</p>
        </div>
      </div>

      {pendingPayout ? (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-amber-800">Payout request pending</p>
            <p className="mt-0.5 text-xs text-amber-600">
              {formatTTD(pendingPayout.amountMinor)} requested — awaiting admin approval
            </p>
          </div>
          <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            Pending
          </span>
        </div>
      ) : null}

      {!pendingPayout && data.availableBalance >= 5000 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Request a Payout
          </h2>
          {!hasBankDetails ? (
            <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-amber-700">Add your bank details to request a payout.</p>
              <Link
                href="/dashboard/courier/bank"
                className="inline-flex shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                style={{ backgroundColor: "#D4450A" }}
              >
                Add bank details →
              </Link>
            </div>
          ) : requestSuccess ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Payout request submitted. Admin will review shortly.
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">TTD</span>
                <input
                  type="number"
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  placeholder="0.00"
                  min={50}
                  max={(data.availableBalance / 100).toFixed(2)}
                  step="0.01"
                  className="w-full rounded-xl border border-zinc-200 py-2.5 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-zinc-300"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleRequest()}
                disabled={requesting || !requestAmount}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: "#D4450A" }}
              >
                {requesting ? "Requesting..." : "Request Payout"}
              </button>
              <button
                type="button"
                onClick={() => setRequestAmount(String((data.availableBalance / 100).toFixed(2)))}
                className="whitespace-nowrap text-xs text-zinc-500 transition-colors hover:text-zinc-900"
              >
                Max {formatTTD(data.availableBalance)}
              </button>
            </div>
          )}
          {requestError ? <p className="mt-2 text-xs text-red-600">{requestError}</p> : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-sm font-medium text-zinc-900">Bank Details</p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {hasBankDetails
              ? `${data.bankDetails!.bankName} — ****${data.bankDetails!.accountNumber?.slice(-4)}`
              : "No bank details saved"}
          </p>
        </div>
        <Link
          href="/dashboard/courier/bank"
          className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900"
        >
          {hasBankDetails ? "Update →" : "Add details →"}
        </Link>
      </div>

      <div className="flex overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        {(["ledger", "history"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveTab(t)}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === t ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {t === "ledger" ? "Earnings Ledger" : "Payout History"}
          </button>
        ))}
      </div>

      {activeTab === "ledger" ? (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {data.ledgerEntries.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-zinc-500">No earnings yet. Complete pickups to start earning.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.ledgerEntries.map((entry, i) => {
                  const isEarning = entry.entryType === "PICKUP_EARNING";
                  return (
                    <tr
                      key={entry.id}
                      className={`border-b border-zinc-50 ${i % 2 === 0 ? "bg-white" : "bg-zinc-50/30"}`}
                    >
                      <td className="px-4 py-2.5 text-xs text-zinc-500">
                        {new Date(entry.createdAt).toLocaleDateString("en-TT", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-600">{entry.description ?? "—"}</td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono text-xs font-semibold ${
                          isEarning ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {isEarning ? "+" : "-"}
                        {formatTTD(entry.amountMinor)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {activeTab === "history" ? (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {data.payoutRequests.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-zinc-500">No payout requests yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.payoutRequests.map((req, i) => (
                  <tr
                    key={req.id}
                    className={`border-b border-zinc-50 ${i % 2 === 0 ? "bg-white" : "bg-zinc-50/30"}`}
                  >
                    <td className="px-4 py-2.5 text-xs text-zinc-500">
                      {new Date(req.requestedAt).toLocaleDateString("en-TT", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-zinc-900">
                      {formatTTD(req.amountMinor)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                          req.status === "PENDING"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : req.status === "APPROVED"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-red-200 bg-red-50 text-red-600"
                        }`}
                      >
                        {req.status.charAt(0) + req.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </div>
  );
}
