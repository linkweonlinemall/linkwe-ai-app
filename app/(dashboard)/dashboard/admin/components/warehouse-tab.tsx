"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

import { deleteAllWarehouseQueue } from "@/app/actions/admin-delete";

import UndoDeleteToast from "./undo-delete-toast";
import { getWarehouseIncomingQueue, getWarehouseReceivedToday } from "@/app/actions/admin-warehouse";
import { markItemsReceivedAtWarehouse } from "@/app/actions/warehouse";

type SplitOrderRow = Awaited<ReturnType<typeof getWarehouseIncomingQueue>>[number];
type ReceivedRow = Awaited<ReturnType<typeof getWarehouseReceivedToday>>[number];
type TableRow = SplitOrderRow | ReceivedRow;

export default function WarehouseTab() {
  const [rows, setRows] = useState<SplitOrderRow[]>([]);
  const [receivedToday, setReceivedToday] = useState<ReceivedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<"ALL" | "DROPOFF" | "COURIER">("ALL");
  const [selectedStatus, setSelectedStatus] = useState<"INCOMING" | "RECEIVED">("INCOMING");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [singleModal, setSingleModal] = useState<SplitOrderRow | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [recentlyReceived, setRecentlyReceived] = useState<
    { id: string; ref: string; vendor: string; time: Date }[]
  >([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([getWarehouseIncomingQueue(), getWarehouseReceivedToday()])
      .then(([incoming, received]) => {
        setRows(incoming);
        setReceivedToday(received);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [refreshKey]);

  function formatTTD(minor: number): string {
    return `TTD ${(minor / 100).toLocaleString("en-TT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function getWaitTime(createdAt: Date | string): { label: string; isLong: boolean } {
    const ms = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(ms / 60000);
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    const isLong = hours >= 2;
    const label = hours > 0 ? `${hours}h ${remainingMins}m` : `${mins}m`;
    return { label, isLong };
  }

  function getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      VENDOR_PREPARING: "Preparing",
      AWAITING_COURIER_PICKUP: "Awaiting Courier",
      COURIER_ASSIGNED: "Courier Assigned",
      COURIER_PICKED_UP: "En Route",
      VENDOR_DROPPED_OFF: "Dropped Off",
      AT_WAREHOUSE: "At Warehouse",
      PACKAGED: "Packaged",
    };
    return map[status] ?? status;
  }

  const filteredRows = useMemo(() => {
    let data: TableRow[] =
      selectedStatus === "INCOMING" ? rows : receivedToday;

    if (selectedMethod === "DROPOFF") {
      data = data.filter((r) => r.vendorInboundMethod === "VENDOR_DROPOFF");
    } else if (selectedMethod === "COURIER") {
      data = data.filter((r) => r.vendorInboundMethod === "PICKUP_REQUESTED");
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      data = data.filter(
        (r) =>
          (r.referenceNumber ?? r.id).toLowerCase().includes(q) ||
          r.store.name.toLowerCase().includes(q) ||
          (r.inboundShipment ?? r.legacyInboundShipment)?.courier?.fullName?.toLowerCase().includes(q) ||
          r.mainOrder.buyer.fullName.toLowerCase().includes(q),
      );
    }

    return data;
  }, [rows, receivedToday, selectedStatus, selectedMethod, searchTerm]);

  const totalIncomingCount = rows.length;
  const totalReceivedTodayCount = receivedToday.length;
  const totalQueueValue = rows.reduce((sum, r) => sum + r.subtotalMinor, 0);
  const oldestRow = rows[0];
  const oldestWait = oldestRow ? getWaitTime(oldestRow.createdAt) : null;

  const visibleIds = filteredRows.map((r) => r.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedRows.has(id));
  const someSelected = visibleIds.some((id) => selectedRows.has(id)) && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelectedRows((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedRows((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  function toggleRow(id: string) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSingleReceive(row: SplitOrderRow) {
    const fd = new FormData();
    fd.append("splitOrderId", row.id);
    await markItemsReceivedAtWarehouse(fd);
    setRecentlyReceived((prev) => [
      {
        id: row.id,
        ref: row.referenceNumber ?? row.id.slice(-6),
        vendor: row.store.name,
        time: new Date(),
      },
      ...prev.slice(0, 4),
    ]);
    setSingleModal(null);
    setRefreshKey((k) => k + 1);
  }

  async function handleBulkReceive() {
    if (selectedStatus !== "INCOMING") return;
    setBulkProcessing(true);
    const selected = filteredRows.filter((r) => selectedRows.has(r.id)) as SplitOrderRow[];
    await Promise.allSettled(
      selected.map((row) => {
        const fd = new FormData();
        fd.append("splitOrderId", row.id);
        return markItemsReceivedAtWarehouse(fd);
      }),
    );
    const newRecent = selected.map((row) => ({
      id: row.id,
      ref: row.referenceNumber ?? row.id.slice(-6),
      vendor: row.store.name,
      time: new Date(),
    }));
    setRecentlyReceived((prev) => [...newRecent, ...prev].slice(0, 5));
    setSelectedRows(new Set());
    setShowBulkModal(false);
    setBulkProcessing(false);
    setRefreshKey((k) => k + 1);
  }

  const bulkEnabled = selectedRows.size > 0 && selectedStatus === "INCOMING";

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-5">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Warehouse
        </h2>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-4">
        <div
          className="rounded-xl bg-white p-4 text-center"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <p className="text-lg font-bold text-zinc-900">{totalIncomingCount}</p>
          <p className="text-xs text-zinc-400">Incoming</p>
        </div>
        <div
          className="rounded-xl bg-white p-4 text-center"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <p className="text-lg font-bold text-emerald-600">{totalReceivedTodayCount}</p>
          <p className="text-xs text-zinc-400">Received</p>
        </div>
        <div
          className="rounded-xl bg-white p-4 text-center"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <p className="text-lg font-bold" style={{ color: "#D4450A" }}>
            {formatTTD(totalQueueValue)}
          </p>
          <p className="text-xs text-zinc-400">Queue value</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by reference, vendor, or courier..."
          className="min-w-[240px] flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm shadow-sm outline-none ring-zinc-300 focus:ring-2"
        />

        <div className="flex overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          {(["ALL", "DROPOFF", "COURIER"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSelectedMethod(m)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                selectedMethod === m ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {m === "ALL"
                ? `All (${rows.length})`
                : m === "DROPOFF"
                  ? `Dropoff (${rows.filter((r) => r.vendorInboundMethod === "VENDOR_DROPOFF").length})`
                  : `Courier (${rows.filter((r) => r.vendorInboundMethod === "PICKUP_REQUESTED").length})`}
            </button>
          ))}
        </div>

        <div className="flex overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          {(["INCOMING", "RECEIVED"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSelectedStatus(s)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                selectedStatus === s ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {s === "INCOMING"
                ? `Incoming (${totalIncomingCount})`
                : `Received Today (${totalReceivedTodayCount})`}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => bulkEnabled && setShowBulkModal(true)}
          disabled={!bulkEnabled}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            bulkEnabled ? "text-white hover:opacity-90" : "cursor-not-allowed bg-zinc-100 text-zinc-400"
          }`}
          style={bulkEnabled ? { backgroundColor: "#D4450A" } : {}}
        >
          Mark received ({selectedRows.size})
        </button>

        <button
          type="button"
          onClick={() => setPendingDelete(true)}
          className="ml-auto rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
        >
          Clear queue
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#1A7FB5" }} />
          Drop off
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#D4450A" }} />
          Courier pickup
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#FAEEDA" }} />
          Waiting over 2 hours
        </span>
      </div>

      {oldestWait && selectedStatus === "INCOMING" ? (
        <p className="text-xs text-zinc-500">
          {totalIncomingCount} incoming — {formatTTD(totalQueueValue)} total value — oldest waiting{" "}
          <span className={oldestWait.isLong ? "font-semibold text-amber-600" : ""}>{oldestWait.label}</span>
        </p>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-zinc-400">Loading warehouse queue...</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-16 text-center shadow-sm">
          <p className="text-base font-semibold text-zinc-900">
            {selectedStatus === "INCOMING" ? "No items in queue" : "Nothing received today yet"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {searchTerm
              ? `No results for "${searchTerm}"`
              : "Items will appear here when vendors confirm fulfillment."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white" style={{ border: "1px solid var(--card-border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-xs font-semibold uppercase tracking-wide"
                style={{
                  color: "var(--text-muted)",
                  backgroundColor: "#F7F7F6",
                  borderBottom: "1px solid var(--card-border-subtle)",
                }}
              >
                <th className="w-9 py-3 pl-5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="px-5 py-3 text-left">Ref</th>
                <th className="px-5 py-3 text-left">Vendor</th>
                <th className="px-5 py-3 text-left">Method</th>
                <th className="px-5 py-3 text-left">Items</th>
                <th className="px-5 py-3 text-right">Subtotal</th>
                <th className="px-5 py-3 text-left">Customer</th>
                <th className="px-5 py-3 text-left">Courier</th>
                <th className="px-5 py-3 text-left">Age</th>
                {selectedStatus === "INCOMING" ? (
                  <th className="px-5 py-3 text-left">Action</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const wait = getWaitTime(row.createdAt);
                const isLongWait = wait.isLong;
                const isSelected = selectedRows.has(row.id);
                const itemsPreview = row.items
                  .slice(0, 2)
                  .map((i) => `${i.quantity}× ${i.titleSnapshot}`)
                  .join(", ");
                const extraItems = row.items.length - 2;

                const isDropoff = row.vendorInboundMethod === "VENDOR_DROPOFF";
                const isCourier = row.vendorInboundMethod === "PICKUP_REQUESTED";

                const rowBg = isSelected
                  ? "bg-orange-50"
                  : isLongWait && isDropoff
                    ? "bg-[#FFF3E0]"
                    : isLongWait && isCourier
                      ? "bg-[#FFF0F0]"
                      : isDropoff
                        ? "bg-[#F0F7FF]"
                        : isCourier
                          ? "bg-white"
                          : "bg-white";

                return (
                  <Fragment key={row.id}>
                    <tr
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('input[type="checkbox"]') || target.closest("button")) return;
                        setExpandedRow((prev) => (prev === row.id ? null : row.id));
                      }}
                      className={`cursor-pointer border-b border-zinc-100 transition-colors ${rowBg} hover:bg-orange-50/50`}
                      style={{
                        borderLeft: isDropoff
                          ? "3px solid #1A7FB5"
                          : isCourier
                            ? "3px solid #D4450A"
                            : "3px solid transparent",
                      }}
                    >
                    <td className="py-3 pl-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(row.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-zinc-600">
                          {row.referenceNumber ?? row.id.slice(-8).toUpperCase()}
                        </span>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className={`text-zinc-400 transition-transform duration-150 ${
                            expandedRow === row.id ? "rotate-180" : ""
                          }`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-medium text-zinc-900">{row.store.name}</span>
                    </td>
                    <td className="px-3 py-3">
                      {row.vendorInboundMethod === "VENDOR_DROPOFF" ? (
                        <span
                          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: "#E6F1FB", color: "#0C447C" }}
                        >
                          Drop off
                        </span>
                      ) : (
                        <span
                          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: "#FAEEDA", color: "#633806" }}
                        >
                          Courier
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-zinc-700">
                        {itemsPreview}
                        {extraItems > 0 ? <span className="text-zinc-400"> +{extraItems} more</span> : null}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="font-mono text-xs font-medium text-zinc-900">
                        {formatTTD(row.subtotalMinor)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-xs text-zinc-900">{row.mainOrder.buyer.fullName}</p>
                      <p className="text-xs capitalize text-zinc-400">
                        {row.mainOrder.region?.replace(/_/g, " ")}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-zinc-600">
                        {(row.inboundShipment ?? row.legacyInboundShipment)?.courier?.fullName ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`text-xs ${isLongWait ? "font-semibold text-amber-600" : "text-zinc-500"}`}
                      >
                        {wait.label}
                      </span>
                    </td>
                    {selectedStatus === "INCOMING" ? (
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => setSingleModal(row as SplitOrderRow)}
                          className="rounded-lg border border-[#D4450A] px-3 py-1 text-xs font-semibold text-[#D4450A] transition-colors hover:bg-[#D4450A] hover:text-white"
                        >
                          Receive
                        </button>
                      </td>
                    ) : null}
                  </tr>
                  {expandedRow === row.id ? (
                    <tr key={`${row.id}-expanded`} className="border-b border-zinc-200 bg-zinc-50">
                      <td
                        colSpan={selectedStatus === "INCOMING" ? 10 : 9}
                        className="px-6 py-4"
                      >
                        <div className="grid grid-cols-3 gap-6">
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                              Items
                            </p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-zinc-200">
                                  <th className="py-1 text-left text-zinc-400">Item</th>
                                  <th className="py-1 text-center text-zinc-400">Qty</th>
                                  <th className="py-1 text-right text-zinc-400">Price</th>
                                  <th className="py-1 text-right text-zinc-400">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {row.items.map((item) => (
                                  <tr key={item.id} className="border-b border-zinc-100">
                                    <td className="py-1.5 text-zinc-800">{item.titleSnapshot}</td>
                                    <td className="py-1.5 text-center text-zinc-600">{item.quantity}</td>
                                    <td className="py-1.5 text-right font-mono text-zinc-600">
                                      {formatTTD(item.unitPriceMinor)}
                                    </td>
                                    <td className="py-1.5 text-right font-mono font-medium text-zinc-900">
                                      {formatTTD(item.unitPriceMinor * item.quantity)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr>
                                  <td colSpan={3} className="pt-2 text-xs font-semibold text-zinc-900">
                                    Subtotal
                                  </td>
                                  <td
                                    className="pt-2 text-right font-mono text-sm font-bold"
                                    style={{ color: "#D4450A" }}
                                  >
                                    {formatTTD(row.subtotalMinor)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>

                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                              Order Info
                            </p>
                            <div className="flex flex-col gap-2">
                              <div>
                                <p className="text-xs text-zinc-400">Main order</p>
                                <p className="font-mono text-sm font-medium text-zinc-900">
                                  {row.mainOrder.referenceNumber ?? "—"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-zinc-400">Customer</p>
                                <p className="text-sm font-medium text-zinc-900">
                                  {row.mainOrder.buyer.fullName}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-zinc-400">Delivery region</p>
                                <p className="text-sm capitalize text-zinc-700">
                                  {row.mainOrder.region?.replace(/_/g, " ") ?? "—"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-zinc-400">Split order ref</p>
                                <p className="font-mono text-sm text-zinc-700">
                                  {row.referenceNumber ?? row.id.slice(-8).toUpperCase()}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                              Arrival Info
                            </p>
                            <div className="flex flex-col gap-2">
                              <div>
                                <p className="text-xs text-zinc-400">Method</p>
                                <p className="text-sm font-medium text-zinc-900">
                                  {row.vendorInboundMethod === "VENDOR_DROPOFF"
                                    ? "Vendor drop off"
                                    : "Courier pickup"}
                                </p>
                              </div>
                              {(() => {
                                const inboundLeg = row.inboundShipment ?? row.legacyInboundShipment;
                                return inboundLeg?.courier ? (
                                  <div>
                                    <p className="text-xs text-zinc-400">Courier</p>
                                    <p className="text-sm font-medium text-zinc-900">
                                      {inboundLeg.courier.fullName}
                                    </p>
                                  </div>
                                ) : null;
                              })()}
                              <div>
                                <p className="text-xs text-zinc-400">Status</p>
                                <p className="text-sm font-medium text-zinc-900">
                                  {getStatusLabel(row.status)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-zinc-400">Waiting</p>
                                <p
                                  className={`text-sm font-medium ${
                                    getWaitTime(row.createdAt).isLong ? "text-amber-600" : "text-zinc-900"
                                  }`}
                                >
                                  {getWaitTime(row.createdAt).label}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {selectedStatus === "INCOMING" ? (
                          <div className="mt-4 flex justify-end gap-3 border-t border-zinc-200 pt-4">
                            <button
                              type="button"
                              onClick={() => setExpandedRow(null)}
                              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50"
                            >
                              Close
                            </button>
                            <button
                              type="button"
                              onClick={() => setSingleModal(row as SplitOrderRow)}
                              className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
                              style={{ backgroundColor: "#D4450A" }}
                            >
                              Mark as Received
                            </button>
                          </div>
                        ) : null}
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

      {recentlyReceived.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-zinc-400">Just received:</span>
          {recentlyReceived.map((r) => (
            <span
              key={`${r.id}-${r.time.getTime()}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {r.ref} — {r.vendor}
            </span>
          ))}
        </div>
      ) : null}

      {singleModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-zinc-400">
                  {singleModal.referenceNumber ?? singleModal.id.slice(-8)}
                </p>
                <h3 className="mt-0.5 text-lg font-bold text-zinc-900">{singleModal.store.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSingleModal(null)}
                className="text-zinc-400 hover:text-zinc-700"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="mb-4 flex gap-2">
              {singleModal.vendorInboundMethod === "VENDOR_DROPOFF" ? (
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: "#E6F1FB", color: "#0C447C" }}
                >
                  Drop off
                </span>
              ) : (
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: "#FAEEDA", color: "#633806" }}
                >
                  Courier pickup
                </span>
              )}
              {(() => {
                const inboundLeg = singleModal.inboundShipment ?? singleModal.legacyInboundShipment;
                return inboundLeg?.courier ? (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600">
                    {inboundLeg.courier.fullName}
                  </span>
                ) : null;
              })()}
              {singleModal.mainOrder.referenceNumber ? (
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-mono text-xs text-zinc-500">
                  {singleModal.mainOrder.referenceNumber}
                </span>
              ) : null}
            </div>

            <table className="mb-4 w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="py-2 text-left text-xs font-semibold uppercase text-zinc-400">Qty</th>
                  <th className="py-2 text-left text-xs font-semibold uppercase text-zinc-400">Item</th>
                  <th className="py-2 text-right text-xs font-semibold uppercase text-zinc-400">Price</th>
                </tr>
              </thead>
              <tbody>
                {singleModal.items.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-50">
                    <td className="py-2 text-zinc-600">{item.quantity}</td>
                    <td className="py-2 text-zinc-900">{item.titleSnapshot}</td>
                    <td className="py-2 text-right font-mono text-zinc-700">
                      {formatTTD(item.unitPriceMinor * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="pt-3 text-sm font-semibold text-zinc-900">
                    Total
                  </td>
                  <td className="pt-3 text-right font-mono font-bold" style={{ color: "#D4450A" }}>
                    {formatTTD(singleModal.subtotalMinor)}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSingleModal(null)}
                className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSingleReceive(singleModal)}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: "#D4450A" }}
              >
                Confirm Received
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showBulkModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Confirm Bulk Receive</h3>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Receiving {selectedRows.size} split order{selectedRows.size !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="text-zinc-400 hover:text-zinc-700"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <table className="mb-4 w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-zinc-400">Ref</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-zinc-400">Vendor</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-zinc-400">Items</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-zinc-400">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(filteredRows as SplitOrderRow[]).filter((r) => selectedRows.has(r.id)).map((row) => (
                  <tr key={row.id} className="border-b border-zinc-50">
                    <td className="px-3 py-2 font-mono text-xs text-zinc-500">
                      {row.referenceNumber ?? row.id.slice(-8)}
                    </td>
                    <td className="px-3 py-2 font-medium text-zinc-900">{row.store.name}</td>
                    <td className="px-3 py-2 text-xs text-zinc-600">
                      {row.items.length} item type{row.items.length !== 1 ? "s" : ""}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{formatTTD(row.subtotalMinor)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="px-3 pt-3 text-sm font-semibold text-zinc-900">
                    Total
                  </td>
                  <td className="px-3 pt-3 text-right font-mono font-bold" style={{ color: "#D4450A" }}>
                    {formatTTD(
                      (filteredRows as SplitOrderRow[])
                        .filter((r) => selectedRows.has(r.id))
                        .reduce((sum, r) => sum + r.subtotalMinor, 0),
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                disabled={bulkProcessing}
                className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleBulkReceive()}
                disabled={bulkProcessing}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#D4450A" }}
              >
                {bulkProcessing ? "Processing..." : `Confirm All ${selectedRows.size}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <UndoDeleteToast
          message={`Clear warehouse queue (${rows.length} items)`}
          onConfirm={async () => {
            await deleteAllWarehouseQueue();
            setPendingDelete(false);
            setRefreshKey((k) => k + 1);
          }}
          onCancel={() => setPendingDelete(false)}
        />
      ) : null}
    </div>
  );
}
