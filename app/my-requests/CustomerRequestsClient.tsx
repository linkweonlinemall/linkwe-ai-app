"use client";

import Link from "next/link";
import { useState } from "react";

import { cancelOnDemandRequest, confirmOnDemandRequest } from "@/app/actions/on-demand";

type Request = {
  id: string;
  description: string;
  status: string;
  quotedPrice: number | null;
  estimatedArrival: string | null;
  declineReason: string | null;
  createdAt: Date | string;
  service: { name: string; slug: string };
  store: { name: string; slug: string };
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string; desc: string }> = {
  PENDING: {
    label: "Pending",
    color: "bg-amber-100 text-amber-700",
    icon: "⏳",
    desc: "Waiting for the provider to respond",
  },
  ACCEPTED: {
    label: "Accepted",
    color: "bg-emerald-100 text-emerald-700",
    icon: "✅",
    desc: "Provider accepted — confirm to proceed",
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-blue-100 text-blue-700",
    icon: "🔵",
    desc: "Job confirmed — provider is on their way",
  },
  DECLINED: {
    label: "Declined",
    color: "bg-red-100 text-red-700",
    icon: "❌",
    desc: "Provider could not take this request",
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-zinc-100 text-zinc-600",
    icon: "✓",
    desc: "Job completed",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-zinc-100 text-zinc-500",
    icon: "—",
    desc: "Request was cancelled",
  },
};

