"use client";

import type { IdVerificationStatus } from "@prisma/client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { adminVerifyId } from "@/app/actions/vendor-verification";

export type VerificationVendor = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  idDocumentUrl: string | null;
  idVerificationStatus: IdVerificationStatus;
  createdAt: Date;
  bankDetails: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    accountType: string | null;
  } | null;
  storesOwned: {
    name: string;
    slug: string;
    description: string | null;
    categoryId: string;
    region: string;
    logoUrl: string | null;
    tagline: string | null;
    tags: string[];
    openingHours: unknown;
    status: "DRAFT" | "PENDING_APPROVAL" | "ACTIVE";
    images: { url: string; position: number }[];
    products: { id: string; name: string; isPublished: boolean }[];
    _count: { products: number };
  }[];
};

type Props = {
  pending: VerificationVendor[];
  reviewed: VerificationVendor[];
};

// ── Display helpers ───────────────────────────────────────────────────────────

const STORE_STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  ACTIVE: { label: "Active", bg: "#F0FDF4", color: "#1B8C5A", border: "#BBF7D0" },
  PENDING_APPROVAL: { label: "Pending approval", bg: "#FFFBEB", color: "#92400E", border: "#FCD34D" },
  DRAFT: { label: "Draft", bg: "#F4F4F5", color: "#71717A", border: "#E4E4E7" },
};

function StoreStatusPill({ status }: { status: string }) {
  const cfg = STORE_STATUS_CONFIG[status] ?? STORE_STATUS_CONFIG.DRAFT;
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }}
    >
      {cfg.label}
    </span>
  );
}

const DAYS_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_SHORT: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed",
  thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun",
};

