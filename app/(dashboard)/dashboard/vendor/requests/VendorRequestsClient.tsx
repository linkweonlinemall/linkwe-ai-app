"use client";

import { useState } from "react";

import { toast } from "sonner";

import {
  acceptOnDemandRequest,
  completeOnDemandRequest,
  declineOnDemandRequest,
} from "@/app/actions/on-demand";

type Request = {
  id: string;
  description: string;
  photos: string[];
  customerAddress: string | null;
  status: string;
  requestType: "ON_DEMAND" | "QUOTE";
  quotedPrice: number | null;
  estimatedArrival: string | null;
  declineReason: string | null;
  vendorNotes: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  service: { name: string; slug: string; travelFee: number | null };
  customer: { fullName: string | null; email: string; phone: string | null };
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-amber-100 text-amber-700" },
  ACCEPTED: { label: "Accepted", color: "bg-emerald-100 text-emerald-700" },
  CONFIRMED: { label: "Paid", color: "bg-emerald-100 text-emerald-700" },
  DECLINED: { label: "Declined", color: "bg-red-100 text-red-700" },
  COMPLETED: { label: "Completed", color: "bg-blue-100 text-blue-700" },
  CANCELLED: { label: "Cancelled", color: "bg-zinc-100 text-zinc-500" },
};