export default function CustomerRequestsClient({
  initialRequests,
}: {
  initialRequests: Request[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [actingId, setActingId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<Record<string, "online" | "arrival">>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancelFeedback, setCancelFeedback] = useState<
    Record<string, { type: "success" | "error"; text: string }>
  >({});

  function formatDate(d: Date | string) {
    return new Date(d).toLocaleDateString("en-TT", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function handleConfirm(requestId: string) {
    const method = paymentMethod[requestId] ?? "arrival";
    setActingId(requestId);
    const result = await confirmOnDemandRequest(requestId, method);
    if ("ok" in result) {
      if (method === "online" && "checkoutUrl" in result && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: "CONFIRMED" } : r)));
    }
    setActingId(null);
  }

  async function handleCancel(requestId: string) {
    if (!confirm("Cancel this request?")) return;
    setActingId(requestId);
    setCancelFeedback((prev) => {
      const next = { ...prev };
      delete next[requestId];
      return next;
    });
    const result = await cancelOnDemandRequest(requestId);
    if (result.ok) {
      setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: "CANCELLED" } : r)));
      setCancelFeedback((prev) => ({
        ...prev,
        [requestId]: { type: "success", text: "Request cancelled." },
      }));
    } else {
      setCancelFeedback((prev) => ({ ...prev, [requestId]: { type: "error", text: result.error } }));
    }
    setActingId(null);
  }

  async function handleCancelConfirmedRequest(requestId: string) {
    if (!confirm("Cancelling will refund your payment. Are you sure you want to cancel this request?")) return;
    setActingId(requestId);
    setCancelFeedback((prev) => {
      const next = { ...prev };
      delete next[requestId];
      return next;
    });
    const result = await cancelOnDemandRequest(requestId);
    if (result.ok) {
      const refundedTTD = result.refundedTTD ?? 0;
      setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: "CANCELLED" } : r)));
      setCancelFeedback((prev) => ({
        ...prev,
        [requestId]: {
          type: "success",
          text:
            refundedTTD > 0
              ? `Request cancelled. TTD ${refundedTTD.toFixed(2)} refunded to your card.`
              : "Request cancelled.",
        },
      }));
    } else {
      setCancelFeedback((prev) => ({ ...prev, [requestId]: { type: "error", text: result.error } }));
    }
    setActingId(null);
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-20 text-center">
        <span className="mb-4 text-5xl">⚡</span>
        <h2 className="mb-2 text-lg font-bold text-zinc-900">No requests yet</h2>
        <p className="mb-6 text-sm text-zinc-500">Find an on-demand service and send your first request</p>
        <Link
          href="/services"
          className="rounded-xl bg-[#D4450A] px-6 py-3 text-sm font-bold text-white hover:opacity-90"
        >
          Browse services
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {requests.map((request) => {
        const status = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.PENDING;
        const expanded = expandedId === request.id;
        const method = paymentMethod[request.id] ?? "arrival";

        return (
          <div
            key={request.id}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
          >
            {/* Header */}
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : request.id)}
              className="flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-zinc-50"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-2xl">
                {status.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-zinc-900">{request.service.name}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">{request.store.name}</p>
                <p className="mt-0.5 text-xs text-zinc-400">{formatDate(request.createdAt)}</p>
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

            {/* Expanded */}
            {expanded ? (
              <div className="border-t border-zinc-100 p-5">
                <div className="flex flex-col gap-4">
                  {/* Status message */}
                  <div
                    className={`rounded-xl border px-4 py-3 ${
                      request.status === "ACCEPTED"
                        ? "border-emerald-200 bg-emerald-50"
                        : request.status === "DECLINED"
                          ? "border-red-100 bg-red-50"
                          : request.status === "CONFIRMED"
                            ? "border-blue-100 bg-blue-50"
                            : "border-zinc-100 bg-zinc-50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-zinc-900">{status.desc}</p>
                  </div>

                  {/* Cancel result feedback */}
                  {cancelFeedback[request.id] ? (
                    <div
                      className={`rounded-xl border px-4 py-3 ${
                        cancelFeedback[request.id]!.type === "success"
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-red-100 bg-red-50"
                      }`}
                    >
                      <p
                        className={`text-sm font-semibold ${
                          cancelFeedback[request.id]!.type === "success" ? "text-emerald-800" : "text-red-700"
                        }`}
                      >
                        {cancelFeedback[request.id]!.text}
                      </p>
                    </div>
                  ) : null}

                  {/* Description */}
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-zinc-400">Your request</p>
                    <p className="text-sm leading-6 text-zinc-700">{request.description}</p>
                  </div>

                  {/* Vendor response for ACCEPTED */}
                  {request.status === "ACCEPTED" && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-emerald-700">
                        Provider response
                      </p>
                      {request.quotedPrice && request.quotedPrice > 0 ? (
                        <div className="mb-2 flex justify-between">
                          <span className="text-sm text-emerald-800">Quoted price</span>
                          <span className="text-sm font-black text-emerald-900">
                            TTD {request.quotedPrice.toFixed(2)}
                          </span>
                        </div>
                      ) : null}
                      {request.estimatedArrival ? (
                        <div className="flex justify-between">
                          <span className="text-sm text-emerald-800">Estimated arrival</span>
                          <span className="text-sm font-semibold text-emerald-900">
                            {request.estimatedArrival}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Decline reason */}
                  {request.status === "DECLINED" && request.declineReason ? (
                    <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                      <p className="text-xs text-red-700">Reason: {request.declineReason}</p>
                    </div>
                  ) : null}

                  {/* Confirmation actions for ACCEPTED */}
                  {request.status === "ACCEPTED" ? (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-bold text-zinc-700">How would you like to pay?</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: "arrival", label: "💵 Pay on arrival" },
                          { value: "online", label: "💳 Pay online" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setPaymentMethod((prev) => ({
                                ...prev,
                                [request.id]: opt.value as "online" | "arrival",
                              }))
                            }
                            className={`rounded-xl border-2 py-3 text-xs font-bold transition-all ${
                              method === opt.value
                                ? "border-[#D4450A] bg-[#D4450A]/5 text-[#D4450A]"
                                : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleConfirm(request.id)}
                        disabled={actingId === request.id}
                        className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
                      >
                        {actingId === request.id
                          ? "Confirming..."
                          : method === "online"
                            ? "Confirm & pay online"
                            : "Confirm — pay on arrival"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancel(request.id)}
                        disabled={actingId === request.id}
                        className="w-full rounded-xl border-2 border-zinc-200 py-3 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                      >
                        Decline offer
                      </button>
                    </div>
                  ) : null}

                  {/* Cancel button for PENDING */}
                  {request.status === "PENDING" ? (
                    <button
                      type="button"
                      onClick={() => handleCancel(request.id)}
                      disabled={actingId === request.id}
                      className="w-full rounded-xl border-2 border-zinc-200 py-2.5 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                    >
                      {actingId === request.id ? "Cancelling..." : "Cancel request"}
                    </button>
                  ) : null}

                  {/* Cancel button for CONFIRMED */}
                  {request.status === "CONFIRMED" ? (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleCancelConfirmedRequest(request.id)}
                        disabled={actingId === request.id}
                        className="w-full rounded-xl border-2 border-zinc-200 py-2.5 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                      >
                        {actingId === request.id ? "Cancelling..." : "Cancel request"}
                      </button>
                      <p className="text-center text-xs text-zinc-400">Cancelling will refund your payment.</p>
                    </div>
                  ) : null}

                  {/* View service link */}
                  <Link
                    href={`/service/${request.service.slug}`}
                    className="text-center text-xs font-semibold text-zinc-400 transition-colors hover:text-[#D4450A]"
                  >
                    View service →
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
