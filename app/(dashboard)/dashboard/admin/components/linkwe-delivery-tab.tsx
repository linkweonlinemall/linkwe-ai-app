"use client";

import { Fragment, useEffect, useState } from "react";

import {
  exportLinkWeManifestCSV,
  getLinkWeDeliveryQueue,
  markOutForLinkWeDelivery,
} from "@/app/actions/admin-linkwe-delivery";
import {
  computeSplitWeightLbs,
  formatWeightLbs,
  resolveUnitWeightLbs,
} from "@/lib/orders/split-weight";

type QueueRow = Awaited<ReturnType<typeof getLinkWeDeliveryQueue>>[number];

const SCARLET = "#D4450A";

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatTTD(minor: number): string {
  return `TTD ${(minor / 100).toLocaleString("en-TT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatRegion(region: string): string {
  return region.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function splitRef(row: QueueRow): string {
  return row.referenceNumber ?? `SP-${row.id.slice(-8).toUpperCase()}`;
}

function mainRef(row: QueueRow): string {
  return row.mainOrder.referenceNumber ?? "—";
}

function DeliveryCard({
  row,
  readOnly,
  selected,
  onToggleSelect,
  onMarked,
}: {
  row: QueueRow;
  readOnly?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onMarked?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleMarkOut() {
    setSubmitting(true);
    try {
      const result = await markOutForLinkWeDelivery(row.id);
      if ("error" in result) {
        console.error(result.error);
        return;
      }
      onMarked?.();
    } finally {
      setSubmitting(false);
    }
  }

  const weight = computeSplitWeightLbs(row.items, row.mainOrder.items);
  const addr = row.mainOrder.shippingAddress;
  const directionsUrl =
    addr?.latitude != null && addr?.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${String(addr.latitude)},${String(addr.longitude)}`
      : addr?.line1
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr.line1)}`
        : null;

  return (
    <div
      className="rounded-xl bg-white p-4 sm:p-5"
      style={{
        border: "1px solid var(--card-border)",
        backgroundColor: selected ? "#EFF6FF" : "#FFFFFF",
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {!readOnly && onToggleSelect ? (
              <div onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selected ?? false}
                  onChange={onToggleSelect}
                  className="rounded"
                  aria-label={`Select ${splitRef(row)}`}
                />
              </div>
            ) : null}
            <p className="text-sm font-semibold text-zinc-900">{row.store.name}</p>
            <span
              className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor: readOnly ? "#EFF6FF" : "#FFF7ED",
                color: readOnly ? "#1D4ED8" : "#C2410C",
              }}
            >
              {readOnly ? "Out for delivery" : "Ready for LinkWe"}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-zinc-500">{splitRef(row)}</p>
          <p className="mt-2 text-sm text-zinc-800">{row.mainOrder.buyer.fullName}</p>
          <p className="text-xs text-zinc-500">{row.mainOrder.buyer.email}</p>
          {row.mainOrder.shippingAddress?.line1 ? (
            <p className="mt-1 text-xs font-medium text-zinc-700">
              {row.mainOrder.shippingAddress.line1}
            </p>
          ) : null}
          {row.mainOrder.shippingAddress?.phone ? (
            <a
              href={`tel:${row.mainOrder.shippingAddress.phone.replace(/\s+/g, "")}`}
              className="text-xs text-zinc-500 underline-offset-2 hover:underline"
            >
              Tel: {row.mainOrder.shippingAddress.phone}
            </a>
          ) : null}
          <p className="mt-1 text-xs capitalize text-zinc-500">
            {formatRegion(row.mainOrder.region)}
          </p>
          {directionsUrl ? (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium"
              style={{ color: SCARLET }}
            >
              Get directions →
            </a>
          ) : null}
          <p className="mt-2 text-xs font-medium" style={{ color: SCARLET }}>
            LinkWe fee: {formatTTD(row.shippingMinor)}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Total weight: {formatWeightLbs(weight.totalLbs)} lb
          </p>
        </div>
        {!readOnly ? (
          <button
            type="button"
            onClick={handleMarkOut}
            disabled={submitting}
            className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: SCARLET }}
          >
            {submitting ? "Updating…" : "Mark out for delivery"}
          </button>
        ) : null}
      </div>

      <div className="mt-4 border-t border-zinc-100 pt-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Items
        </p>
        <ul className="flex flex-col gap-1.5">
          {row.items.map((item, idx) => {
            const unitLbs = resolveUnitWeightLbs(item.titleSnapshot, row.mainOrder.items);
            return (
            <li
              key={`${row.id}-${idx}`}
              className="flex items-center justify-between gap-3 text-xs text-zinc-700"
            >
              <span className="min-w-0 truncate">
                {item.quantity}× {item.titleSnapshot}
                {unitLbs > 0 ? (
                  <span className="text-zinc-400"> · {formatWeightLbs(unitLbs)} lb each</span>
                ) : null}
              </span>
              <span className="shrink-0 font-mono text-zinc-500">
                {formatTTD(item.unitPriceMinor * item.quantity)}
              </span>
            </li>
            );
          })}
        </ul>
        <p className="mt-2 text-right text-xs font-semibold text-zinc-800">
          Subtotal {formatTTD(row.subtotalMinor)}
        </p>
        <p className="mt-0.5 text-right text-[10px] text-zinc-400">Main order {mainRef(row)}</p>
      </div>
    </div>
  );
}

function SectionHeader({
  label,
  count,
  color,
  bg,
}: {
  label: string;
  count: number;
  color: string;
  bg: string;
}) {
  return (
    <div
      className="rounded-xl px-4 py-2"
      style={{ backgroundColor: bg, border: "1px solid var(--card-border)" }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color }}>
        {label}
      </span>
      <span className="ml-2 text-[10px] font-normal" style={{ color, opacity: 0.6 }}>
        · {count}
      </span>
    </div>
  );
}

export default function LinkWeDeliveryTab() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkSummary, setBulkSummary] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getLinkWeDeliveryQueue()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const readyRows = rows.filter((r) => r.status === "READY_FOR_LINKWE");
  const outRows = rows.filter((r) => r.status === "OUT_FOR_DELIVERY");

  const readyIds = readyRows.map((r) => r.id);
  const allReadySelected =
    readyIds.length > 0 && readyIds.every((id) => selectedIds.has(id));

  function toggleAllReady() {
    if (allReadySelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(readyIds));
    }
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleExport() {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : readyIds;
    const csv = await exportLinkWeManifestCSV(ids);
    downloadCsv(
      csv,
      `linkwe-delivery-manifest-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }

  async function handleBulkMark() {
    setBulkProcessing(true);
    setBulkSummary(null);
    let marked = 0;
    let failed = 0;
    try {
      for (const id of selectedIds) {
        const result = await markOutForLinkWeDelivery(id);
        if ("error" in result) {
          failed += 1;
        } else {
          marked += 1;
        }
      }
      setBulkSummary(
        failed > 0 ? `Marked ${marked}, ${failed} failed` : `Marked ${marked}`,
      );
      setSelectedIds(new Set());
      setRefreshKey((k) => k + 1);
    } finally {
      setBulkProcessing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          LinkWe Delivery
        </h2>
        <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
          LINKWE-mode orders vendors have packed and handed off for LinkWe to deliver
        </p>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div
          className="rounded-xl bg-white p-4 text-center"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <p className="text-lg font-bold" style={{ color: SCARLET }}>
            {readyRows.length}
          </p>
          <p className="text-xs text-zinc-400">Ready for LinkWe</p>
        </div>
        <div
          className="rounded-xl bg-white p-4 text-center"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <p className="text-lg font-bold text-blue-700">{outRows.length}</p>
          <p className="text-xs text-zinc-400">Out for delivery</p>
        </div>
        <div
          className="col-span-2 rounded-xl bg-white p-4 text-center sm:col-span-1"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <p className="text-lg font-bold text-zinc-900">
            {formatTTD(rows.reduce((sum, r) => sum + r.shippingMinor, 0))}
          </p>
          <p className="text-xs text-zinc-400">Total LinkWe fees</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-zinc-400">Loading LinkWe delivery queue…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-16 text-center shadow-sm">
          <p className="text-base font-semibold text-zinc-900">
            No orders waiting for LinkWe delivery.
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Orders appear here when vendors mark them ready for LinkWe pickup.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {readyRows.length > 0 ? (
            <div className="flex flex-col gap-3">
              <SectionHeader
                label="Ready for LinkWe"
                count={readyRows.length}
                color="#C2410C"
                bg="#FFF7ED"
              />

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600">
                  <input
                    type="checkbox"
                    checked={allReadySelected}
                    onChange={toggleAllReady}
                    className="rounded"
                  />
                  Select all ready ({readyRows.length})
                </label>
                {selectedIds.size === 0 ? (
                  <button
                    type="button"
                    onClick={handleExport}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
                  >
                    Export all ready ({readyRows.length})
                  </button>
                ) : null}
              </div>

              {selectedIds.size > 0 ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
                  <span className="text-sm font-medium text-zinc-700">
                    {selectedIds.size} selected
                  </span>
                  <div className="h-4 w-px bg-zinc-200" />
                  <button
                    type="button"
                    onClick={handleBulkMark}
                    disabled={bulkProcessing}
                    className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: SCARLET }}
                  >
                    {bulkProcessing
                      ? "Updating…"
                      : `Mark selected out for delivery (${selectedIds.size})`}
                  </button>
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={bulkProcessing}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Export manifest CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIds(new Set());
                      setBulkSummary(null);
                    }}
                    className="ml-auto text-xs text-zinc-400 transition-colors hover:text-zinc-700"
                  >
                    Clear selection
                  </button>
                </div>
              ) : null}

              {bulkSummary ? (
                <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                  {bulkSummary}
                </p>
              ) : null}

              {readyRows.map((row) => (
                <DeliveryCard
                  key={row.id}
                  row={row}
                  selected={selectedIds.has(row.id)}
                  onToggleSelect={() => toggleRow(row.id)}
                  onMarked={() => setRefreshKey((k) => k + 1)}
                />
              ))}
            </div>
          ) : null}

          {outRows.length > 0 ? (
            <div className="flex flex-col gap-3">
              <SectionHeader
                label="Out for delivery"
                count={outRows.length}
                color="#1D4ED8"
                bg="#EFF6FF"
              />
              {outRows.map((row) => (
                <Fragment key={row.id}>
                  <DeliveryCard row={row} readOnly />
                </Fragment>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
