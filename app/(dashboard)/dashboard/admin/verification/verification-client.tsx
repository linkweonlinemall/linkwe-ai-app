"use client";

import type { IdVerificationStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { adminVerifyId } from "@/app/actions/vendor-verification";

export type VerificationVendor = {
  id: string;
  fullName: string;
  email: string;
  idDocumentUrl: string | null;
  idVerificationStatus: IdVerificationStatus;
  createdAt: Date;
  bankDetails: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    accountType: string | null;
  } | null;
  storesOwned: { name: string; slug: string }[];
};

type Props = {
  pending: VerificationVendor[];
  reviewed: VerificationVendor[];
};

export default function VerificationClient({ pending, reviewed }: Props) {
  const router = useRouter();
  const printTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filter, setFilter] = useState<"all" | "eligible">("eligible");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const filteredPending =
    filter === "eligible" ? pending.filter((v) => v.idDocumentUrl && v.bankDetails) : pending;

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
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              filter === "eligible"
                ? "bg-[#D4450A] text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
            onClick={() => setFilter("eligible")}
          >
            Ready to approve
            <span className="ml-2 text-xs opacity-75">
              ({pending.filter((v) => v.idDocumentUrl && v.bankDetails).length})
            </span>
          </button>
          <button
            type="button"
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-[#D4450A] text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
            onClick={() => setFilter("all")}
          >
            All pending
            <span className="ml-2 text-xs opacity-75">({pending.length})</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="
              flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white
              px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50
            "
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
            className="
              flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white
              px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50
            "
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

      <div className="mb-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">
            Pending review ({pending.length})
          </h2>
          {filteredPending.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-500">
                <input
                  checked={selected.length === filteredPending.length && filteredPending.length > 0}
                  className="rounded"
                  type="checkbox"
                  onChange={toggleAll}
                />
                Select all
              </label>
              {selected.length > 0 ? (
                <>
                  <button
                    type="button"
                    disabled={loading}
                    className="
                      rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white
                      hover:opacity-90 disabled:opacity-50
                    "
                    onClick={() => void handleBulk(true)}
                  >
                    ✓ Approve {selected.length}
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    className="
                      rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white
                      hover:opacity-90 disabled:opacity-50
                    "
                    onClick={() => void handleBulk(false)}
                  >
                    ✗ Reject {selected.length}
                  </button>
                  <button type="button" className="text-xs text-zinc-400 hover:text-zinc-700" onClick={() => setSelected([])}>
                    Clear
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        {pending.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
            <p className="text-sm text-zinc-400">No pending verifications</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredPending.map((vendor) => (
              <div
                key={vendor.id}
                className={`rounded-2xl border p-5 shadow-sm transition-colors ${
                  selected.includes(vendor.id) ? "border-[#D4450A]/40 bg-[#D4450A]/5" : "border-zinc-200 bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    checked={selected.includes(vendor.id)}
                    className="mt-1 rounded"
                    type="checkbox"
                    onChange={() => toggleSelect(vendor.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <p className="font-semibold text-zinc-900">{vendor.fullName}</p>
                          <span
                            className="
                              rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5
                              text-[10px] font-bold text-amber-700
                            "
                          >
                            Pending
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">{vendor.email}</p>
                        {vendor.storesOwned[0] ? (
                          <p className="mt-0.5 text-xs text-zinc-500">Store: {vendor.storesOwned[0].name}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-zinc-400">
                          Registered {new Date(vendor.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          disabled={loading}
                          className="
                            rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs
                            font-medium text-red-600 hover:bg-red-100 disabled:opacity-50
                          "
                          onClick={() => void handleSingle(vendor.id, false)}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={loading}
                          className="
                            rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white
                            hover:bg-emerald-600 disabled:opacity-50
                          "
                          onClick={() => void handleSingle(vendor.id, true)}
                        >
                          Approve
                        </button>
                      </div>
                    </div>

                    {vendor.idDocumentUrl ? (
                      <div className="mt-4">
                        <p className="mb-2 text-xs font-medium text-zinc-500">Submitted document:</p>
                        <a href={vendor.idDocumentUrl} rel="noopener noreferrer" target="_blank">
                          {/* eslint-disable-next-line @next/next/no-img-element -- admin reviews arbitrary upload URLs */}
                          <img
                            alt="ID Document"
                            className="
                              max-h-48 rounded-xl border border-zinc-200 object-contain
                              transition-opacity hover:opacity-90
                            "
                            src={vendor.idDocumentUrl}
                          />
                        </a>
                      </div>
                    ) : null}

                    {vendor.bankDetails ? (
                      <div className="mt-3 rounded-xl bg-zinc-50 p-3">
                        <p className="mb-1 text-xs font-medium text-zinc-500">Bank details:</p>
                        <p className="text-xs text-zinc-700">
                          {vendor.bankDetails.bankName} — {vendor.bankDetails.accountName} —{" "}
                          {vendor.bankDetails.accountNumber}
                          {vendor.bankDetails.accountType ? ` (${vendor.bankDetails.accountType})` : ""}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl bg-amber-50 p-3">
                        <p className="text-xs text-amber-700">No bank details submitted yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {reviewed.length > 0 ? (
        <div>
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
                        : "border-red-200 bg-red-50 text-red-700"
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
