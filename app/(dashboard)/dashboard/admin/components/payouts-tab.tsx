"use client";

import { useEffect, useMemo, useState } from "react";

import { completeSplitOrder } from "@/app/actions/admin-orders";
import { exportPayoutsCSV, getPendingPayoutSplits } from "@/app/actions/admin-payouts";
import {
  computeSplitWeightLbs,
  formatWeightLbs,
  resolveUnitWeightLbs,
} from "@/lib/orders/split-weight";

type PayoutRow = Awaited<ReturnType<typeof getPendingPayoutSplits>>[number];

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

function splitRef(row: PayoutRow): string {
  return row.referenceNumber ?? `SP-${row.id.slice(-8).toUpperCase()}`;
}

function mainRef(row: PayoutRow): string {
  return row.mainOrder.referenceNumber ?? "—";
}

function formatDeliveredAt(row: PayoutRow): string {
  const d = row.deliveredAt ?? row.createdAt;
  return new Date(d).toLocaleDateString("en-TT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function PayoutCard({
  row,
  selected,
  onToggleSelect,
  onCompleted,
}: {
  row: PayoutRow;
  selected: boolean;
  onToggleSelect: () => void;
  onCompleted: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await completeSplitOrder(row.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onCompleted();
    } finally {
      setSubmitting(false);
    }
  }

  const weight = computeSplitWeightLbs(row.items, row.mainOrder.items);

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
            <div onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={selected}
                onChange={onToggleSelect}
                className="rounded"
                aria-label={`Select ${splitRef(row)}`}
              />
            </div>
            <p className="text-sm font-semibold text-zinc-900">{row.store.name}</p>
            <span
              className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: "#F0FDF4", color: "#1B8C5A" }}
            >
              Delivered
            </span>
            {row.store.shippingMode === "SELF" ? (
              <span className="inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                Self delivery
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                LinkWe delivery
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-xs text-zinc-500">{splitRef(row)}</p>
          <p className="mt-2 text-sm text-zinc-800">{row.mainOrder.buyer.fullName}</p>
          <p className="text-xs text-zinc-500">{row.mainOrder.buyer.email}</p>
          <p className="mt-1 text-xs capitalize text-zinc-500">
            {formatRegion(row.mainOrder.region)} · Delivered {formatDeliveredAt(row)}
          </p>
          <p className="mt-2 text-xs font-medium text-zinc-700">
            Subtotal {formatTTD(row.subtotalMinor)}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Shipping {formatTTD(row.shippingMinor)}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Total weight: {formatWeightLbs(weight.totalLbs)} lb
          </p>
        </div>
        <button
          type="button"
          onClick={handleComplete}
          disabled={submitting}
          className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: SCARLET }}
        >
          {submitting ? "Releasing…" : "Complete & release payout"}
        </button>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

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
        <p className="mt-0.5 text-right text-[10px] text-zinc-400">Main order {mainRef(row)}</p>
      </div>
    </div>
  );
}

export default function PayoutsTab() {
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkSummary, setBulkSummary] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getPendingPayoutSplits()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const stats = useMemo(() => {
    const storeIds = new Set(rows.map((r) => r.store.name));
    return {
      count: rows.length,
      totalSubtotalMinor: rows.reduce((sum, r) => sum + r.subtotalMinor, 0),
      storeCount: storeIds.size,
    };
  }, [rows]);

  const allIds = rows.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
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
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : allIds;
    const csv = await exportPayoutsCSV(ids);
    downloadCsv(csv, `linkwe-payouts-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  async function handleBulkComplete() {
    setBulkProcessing(true);
    setBulkSummary(null);
    let released = 0;
    let failed = 0;
    try {
      for (const id of selectedIds) {
        const result = await completeSplitOrder(id);
        if (!result.ok) {
          failed += 1;
        } else {
          released += 1;
        }
      }
      setBulkSummary(
        failed > 0
          ? `Released ${released}, ${failed} failed`
          : `Released ${released}`,
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
          Payouts
        </h2>
        <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
          Delivered orders awaiting admin completion and vendor payout release
        </p>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div
          className="rounded-xl bg-white p-4 text-center"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <p className="text-lg font-bold" style={{ color: SCARLET }}>
            {stats.count}
          </p>
          <p className="text-xs text-zinc-400">Awaiting payout</p>
        </div>
        <div
          className="rounded-xl bg-white p-4 text-center"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <p className="text-lg font-bold text-zinc-900">
            {formatTTD(stats.totalSubtotalMinor)}
          </p>
          <p className="text-xs text-zinc-400">Total subtotal</p>
        </div>
        <div
          className="col-span-2 rounded-xl bg-white p-4 text-center sm:col-span-1"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <p className="text-lg font-bold text-zinc-900">{stats.storeCount}</p>
          <p className="text-xs text-zinc-400">Stores</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-zinc-400">Loading payout queue…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-16 text-center shadow-sm">
          <p className="text-base font-semibold text-zinc-900">
            No payouts waiting. All delivered orders have been paid out.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="rounded"
              />
              Select all ({rows.length})
            </label>
            {selectedIds.size === 0 ? (
              <button
                type="button"
                onClick={handleExport}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
              >
                Export all ({rows.length})
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
                onClick={handleBulkComplete}
                disabled={bulkProcessing}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: SCARLET }}
              >
                {bulkProcessing
                  ? "Releasing…"
                  : `Complete & release selected (${selectedIds.size})`}
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={bulkProcessing}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
              >
                Export CSV
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

          {rows.map((row) => (
            <PayoutCard
              key={row.id}
              row={row}
              selected={selectedIds.has(row.id)}
              onToggleSelect={() => toggleRow(row.id)}
              onCompleted={() => setRefreshKey((k) => k + 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