function OpeningHours({ hours }: { hours: unknown }) {
  if (!hours) return <p className="text-xs italic text-zinc-400">No opening hours set</p>;

  if (typeof hours === "object" && !Array.isArray(hours) && hours !== null) {
    const h = hours as Record<string, unknown>;
    const dayKeys = DAYS_ORDER.filter((d) => d in h);
    if (dayKeys.length > 0) {
      return (
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          {dayKeys.map((day) => {
            const slot = h[day] as Record<string, unknown> | null | undefined;
            const closed = slot && slot.isOpen === false;
            const open = typeof slot?.open === "string" ? slot.open : null;
            const close = typeof slot?.close === "string" ? slot.close : null;
            return (
              <div key={day} className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-600">{DAY_SHORT[day]}</span>
                <span className={`text-[11px] ${closed ? "text-zinc-300" : "text-zinc-500"}`}>
                  {closed ? "Closed" : open && close ? `${open}–${close}` : "Open"}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
  }

  // Unknown shape — render raw JSON in a small scrollable code block
  return (
    <pre className="max-h-20 overflow-auto rounded-lg bg-zinc-100 p-2 text-[10px] leading-relaxed text-zinc-600">
      {JSON.stringify(hours, null, 2)}
    </pre>
  );
}

// Shared readiness calculation — single source of truth used by the dossier
// header count, the sidebar score badge, and the "Ready" filter tab.
function vendorReadiness(vendor: VerificationVendor): { pass: number; total: 8 } {
  const st = vendor.storesOwned[0] ?? null;
  const checks: boolean[] = [
    !!vendor.idDocumentUrl,
    !!vendor.bankDetails,
    !!vendor.phone,
    st?.status === "ACTIVE",
    !!(st?.description?.trim()),
    !!st?.logoUrl,
    (st?.images.length ?? 0) > 0,
    (st?._count.products ?? 0) > 0,
  ];
  return { pass: checks.filter(Boolean).length, total: 8 };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function VerificationClient({ pending, reviewed }: Props) {
  const router = useRouter();
  const printTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── existing state ────────────────────────────────────────────────
  const [filter, setFilter] = useState<"all" | "eligible">("eligible");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // ── new: which row is open in the review panel ────────────────────
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  // ── reveal toggle — resets to masked when switching vendors ────────
  const [revealAccountNumber, setRevealAccountNumber] = useState(false);

  // ── document / gallery zoom overlay ─────────────────────────────
  // null = closed; a URL string = that image is shown enlarged
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  // ── mobile drill-down: "queue" (full-width list) or "dossier" (full-screen detail)
  // Only meaningful below md breakpoint — desktop always shows both panels.
  const [mobileView, setMobileView] = useState<"queue" | "dossier">("queue");

  const filteredPending =
    filter === "eligible"
      ? pending.filter((v) => vendorReadiness(v).pass === 8)
      : pending;
  const readyCount = pending.filter((v) => vendorReadiness(v).pass === 8).length;

  const selectedVendor = filteredPending.find((v) => v.id === selectedVendorId) ?? null;
  // Convenience: first (and only) store for the selected vendor
  const store = selectedVendor?.storesOwned[0] ?? null;

  // Auto-select first vendor when list changes (filter switch / after approval).
  // Auto-select is a desktop-only convenience — it must NOT push the mobile view
  // into dossier mode; on mobile the user explicitly taps a row to drill down.
  const firstId = filteredPending[0]?.id ?? null;
  const hasSelection = selectedVendor !== null;
  useEffect(() => {
    if (!hasSelection && firstId) {
      setSelectedVendorId(firstId);
      setRevealAccountNumber(false);
      setZoomUrl(null);
      // intentionally NO setMobileView("dossier") — mobile stays on the queue
    } else if (!hasSelection && !firstId) {
      // All vendors processed — snap mobile back to queue (nothing left to show)
      setMobileView("queue");
    }
  }, [firstId, hasSelection]);

  // Zoom overlay: ESC to close
  useEffect(() => {
    if (!zoomUrl) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setZoomUrl(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomUrl]);

  // Zoom overlay: prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = zoomUrl ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [zoomUrl]);

  // ── existing logic — UNCHANGED ────────────────────────────────────
  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.length === filteredPending.length ? [] : filteredPending.map((v) => v.id),
    );
  }

  async function handleBulk(approve: boolean) {
    if (selected.length === 0) return;
    setLoading(true);
    for (const id of selected) {
      await adminVerifyId(id, approve);
    }
    setSelected([]);
    setLoading(false);
    router.refresh();
  }

  async function handleSingle(id: string, approve: boolean) {
    setLoading(true);
    await adminVerifyId(id, approve);
    setLoading(false);
    router.refresh();
  }

  function exportCSV() {
    const rows: string[][] = [
      [
        "Name",
        "Email",
        "Store",
        "Status",
        "ID Submitted",
        "Bank Name",
        "Account Name",
        "Account Number",
        "Account Type",
        "Registered",
      ],
      ...pending.map((v) => [
        v.fullName,
        v.email,
        v.storesOwned[0]?.name ?? "",
        v.idVerificationStatus,
        v.idDocumentUrl ? "Yes" : "No",
        v.bankDetails?.bankName ?? "",
        v.bankDetails?.accountName ?? "",
        v.bankDetails?.accountNumber ?? "",
        v.bankDetails?.accountType ?? "",
        new Date(v.createdAt).toLocaleDateString(),
      ]),
      ...reviewed.map((v) => [
        v.fullName,
        v.email,
        v.storesOwned[0]?.name ?? "",
        v.idVerificationStatus,
        v.idDocumentUrl ? "Yes" : "No",
        v.bankDetails?.bankName ?? "",
        v.bankDetails?.accountName ?? "",
        v.bankDetails?.accountNumber ?? "",
        v.bankDetails?.accountType ?? "",
        new Date(v.createdAt).toLocaleDateString(),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `linkwe-verification-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    const allVendors = [...pending, ...reviewed];
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>LinkWe ID Verification Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
        h1 { color: #D4450A; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
        .vendor { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; 
          margin-bottom: 16px; page-break-inside: avoid; }
        .vendor-name { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
        .vendor-email { color: #666; font-size: 13px; margin-bottom: 8px; }
        .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; 
          font-size: 11px; font-weight: bold; margin-bottom: 8px; }
        .badge-pending { background: #fef3c7; color: #92400e; }
        .badge-approved { background: #d1fae5; color: #065f46; }
        .badge-rejected { background: #fee2e2; color: #991b1b; }
        .details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; 
          font-size: 13px; margin-top: 8px; }
        .detail-label { color: #666; }
        .detail-value { font-weight: 500; }
        .section { margin-bottom: 8px; }
        .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; 
          color: #999; letter-spacing: 0.05em; margin-bottom: 4px; }
        .no-bank { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; 
          padding: 8px 12px; font-size: 12px; color: #92400e; }
        @media print {
          body { padding: 12px; }
          .vendor { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <h1>LinkWe — ID Verification Report</h1>
      <p class="subtitle">Generated ${new Date().toLocaleString()} · ${allVendors.length} vendors</p>
      ${allVendors
        .map(
          (v) => `
        <div class="vendor">
          <div class="vendor-name">${v.fullName}</div>
          <div class="vendor-email">${v.email}</div>
          <span class="badge badge-${v.idVerificationStatus.toLowerCase()}">
            ${v.idVerificationStatus}
          </span>
          <div class="details">
            <div>
              <div class="detail-label">Store</div>
              <div class="detail-value">${v.storesOwned[0]?.name ?? "—"}</div>
            </div>
            <div>
              <div class="detail-label">Registered</div>
              <div class="detail-value">${new Date(v.createdAt).toLocaleDateString()}</div>
            </div>
            <div>
              <div class="detail-label">ID Document</div>
              <div class="detail-value">${v.idDocumentUrl ? "✓ Submitted" : "✗ Not submitted"}</div>
            </div>
          </div>
          ${
            v.bankDetails
              ? `
            <div class="section" style="margin-top: 12px;">
              <div class="section-title">Bank Details</div>
              <div class="details">
                <div>
                  <div class="detail-label">Bank</div>
                  <div class="detail-value">${v.bankDetails.bankName}</div>
                </div>
                <div>
                  <div class="detail-label">Account Name</div>
                  <div class="detail-value">${v.bankDetails.accountName}</div>
                </div>
                <div>
                  <div class="detail-label">Account Number</div>
                  <div class="detail-value">${v.bankDetails.accountNumber}</div>
                </div>
                <div>
                  <div class="detail-label">Account Type</div>
                  <div class="detail-value">${v.bankDetails.accountType ?? "—"}</div>
                </div>
              </div>
            </div>
          `
              : `
            <div class="no-bank" style="margin-top: 12px;">
              No bank details submitted
            </div>
          `
          }
        </div>
      `,
        )
        .join("")}
    </body>
    </html>
  `;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    if (printTimeoutRef.current) clearTimeout(printTimeoutRef.current);
    printTimeoutRef.current = setTimeout(() => {
      win.print();
      printTimeoutRef.current = null;
    }, 500);
  }
  // ── end unchanged logic ───────────────────────────────────────────

  return (
    <div>
      {/* ── Top bar: title + export actions ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">ID Verification</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            {pending.length} pending · {readyCount} ready to approve
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
            onClick={exportCSV}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
            onClick={exportPDF}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Queue + Review two-column layout ── */}
      {pending.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center shadow-sm">
          <p className="text-base font-semibold text-zinc-900">No pending verifications</p>
          <p className="mt-1 text-sm text-zinc-500">New vendor ID submissions will appear here.</p>
        </div>
      ) : (
        <div
          className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm md:flex-row"
          style={{ minHeight: "640px" }}
        >
          {/* ── Left queue ── */}
          <div
            className={`shrink-0 flex-col border-zinc-200 md:flex md:w-[230px] md:border-r ${
              mobileView === "dossier" ? "hidden" : "flex w-full border-b md:border-b-0"
            }`}
          >

            {/* Filter tabs + summary */}
            <div className="shrink-0 border-b border-zinc-200 p-3">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setFilter("eligible")}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    filter === "eligible"
                      ? "bg-[#D4450A] text-white"
                      : "text-zinc-500 hover:bg-zinc-100"
                  }`}
                >
                  Ready ({readyCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    filter === "all"
                      ? "bg-[#D4450A] text-white"
                      : "text-zinc-500 hover:bg-zinc-100"
                  }`}
                >
                  All ({pending.length})
                </button>
              </div>
            </div>

            {/* Scrollable vendor rows */}
            <div className="flex-1 overflow-y-auto">
              {filteredPending.length === 0 ? (
                <p className="p-4 text-center text-[11px] text-zinc-400">
                  No vendors match this filter
                </p>
              ) : (
                filteredPending.map((vendor) => {
                  const isQueueSelected = selectedVendorId === vendor.id;
                  const isPDF = vendor.idDocumentUrl?.toLowerCase().endsWith(".pdf");
                  const hasDoc = !!vendor.idDocumentUrl;
                  const readiness = vendorReadiness(vendor);
                  const allPass = readiness.pass === readiness.total;

                  return (
                    <div
                      key={vendor.id}
                      className={`relative flex cursor-pointer items-start gap-2 border-b border-zinc-100 px-3 py-2.5 transition-colors ${
                        isQueueSelected ? "bg-[#FFF1ED]" : "hover:bg-zinc-50"
                      }`}
                      style={{
                        borderLeft: `3px solid ${isQueueSelected ? "#D4450A" : "transparent"}`,
                      }}
                      onClick={() => {
                        setSelectedVendorId(vendor.id);
                        setRevealAccountNumber(false);
                        setZoomUrl(null);
                        setMobileView("dossier");
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(vendor.id)}
                        onChange={() => toggleSelect(vendor.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 shrink-0 rounded"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {vendor.fullName}
                        </p>
                        {vendor.storesOwned[0] ? (
                          <p className="truncate text-[10px] text-zinc-400">
                            {vendor.storesOwned[0].name}
                          </p>
                        ) : null}
                        <div className="mt-0.5 flex items-center gap-1">
                          <span className="text-[10px] text-zinc-400">
                            {new Date(vendor.createdAt).toLocaleDateString("en-TT", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                          <span
                            className={`rounded px-1 py-0.5 text-[9px] font-medium ${
                              !hasDoc
                                ? "bg-amber-50 text-amber-600"
                                : "bg-zinc-100 text-zinc-500"
                            }`}
                          >
                            {!hasDoc ? "No doc" : isPDF ? "PDF" : "IMG"}
                          </span>
                          <span
                            className={`rounded px-1 py-0.5 text-[9px] font-semibold ${
                              allPass
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {readiness.pass}/{readiness.total}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom: select-all + bulk actions */}
            <div className="shrink-0 border-t border-zinc-100 px-3 py-2.5">
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-zinc-500">
                <input
                  type="checkbox"
                  checked={
                    selected.length === filteredPending.length && filteredPending.length > 0
                  }
                  onChange={toggleAll}
                  className="rounded"
                />
                {selected.length > 0 ? `${selected.length} selected` : "Select all"}
              </label>
              {selected.length > 0 ? (
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void handleBulk(true)}
                    className="flex-1 rounded-lg bg-emerald-500 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                  >
                    ✓ Approve {selected.length}
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void handleBulk(false)}
                    className="flex-1 rounded-lg border border-red-200 bg-red-50 py-1.5 text-[10px] font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                  >
                    ✗ Reject
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {/* ── Right review panel ── */}
          <div
            className={`flex-1 overflow-y-auto ${
              mobileView === "queue" ? "hidden md:block" : "block"
            }`}
          >
            {selectedVendor ? (
              <>
                {/* Panel header */}
                <div className="border-b border-zinc-100 px-4 py-4 md:px-6">
                  {/* ── Back to queue — mobile only ── */}
                  <button
                    type="button"
                    className="mb-3 flex items-center gap-1.5 text-sm font-medium text-[#D4450A] md:hidden"
                    onClick={() => setMobileView("queue")}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Queue
                  </button>

                  {/* Name + actions — flex-wrap so very long names don't push buttons off-screen */}
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-zinc-900">
                          {selectedVendor.fullName}
                        </h3>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          Pending
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-zinc-400">
                        <span>{selectedVendor.email}</span>
                        {selectedVendor.storesOwned[0] ? (
                          <>
                            <span className="text-zinc-300">·</span>
                            <span>{selectedVendor.storesOwned[0].name}</span>
                          </>
                        ) : null}
                        <span className="text-zinc-300">·</span>
                        <span>
                          Registered{" "}
                          {new Date(selectedVendor.createdAt).toLocaleDateString("en-TT", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    {/* Action buttons — top-right, wired to existing handleSingle */}
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void handleSingle(selectedVendor.id, false)}
                        className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void handleSingle(selectedVendor.id, true)}
                        className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                      >
                        ✓ Approve
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Section A: Readiness checklist ── */}
                <div className="border-b border-zinc-100 px-6 py-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      Readiness checklist
                    </p>
                    <span className="text-[10px] text-zinc-400">
                      {vendorReadiness(selectedVendor).pass}/{vendorReadiness(selectedVendor).total} checks pass
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { label: "ID document", ok: !!selectedVendor.idDocumentUrl },
                      { label: "Bank details", ok: !!selectedVendor.bankDetails },
                      { label: "Phone on file", ok: !!selectedVendor.phone },
                      {
                        label: store
                          ? store.status === "ACTIVE"
                            ? "Store active"
                            : store.status === "PENDING_APPROVAL"
                            ? "Store pending approval"
                            : "Store in draft"
                          : "No store found",
                        ok: store?.status === "ACTIVE",
                      },
                      { label: "Description", ok: !!(store?.description?.trim()) },
                      { label: "Logo uploaded", ok: !!store?.logoUrl },
                      { label: "Gallery images", ok: (store?.images.length ?? 0) > 0 },
                      { label: "Products listed", ok: (store?._count.products ?? 0) > 0 },
                    ].map((check) => (
                      <div
                        key={check.label}
                        className={`flex items-start gap-1.5 rounded-lg px-2.5 py-2 ${
                          check.ok ? "bg-emerald-50" : "bg-amber-50"
                        }`}
                      >
                        <span
                          className={`mt-px shrink-0 text-[11px] ${
                            check.ok ? "text-emerald-500" : "text-amber-500"
                          }`}
                        >
                          {check.ok ? "✓" : "⚠"}
                        </span>
                        <span
                          className={`text-[11px] leading-tight ${
                            check.ok ? "text-emerald-700" : "font-medium text-amber-700"
                          }`}
                        >
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Section B: Identity ── */}
                <div className="border-b border-zinc-100 px-6 py-5">
                  <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    Identity
                  </p>
                  <div className="grid gap-6 lg:grid-cols-[1fr_196px]">
                    {/* ID document — large */}
                    <div>
                      <p className="mb-2 text-[10px] font-medium text-zinc-400">Submitted document</p>
                      {selectedVendor.idDocumentUrl ? (
                        selectedVendor.idDocumentUrl.startsWith("http") ? (
                          selectedVendor.idDocumentUrl.toLowerCase().endsWith(".pdf") ? (
                            <a
                              href={selectedVendor.idDocumentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-[#1A7FB5] transition-colors hover:bg-zinc-100"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                              View PDF document →
                            </a>
                          ) : (
                            <div
                              className="group relative cursor-zoom-in overflow-hidden rounded-xl border border-zinc-200"
                              onClick={() => setZoomUrl(selectedVendor.idDocumentUrl ?? null)}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element -- admin reviews arbitrary upload URLs */}
                              <img
                                alt="ID Document"
                                src={selectedVendor.idDocumentUrl}
                                className="max-h-[380px] w-full object-contain transition-opacity group-hover:opacity-95"
                              />
                              <div className="pointer-events-none absolute bottom-3 right-3 opacity-0 transition-opacity group-hover:opacity-100">
                                <span className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                                  🔍 Click to zoom
                                </span>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                            <p className="text-xs font-semibold text-amber-700">
                              ⚠️ Document uploaded with old system — file may not be accessible.
                            </p>
                            <p className="mt-1 text-xs text-amber-600">
                              Path: {selectedVendor.idDocumentUrl}
                            </p>
                            <p className="mt-1 text-xs text-amber-600">
                              Ask vendor to re-upload their ID document.
                            </p>
                          </div>
                        )
                      ) : (
                        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-8 text-center">
                          <p className="text-sm text-zinc-400">No document submitted yet</p>
                        </div>
                      )}
                    </div>
                    {/* Owner details */}
                    <div className="flex flex-col gap-3">
                      {[
                        { label: "Full name", value: selectedVendor.fullName, empty: null },
                        { label: "Email", value: selectedVendor.email, empty: null },
                        { label: "Phone", value: selectedVendor.phone, empty: "No phone on file" },
                        {
                          label: "Registered",
                          value: new Date(selectedVendor.createdAt).toLocaleDateString("en-TT", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }),
                          empty: null,
                        },
                      ].map((row) => (
                        <div key={row.label}>
                          <p className="text-[10px] text-zinc-400">{row.label}</p>
                          <p
                            className={`mt-0.5 break-all text-xs ${
                              row.value
                                ? "font-medium text-zinc-900"
                                : "italic text-zinc-400"
                            }`}
                          >
                            {row.value ?? row.empty ?? "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Section C: Store profile ── */}
                <div className="border-b border-zinc-100 px-6 py-5">
                  <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    Store profile
                  </p>
                  {store ? (
                    <>
                      {/* Logo + name + status pill + slug */}
                      <div className="mb-5 flex items-start gap-4">
                        {store.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={store.logoUrl}
                            alt={store.name}
                            className="h-14 w-14 shrink-0 rounded-xl border border-zinc-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-xl font-bold text-zinc-400">
                            {store.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-zinc-900">{store.name}</p>
                            <StoreStatusPill status={store.status} />
                          </div>
                          <p className="text-xs text-zinc-400">/{store.slug}</p>
                          {store.tagline ? (
                            <p className="mt-1 text-xs italic text-zinc-500">{store.tagline}</p>
                          ) : (
                            <p className="mt-1 text-xs italic text-zinc-300">No tagline</p>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <div className="mb-5">
                        <p className="mb-1 text-[10px] font-medium text-zinc-400">Description</p>
                        {store.description?.trim() ? (
                          <p className="text-xs leading-relaxed text-zinc-700">{store.description}</p>
                        ) : (
                          <p className="text-xs italic text-zinc-400">No description</p>
                        )}
                      </div>

                      {/* Category · Region · Tags */}
                      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <div>
                          <p className="mb-1 text-[10px] font-medium text-zinc-400">Category</p>
                          {store.categoryId ? (
                            <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                              {store.categoryId}
                            </span>
                          ) : (
                            <p className="text-xs italic text-zinc-400">No category</p>
                          )}
                        </div>
                        <div>
                          <p className="mb-1 text-[10px] font-medium text-zinc-400">Region</p>
                          <p className="text-xs font-medium capitalize text-zinc-700">
                            {store.region.replace(/_/g, " ")}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1 text-[10px] font-medium text-zinc-400">Tags</p>
                          {store.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {store.tags.slice(0, 8).map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs italic text-zinc-400">No tags</p>
                          )}
                        </div>
                      </div>

                      {/* Opening hours */}
                      <div>
                        <p className="mb-2 text-[10px] font-medium text-zinc-400">Opening hours</p>
                        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                          <OpeningHours hours={store.openingHours} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-6 text-center">
                      <p className="text-sm text-zinc-400">No store found for this vendor</p>
                    </div>
                  )}
                </div>

                {/* ── Section D: Gallery ── */}
                <div className="border-b border-zinc-100 px-6 py-5">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    Gallery
                  </p>
                  {store && store.images.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {store.images.map((img, i) => (
                        <div
                          key={i}
                          className="group relative h-20 w-20 shrink-0 cursor-zoom-in overflow-hidden rounded-xl border border-zinc-200"
                          onClick={() => setZoomUrl(img.url)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.url}
                            alt={`Gallery ${i + 1}`}
                            className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
                          />
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                            <span className="rounded-full bg-black/50 p-1.5 text-[9px] text-white backdrop-blur-sm">
                              🔍
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center">
                      <p className="text-sm text-zinc-400">No gallery images uploaded</p>
                    </div>
                  )}
                </div>

                {/* ── Section E: Bank / Payout ── */}
                <div className="border-b border-zinc-100 px-6 py-5">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    Bank / Payout
                  </p>
                  {selectedVendor.bankDetails ? (
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                      <p className="text-sm font-bold text-zinc-900">
                        {selectedVendor.bankDetails.bankName}
                      </p>
                      <p className="mt-0.5 text-sm text-zinc-700">
                        {selectedVendor.bankDetails.accountName}
                      </p>
                      {/* Account number — masked at rest with reveal toggle */}
                      <div className="mt-1 flex items-center gap-2">
                        <p className="font-mono text-sm text-zinc-600">
                          {revealAccountNumber
                            ? selectedVendor.bankDetails.accountNumber
                            : `••••${selectedVendor.bankDetails.accountNumber.slice(-4)}`}
                        </p>
                        <button
                          type="button"
                          onClick={() => setRevealAccountNumber((v) => !v)}
                          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700"
                          aria-label={revealAccountNumber ? "Hide account number" : "Reveal account number"}
                        >
                          {revealAccountNumber ? (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          ) : (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                          {revealAccountNumber ? "Hide" : "Reveal"}
                        </button>
                      </div>
                      {selectedVendor.bankDetails.accountType ? (
                        <span className="mt-1.5 inline-flex rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium uppercase text-zinc-600">
                          {selectedVendor.bankDetails.accountType}
                        </span>
                      ) : null}
                      <p className="mt-2 text-[9px] text-zinc-400">
                        {revealAccountNumber
                          ? "account number visible — click Hide to re-mask"
                          : "click Reveal to view full number"}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                      <p className="text-xs text-amber-700">No bank details submitted yet</p>
                    </div>
                  )}
                </div>

                {/* ── Section F: Products ── */}
                <div className="px-6 py-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      Products
                    </p>
                    {store && store._count.products > 0 ? (
                      <span className="text-[10px] text-zinc-400">
                        {store._count.products} total
                      </span>
                    ) : null}
                  </div>
                  {store && store._count.products > 0 ? (
                    <ul className="flex flex-col gap-1.5">
                      {store.products.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
                        >
                          <p className="text-xs font-medium text-zinc-800">{p.name}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                              p.isPublished
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-zinc-100 text-zinc-500"
                            }`}
                          >
                            {p.isPublished ? "Published" : "Draft"}
                          </span>
                        </li>
                      ))}
                      {store._count.products > store.products.length ? (
                        <li className="py-1 text-center text-[10px] text-zinc-400">
                          +{store._count.products - store.products.length} more not shown
                        </li>
                      ) : null}
                    </ul>
                  ) : (
                    <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center">
                      <p className="text-sm text-zinc-400">No products listed</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center p-12">
                <p className="text-sm text-zinc-400">Select a vendor from the queue to review</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Document zoom overlay ── */}
      {zoomUrl && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/90"
          onClick={() => setZoomUrl(null)}
          aria-modal="true"
          role="dialog"
          aria-label="Image enlarged view"
        >
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div
            className="relative h-[87vh] w-[87vw] cursor-default overflow-hidden rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- admin reviews arbitrary upload URLs */}
            <img
              src={zoomUrl}
              alt="Enlarged view"
              className="h-full w-full object-contain"
            />
            <button
              type="button"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/35"
              onClick={() => setZoomUrl(null)}
              aria-label="Close zoom"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Reviewed section — unchanged ── */}
      {reviewed.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-zinc-500">
            Reviewed ({reviewed.length})
          </h2>
          <div className="flex flex-col gap-3">
            {reviewed.map((vendor) => (
              <div
                key={vendor.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">{vendor.fullName}</p>
                  <p className="text-xs text-zinc-400">{vendor.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                      vendor.idVerificationStatus === "APPROVED"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-[#FECFBE] bg-[#FFF1ED] text-[#D4450A]"
                    }`}
                  >
                    {vendor.idVerificationStatus}
                  </span>
                  <button
                    type="button"
                    disabled={loading}
                    className="text-xs text-zinc-400 transition-colors hover:text-zinc-700 disabled:opacity-50"
                    onClick={() =>
                      void handleSingle(vendor.id, vendor.idVerificationStatus === "REJECTED")
                    }
                  >
                    {vendor.idVerificationStatus === "APPROVED" ? "Revoke" : "Approve"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
