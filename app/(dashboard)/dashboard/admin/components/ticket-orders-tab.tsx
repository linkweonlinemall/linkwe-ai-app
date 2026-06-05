"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

import { getAdminTicketOrders } from "@/app/actions/admin-ticket-orders";
import { refundTicket } from "@/app/actions/ticket-refund";
import { ticketPaidMinor } from "@/lib/tickets/ticket-paid-minor";

type TicketOrder = Awaited<ReturnType<typeof getAdminTicketOrders>>[number];
type TicketRow = TicketOrder["tickets"][number];

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

function refundPolicyGuidance(event: TicketOrder["event"]): {
  label: string;
  pastCutoff: boolean;
  detail: string;
} {
  const { refundPolicyType, refundCutoffHours, startDate } = event;
  const cutoffMs = refundCutoffHours * 60 * 60 * 1000;
  const cutoffAt = new Date(new Date(startDate).getTime() - cutoffMs);
  const pastCutoff = Date.now() > cutoffAt.getTime();

  if (refundPolicyType === "NONE") {
    return {
      label: "No refunds (event policy)",
      pastCutoff: true,
      detail: "Event policy says no refunds — admin may still refund at discretion.",
    };
  }

  const policyLabel =
    refundPolicyType === "FULL" ? "Full refund" : "Partial refund";

  return {
    label: `${policyLabel} up to ${refundCutoffHours}h before event`,
    pastCutoff,
    detail: pastCutoff
      ? `Refund cutoff was ${cutoffAt.toLocaleString("en-TT", { dateStyle: "medium", timeStyle: "short" })} — past policy window (guidance only).`
      : `Refund cutoff: ${cutoffAt.toLocaleString("en-TT", { dateStyle: "medium", timeStyle: "short" })} — within policy window (guidance only).`,
  };
}

function ticketStatusBadge(status: string) {
  if (status === "REFUNDED") {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
        Refunded
      </span>
    );
  }
  if (status === "USED") {
    return (
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
        Used
      </span>
    );
  }
  if (status === "CANCELLED") {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
        Cancelled
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
      Valid
    </span>
  );
}