export default function VendorRequestsClient({ initialRequests }: { initialRequests: Request[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const [quotedPrice, setQuotedPrice] = useState<Record<string, string>>({});
  const [estimatedArrival, setEstimatedArrival] = useState<Record<string, string>>({});
  const [vendorNotes, setVendorNotes] = useState<Record<string, string>>({});
  const [declineReason, setDeclineReason] = useState<Record<string, string>>({});
  const [actionMode, setActionMode] = useState<Record<string, "accept" | "decline" | null>>({});

  const filtered =
    filter === "all"
      ? requests.filter((r) => r.requestType !== "QUOTE")
      : filter === "QUOTES"
        ? requests.filter((r) => r.requestType === "QUOTE")
        : requests.filter((r) => r.requestType !== "QUOTE" && r.status === filter);

  const onDemandRequests = requests.filter((r) => r.requestType !== "QUOTE");

  const counts = {
    all: onDemandRequests.length,
    PENDING: onDemandRequests.filter((r) => r.status === "PENDING").length,
    ACCEPTED: onDemandRequests.filter((r) => r.status === "ACCEPTED").length,
    CONFIRMED: onDemandRequests.filter((r) => r.status === "CONFIRMED").length,
    COMPLETED: onDemandRequests.filter((r) => r.status === "COMPLETED").length,
    DECLINED: onDemandRequests.filter((r) => r.status === "DECLINED").length,
    QUOTES: requests.filter((r) => r.requestType === "QUOTE").length,
  };

  async function handleAccept(requestId: string, requestType: "ON_DEMAND" | "QUOTE") {
    const price = parseFloat(quotedPrice[requestId] ?? "0");
    if (!price || price <= 0) {
      alert("Please enter a price.");
      return;
    }
    const arrival = estimatedArrival[requestId] ?? "";
    if (requestType === "ON_DEMAND" && !arrival) {
      alert("Please set an estimated arrival time.");
      return;
    }
    setActingId(requestId);
    const result = await acceptOnDemandRequest(requestId, {
      quotedPrice: price,
      estimatedArrival: requestType === "QUOTE" ? undefined : arrival,
      vendorNotes: vendorNotes[requestId],
    });
    if ("error" in result) {
      alert(result.error);
    } else {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? {
                ...r,
                status: "ACCEPTED",
                quotedPrice: price,
                estimatedArrival: requestType === "QUOTE" ? null : arrival,
              }
            : r,
        ),
      );
      setActionMode((prev) => ({ ...prev, [requestId]: null }));
    }
    setActingId(null);
  }

  async function handleDecline(requestId: string, wording: "declined" | "cancelled" = "declined") {
    setActingId(requestId);
    const result = await declineOnDemandRequest(requestId, declineReason[requestId] ?? "");
    if (result.ok === true) {
      setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: "DECLINED" } : r)));
      setActionMode((prev) => ({ ...prev, [requestId]: null }));
      const verb = wording === "cancelled" ? "cancelled" : "declined";
      toast.success(
        result.refundedTTD > 0
          ? `Request ${verb}. TTD ${result.refundedTTD.toFixed(2)} refunded to the customer.`
          : `Request ${verb}.`,
      );
    } else {
      toast.error(result.error);
    }
    setActingId(null);
  }

  async function handleComplete(requestId: string) {
    setActingId(requestId);
    await completeOnDemandRequest(requestId);
    setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: "COMPLETED" } : r)));
    setActingId(null);
  }

  function formatDate(d: Date | string) {
    return new Date(d).toLocaleDateString("en-TT", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {[
          { value: "all", label: "All" },
          { value: "PENDING", label: "Pending" },
          { value: "ACCEPTED", label: "Accepted" },
          { value: "CONFIRMED", label: "Paid" },
          { value: "COMPLETED", label: "Completed" },
          { value: "DECLINED", label: "Declined" },
          { value: "QUOTES", label: "Quotes" },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              filter === tab.value
                ? "bg-[#D4450A] text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                filter === tab.value ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {counts[tab.value as keyof typeof counts] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center">
          <span className="mb-3 text-4xl">⚡</span>
          <p className="text-sm font-semibold text-zinc-700">No requests yet</p>
          <p className="mt-1 text-xs text-zinc-400">On-demand requests from customers will appear here</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((request) => {
            const expanded = expandedId === request.id;
            const status = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.PENDING;
            const mode = actionMode[request.id] ?? null;

            return (
              <div
                key={request.id}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : request.id)}
                  className="flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-zinc-50"
                >
                  <div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                      request.status === "PENDING" ? "bg-amber-50" : "bg-zinc-50"
                    }`}
                  >
                    ⚡
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-zinc-900">{request.service.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="rounded-full bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                        {request.requestType === "QUOTE" ? "Quote" : "On-demand"}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{request.description}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-400">
                      {request.customer.fullName ?? request.customer.email} · {formatDate(request.createdAt)}
                    </p>
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`mt-1 shrink-0 text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {expanded ? (
                  <div className="border-t border-zinc-100 p-4">
                    <div className="flex flex-col gap-4">
                      <div className="rounded-xl bg-zinc-50 p-3">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-400">Customer</p>
                        <p className="text-sm font-semibold text-zinc-900">{request.customer.fullName ?? "—"}</p>
                        <p className="text-xs text-zinc-500">{request.customer.email}</p>
                        {request.customer.phone ? (
                          <p className="text-xs text-zinc-500">{request.customer.phone}</p>
                        ) : null}
                        {request.customerAddress ? (
                          <p className="mt-1 text-xs text-zinc-500">📍 {request.customerAddress}</p>
                        ) : null}
                      </div>

                      <div>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                          Request details
                        </p>
                        <p className="text-sm leading-6 text-zinc-700">{request.description}</p>
                      </div>

                      {request.photos.length > 0 ? (
                        <div>
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-400">Photos</p>
                          <div className="flex flex-wrap gap-2">
                            {request.photos.map((url) => (
                              <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt=""
                                  className="h-20 w-20 rounded-xl border border-zinc-200 object-cover transition-opacity hover:opacity-90"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {request.status === "ACCEPTED" ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                            Your response
                          </p>
                          {request.quotedPrice ? (
                            <p className="text-sm font-bold text-emerald-900">
                              Quoted: TTD {request.quotedPrice.toFixed(2)}
                            </p>
                          ) : null}
                          {request.estimatedArrival ? (
                            <p className="text-xs text-emerald-700">Arrival: {request.estimatedArrival}</p>
                          ) : null}
                          {request.vendorNotes ? (
                            <p className="mt-1 text-xs text-emerald-700">{request.vendorNotes}</p>
                          ) : null}
                        </div>
                      ) : null}

                      {request.status === "DECLINED" && request.declineReason ? (
                        <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                          <p className="text-xs text-red-700">Declined: {request.declineReason}</p>
                        </div>
                      ) : null}

                      {request.status === "PENDING" ? (
                        <div className="flex flex-col gap-3">
                          {mode === null ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setActionMode((prev) => ({ ...prev, [request.id]: "accept" }))}
                                className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
                              >
                                Accept ✓
                              </button>
                              <button
                                type="button"
                                onClick={() => setActionMode((prev) => ({ ...prev, [request.id]: "decline" }))}
                                className="flex-1 rounded-xl border-2 border-red-200 py-2.5 text-sm font-bold text-red-600 transition-colors hover:bg-red-50"
                              >
                                Decline ✕
                              </button>
                            </div>
                          ) : mode === "accept" ? (
                            <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                              <p className="text-xs font-bold text-emerald-800">Accept this request</p>
                              <div>
                                <label className="mb-1 block text-xs font-semibold text-zinc-700">
                                  Your quote (TTD)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={quotedPrice[request.id] ?? ""}
                                  onChange={(e) =>
                                    setQuotedPrice((prev) => ({ ...prev, [request.id]: e.target.value }))
                                  }
                                  placeholder="e.g. 250.00"
                                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                                />
                              </div>
                              {request.requestType === "ON_DEMAND" ? (
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-zinc-700">
                                    Estimated arrival <span className="text-[#D4450A]">*</span>
                                  </label>
                                  <select
                                    value={estimatedArrival[request.id] ?? ""}
                                    onChange={(e) =>
                                      setEstimatedArrival((prev) => ({ ...prev, [request.id]: e.target.value }))
                                    }
                                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                                  >
                                    <option value="">Select estimated arrival *</option>
                                    <optgroup label="Quick response">
                                      <option value="Within 15 minutes">Within 15 minutes</option>
                                      <option value="Within 30 minutes">Within 30 minutes</option>
                                      <option value="Within 1 hour">Within 1 hour</option>
                                      <option value="Within 2 hours">Within 2 hours</option>
                                      <option value="Within 4 hours">Within 4 hours</option>
                                    </optgroup>
                                    <optgroup label="Today">
                                      <option value="Today morning (8am–12pm)">Today morning (8am–12pm)</option>
                                      <option value="Today afternoon (12pm–5pm)">Today afternoon (12pm–5pm)</option>
                                      <option value="Today evening (5pm–8pm)">Today evening (5pm–8pm)</option>
                                      <option value="Later today">Later today</option>
                                    </optgroup>
                                    <optgroup label="Scheduled">
                                      <option value="Tomorrow morning">Tomorrow morning</option>
                                      <option value="Tomorrow afternoon">Tomorrow afternoon</option>
                                      <option value="This week">This week</option>
                                      <option value="Next week">Next week</option>
                                    </optgroup>
                                  </select>
                                </div>
                              ) : null}
                              <div>
                                <label className="mb-1 block text-xs font-semibold text-zinc-700">
                                  Note to customer (optional)
                                </label>
                                <textarea
                                  value={vendorNotes[request.id] ?? ""}
                                  onChange={(e) =>
                                    setVendorNotes((prev) => ({ ...prev, [request.id]: e.target.value }))
                                  }
                                  placeholder="e.g. I'll call you when I'm on my way"
                                  rows={2}
                                  className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleAccept(request.id, request.requestType)}
                                  disabled={actingId === request.id}
                                  className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
                                >
                                  {actingId === request.id
                                    ? "Saving..."
                                    : request.requestType === "QUOTE"
                                      ? "Send quote"
                                      : "Confirm acceptance"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActionMode((prev) => ({ ...prev, [request.id]: null }))}
                                  className="rounded-xl border border-zinc-200 px-4 text-sm text-zinc-600 hover:bg-zinc-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                              <p className="text-xs font-bold text-red-800">Decline this request</p>
                              <textarea
                                value={declineReason[request.id] ?? ""}
                                onChange={(e) =>
                                  setDeclineReason((prev) => ({ ...prev, [request.id]: e.target.value }))
                                }
                                placeholder="Reason for declining (optional — customer will see this)"
                                rows={2}
                                className="w-full resize-none rounded-lg border border-red-200 bg-white px-3 py-2 text-sm focus:outline-none"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleDecline(request.id)}
                                  disabled={actingId === request.id}
                                  className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50"
                                >
                                  {actingId === request.id ? "Declining..." : "Confirm decline"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActionMode((prev) => ({ ...prev, [request.id]: null }))}
                                  className="rounded-xl border border-zinc-200 px-4 text-sm text-zinc-600 hover:bg-zinc-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}

                      {request.status === "ACCEPTED" || request.status === "CONFIRMED" ? (
                        <div className="flex flex-col gap-3">
                          {mode === "decline" && request.status === "CONFIRMED" ? (
                            <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                              <p className="text-xs font-bold text-red-800">Cancel &amp; refund this request</p>
                              <textarea
                                value={declineReason[request.id] ?? ""}
                                onChange={(e) =>
                                  setDeclineReason((prev) => ({ ...prev, [request.id]: e.target.value }))
                                }
                                placeholder="Reason for cancelling (optional — customer will see this)"
                                rows={2}
                                className="w-full resize-none rounded-lg border border-red-200 bg-white px-3 py-2 text-sm focus:outline-none"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleDecline(request.id, "cancelled")}
                                  disabled={actingId === request.id}
                                  className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50"
                                >
                                  {actingId === request.id ? "Cancelling..." : "Confirm cancel & refund"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActionMode((prev) => ({ ...prev, [request.id]: null }))}
                                  className="rounded-xl border border-zinc-200 px-4 text-sm text-zinc-600 hover:bg-zinc-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleComplete(request.id)}
                                disabled={actingId === request.id}
                                className="flex-1 rounded-xl bg-[#1A7FB5] py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                              >
                                {actingId === request.id ? "Marking..." : "Mark as completed ✓"}
                              </button>
                              {request.status === "CONFIRMED" ? (
                                <button
                                  type="button"
                                  onClick={() => setActionMode((prev) => ({ ...prev, [request.id]: "decline" }))}
                                  disabled={actingId === request.id}
                                  className="rounded-xl border-2 border-red-200 px-4 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                                >
                                  Cancel & refund
                                </button>
                              ) : null}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