export default function TicketOrdersTab() {
  const [orders, setOrders] = useState<TicketOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [refundTarget, setRefundTarget] = useState<{
    order: TicketOrder;
    ticket: TicketRow;
  } | null>(null);
  const [refundAmountDollars, setRefundAmountDollars] = useState("");
  const [refundProcessing, setRefundProcessing] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getAdminTicketOrders({ search: search || undefined })
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [refreshKey, search]);

  const filtered = useMemo(() => orders, [orders]);

  function openRefundModal(order: TicketOrder, ticket: TicketRow) {
    setRefundTarget({ order, ticket });
    setRefundAmountDollars((ticketPaidMinor(ticket) / 100).toFixed(2));
    setRefundError(null);
  }

  function closeRefundModal() {
    setRefundTarget(null);
    setRefundAmountDollars("");
    setRefundError(null);
  }

  async function confirmRefund() {
    if (!refundTarget) return;
    const parsed = parseFloat(refundAmountDollars);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setRefundError("Enter a valid refund amount.");
      return;
    }
    const amountMinor = Math.round(parsed * 100);
    const maxMinor = ticketPaidMinor(refundTarget.ticket);
    if (amountMinor > maxMinor) {
      setRefundError(`Amount cannot exceed ticket price (${formatTTD(maxMinor)}).`);
      return;
    }

    setRefundProcessing(true);
    setRefundError(null);
    const result = await refundTicket(refundTarget.ticket.id, amountMinor);
    setRefundProcessing(false);

    if ("error" in result) {
      setRefundError(result.error);
      return;
    }

    closeRefundModal();
    setRefreshKey((k) => k + 1);
  }

  const policy = refundTarget ? refundPolicyGuidance(refundTarget.order.event) : null;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Ticket orders</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Paid event ticket orders — refund individual tickets via Stripe.
          </p>
        </div>
        <input
          type="search"
          placeholder="Search ref, buyer, event…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D4450A]/30 sm:ml-auto"
        />
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading ticket orders…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
          <p className="font-semibold text-zinc-900">No paid ticket orders found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50/80 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const expanded = expandedId === order.id;
                const refundedCount = order.tickets.filter((t) => t.status === "REFUNDED").length;
                return (
                  <Fragment key={order.id}>
                    <tr
                      className="cursor-pointer border-b border-zinc-50 transition-colors hover:bg-zinc-50/50"
                      onClick={() => setExpandedId(expanded ? null : order.id)}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-zinc-800">
                        {order.reference}
                        {refundedCount > 0 ? (
                          <span className="ml-2 text-amber-600">
                            {refundedCount}/{order.tickets.length} refunded
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-900">{order.user.fullName}</p>
                        <p className="text-xs text-zinc-500">{order.user.email}</p>
                      </td>
                      <td className="px-4 py-3 text-zinc-700">{order.event.title}</td>
                      <td className="px-4 py-3 font-semibold text-zinc-900">
                        {formatTTD(order.total)}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {relativeTime(order.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{expanded ? "▾" : "▸"}</td>
                    </tr>
                    {expanded ? (
                      <tr key={`${order.id}-detail`} className="border-b border-zinc-100 bg-zinc-50/40">
                        <td colSpan={6} className="px-4 py-4">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            Tickets in this order
                            {order.earningsReleased ? (
                              <span className="ml-2 font-normal normal-case text-amber-700">
                                · Vendor earnings released (refunds claw back net share)
                              </span>
                            ) : (
                              <span className="ml-2 font-normal normal-case text-zinc-500">
                                · Earnings not yet released
                              </span>
                            )}
                          </p>
                          <ul className="space-y-2">
                            {order.tickets.map((ticket) => {
                              const canRefund =
                                ticket.status === "VALID" || ticket.status === "USED";
                              return (
                                <li
                                  key={ticket.id}
                                  className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div className="min-w-0">
                                    <p className="font-mono text-xs text-zinc-500">
                                      {ticket.ticketNumber}
                                    </p>
                                    <p className="font-semibold text-zinc-900">
                                      {ticket.ticketType.name} · {formatTTD(ticketPaidMinor(ticket))}
                                    </p>
                                    <p className="text-xs text-zinc-500">
                                      {ticket.holderName} · {ticket.holderEmail}
                                    </p>
                                    {ticket.status === "REFUNDED" && ticket.refundedAt ? (
                                      <p className="mt-1 text-xs text-amber-800">
                                        Refunded {formatTTD(ticket.refundAmountMinor ?? 0)} on{" "}
                                        {new Date(ticket.refundedAt).toLocaleString("en-TT", {
                                          dateStyle: "medium",
                                          timeStyle: "short",
                                        })}
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="flex shrink-0 items-center gap-2">
                                    {ticketStatusBadge(ticket.status)}
                                    {canRefund ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openRefundModal(order, ticket);
                                        }}
                                        className="rounded-lg bg-[#D4450A] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                                      >
                                        Refund
                                      </button>
                                    ) : null}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {refundTarget && policy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-zinc-900">Refund ticket</h3>
            <p className="mt-1 font-mono text-xs text-zinc-500">{refundTarget.ticket.ticketNumber}</p>
            <p className="mt-2 text-sm text-zinc-700">
              {refundTarget.ticket.ticketType.name} — max{" "}
              {formatTTD(ticketPaidMinor(refundTarget.ticket))}
            </p>

            <div
              className={`mt-4 rounded-xl border px-3 py-2 text-xs ${
                policy.pastCutoff
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-emerald-200 bg-emerald-50 text-emerald-900"
              }`}
            >
              <p className="font-semibold">{policy.label}</p>
              <p className="mt-1 opacity-90">{policy.detail}</p>
            </div>

            <label className="mt-4 block text-xs font-semibold text-zinc-700">
              Refund amount (TTD)
              <input
                type="number"
                min={0.01}
                step={0.01}
                max={ticketPaidMinor(refundTarget.ticket) / 100}
                value={refundAmountDollars}
                onChange={(e) => setRefundAmountDollars(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D4450A]/30"
              />
            </label>

            {refundError ? (
              <p className="mt-3 text-sm font-medium text-red-600">{refundError}</p>
            ) : null}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeRefundModal}
                disabled={refundProcessing}
                className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmRefund()}
                disabled={refundProcessing}
                className="flex-1 rounded-xl bg-[#D4450A] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {refundProcessing ? "Processing…" : "Confirm refund"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
