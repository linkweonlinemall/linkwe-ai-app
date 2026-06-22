"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { IdVerificationStatus, StoreStatus } from "@prisma/client";

import GoLiveButton from "@/app/(dashboard)/dashboard/vendor/components/go-live-button";
import { savePayoutDetails, uploadIdDocument } from "@/app/actions/vendor-verification";
import { toastChangesSaved, toastImageUploaded } from "@/lib/feedback/toasts";
import { maskBankAccountBullets } from "@/lib/format/banking";
import type { VendorReadinessCheck } from "@/lib/vendor/readiness";

const TT_BANKS = [
  "Republic Bank",
  "First Citizens",
  "Scotiabank Trinidad & Tobago",
  "RBC Royal Bank",
  "JMMB Bank",
  "CIBC Caribbean",
  "Bank of Baroda Trinidad & Tobago",
  "EXIMBANK",
  "FCB Merchant Bank",
];

/** Where to fix each readiness item when not complete (null = handled in this panel). */
const READINESS_FIX_HREF: Record<VendorReadinessCheck["id"], string | null> = {
  id_document: null,
  logo: "/dashboard/vendor/store/edit",
  description: "/dashboard/vendor/store/edit",
  bank: null,
  phone: "/dashboard/vendor/settings",
};

type Props = {
  idStatus: IdVerificationStatus;
  storeStatus?: StoreStatus;
  storeId?: string;
  idDocumentUrl: string | null;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  accountType?: string | null;
  readiness: {
    checks: VendorReadinessCheck[];
    pass: number;
    total: 5;
    ready: boolean;
  };
  /** When true, omit outer card chrome for nesting inside Store profile. */
  embedded?: boolean;
};

export default function VendorVerificationChecklist({
  idStatus,
  storeStatus,
  storeId,
  idDocumentUrl,
  bankName,
  accountName,
  accountNumber,
  accountType,
  readiness,
  embedded = false,
}: Props) {
  const router = useRouter();
  const [uploadLoading, setUploadLoading] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [payoutError, setPayoutError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [currentIdStatus, setCurrentIdStatus] = useState(idStatus);
  const [hasPayout, setHasPayout] = useState(Boolean(bankName && accountName && accountNumber));

  const idConfirmed = currentIdStatus === "APPROVED";
  const storeLive = storeStatus === "ACTIVE";
  const idPending = currentIdStatus === "PENDING";
  const idRejected = currentIdStatus === "REJECTED";
  const idUnsubmitted = currentIdStatus === "UNSUBMITTED";

  async function handleIdUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError("");
    setUploadLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await uploadIdDocument(fd);
    if (result.ok) {
      setCurrentIdStatus("PENDING");
      setUploadSuccess(true);
      toastImageUploaded("ID submitted for review");
    } else {
      setUploadError(result.error ?? "Upload failed");
    }
    setUploadLoading(false);
  }

  async function handlePayoutSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPayoutError("");
    setPayoutLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await savePayoutDetails(fd);
    if (result.ok) {
      setHasPayout(true);
      setPayoutSuccess(true);
      toastChangesSaved();
      router.refresh();
    } else {
      setPayoutError(result.error ?? "Save failed");
    }
    setPayoutLoading(false);
  }

  return (
    <div
      className={
        embedded
          ? "overflow-visible rounded-none border-0 bg-transparent shadow-none"
          : "overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
      }
    >
      <div
        className={
          embedded
            ? "border-b border-zinc-100 pb-3"
            : "border-b border-zinc-100 px-5 py-4"
        }
      >
        <h2 className="text-sm font-bold text-zinc-900">
          {idConfirmed && storeLive
            ? "Confirmed to sell"
            : idConfirmed
              ? "Verified — not live yet"
              : "Sell on LinkWe"}
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          {idConfirmed && storeLive
            ? "Your store is live on LinkWe"
            : idConfirmed
              ? "Click Go live when you're ready to publish"
              : "Complete these steps to start selling on LinkWe"}
        </p>
        {idConfirmed && !storeLive && storeId ? (
          <div className="mt-3">
            <GoLiveButton storeId={storeId} />
          </div>
        ) : null}
      </div>

      <div
        className={
          embedded
            ? "border-b border-zinc-100 py-4"
            : "border-b border-zinc-100 px-5 py-4"
        }
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Requirements for approval
          </p>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              readiness.ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {readiness.pass} of {readiness.total} complete
          </span>
        </div>
        {!readiness.ready ? (
          <p className="mb-3 text-xs text-amber-700">
            Complete all five items below so an admin can approve your account.
          </p>
        ) : null}
        <ul className="flex flex-col gap-2">
          {readiness.checks.map((check) => {
            const fixHref = check.ok ? null : READINESS_FIX_HREF[check.id];
            return (
              <li
                key={check.id}
                className={`flex items-start gap-2 rounded-lg px-2.5 py-2 ${
                  check.ok ? "bg-emerald-50" : "bg-amber-50/80"
                }`}
              >
                <span
                  className={`mt-px shrink-0 text-[11px] ${check.ok ? "text-emerald-500" : "text-amber-500"}`}
                  aria-hidden
                >
                  {check.ok ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    "⚠"
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs leading-snug ${
                      check.ok ? "font-medium text-emerald-800" : "font-medium text-amber-800"
                    }`}
                  >
                    {check.label}
                  </p>
                  {!check.ok && fixHref ? (
                    <Link
                      href={fixHref}
                      className="mt-0.5 inline-block text-[11px] font-semibold text-[#D4450A] hover:underline"
                    >
                      {check.id === "phone" ? "Update in settings →" : "Edit store profile →"}
                    </Link>
                  ) : null}
                  {!check.ok && check.id === "id_document" ? (
                    <p className="mt-0.5 text-[11px] text-amber-700">Upload below</p>
                  ) : null}
                  {!check.ok && check.id === "bank" ? (
                    <p className="mt-0.5 text-[11px] text-amber-700">Save payout details below</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={embedded ? "border-b border-zinc-100 py-4" : "border-b border-zinc-100 px-5 py-4"}>
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              idConfirmed ? "bg-emerald-500" : idPending ? "bg-amber-400" : idRejected ? "bg-red-400" : "bg-zinc-200"
            }`}
          >
            {idConfirmed ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : idPending ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            ) : idRejected ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <span className="text-xs font-bold text-zinc-400">1</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-900">ID Verification</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  idConfirmed
                    ? "bg-emerald-50 text-emerald-700"
                    : idPending
                      ? "bg-amber-50 text-amber-700"
                      : idRejected
                        ? "bg-red-50 text-red-700"
                        : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {idConfirmed ? "Verified" : idPending ? "Under review" : idRejected ? "Rejected" : "Required"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              Upload a valid government-issued ID (passport, driver&apos;s licence, or national ID)
            </p>

            {idRejected ? (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                Your ID was rejected. Please upload a clearer photo and try again.
              </p>
            ) : null}

            {uploadSuccess ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                ID uploaded successfully. Our team will review it within 24 hours.
              </p>
            ) : null}

            {(idUnsubmitted || idRejected) && !uploadSuccess ? (
              <form onSubmit={handleIdUpload} className="mt-3">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    name="idDocument"
                    accept="image/*,.pdf"
                    className="text-xs text-zinc-600 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-700"
                    required
                  />
                  <button
                    type="submit"
                    disabled={uploadLoading}
                    className="shrink-0 rounded-lg bg-[#D4450A] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {uploadLoading ? "Uploading..." : "Upload"}
                  </button>
                </div>
                {uploadError ? <p className="mt-1 text-xs text-red-600">{uploadError}</p> : null}
              </form>
            ) : null}

            {idDocumentUrl && idPending ? (
              <p className="mt-2 text-xs text-zinc-400">Document submitted — awaiting admin review</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className={embedded ? "pt-4" : "px-5 py-4"}>
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              hasPayout ? "bg-emerald-500" : "bg-zinc-200"
            }`}
          >
            {hasPayout ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <span className="text-xs font-bold text-zinc-400">2</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-900">Payout Details</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  hasPayout ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {hasPayout ? "Added" : "Required"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">Add your bank details to receive payouts from sales</p>

            {payoutSuccess ? (
              <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                Payout details saved successfully.
              </p>
            ) : null}

            <form onSubmit={handlePayoutSave} className="mt-3 flex flex-col gap-2">
              <select
                name="bankName"
                defaultValue={bankName ?? ""}
                required
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
              >
                <option value="">Select bank</option>
                {TT_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <input
                name="accountName"
                defaultValue={accountName ?? ""}
                placeholder="Account name"
                required
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
              />
              {accountNumber?.trim() ? (
                <p className="text-xs leading-relaxed text-zinc-700">
                  <span className="text-zinc-500">Saved account number </span>
                  <span className="font-mono font-medium text-zinc-900">{maskBankAccountBullets(accountNumber)}</span>
                </p>
              ) : null}
              <input
                name="accountNumber"
                defaultValue=""
                autoComplete="off"
                required={!accountNumber?.trim()}
                placeholder={
                  accountNumber?.trim()
                    ? "Leave blank to keep saved number — or enter a new one"
                    : "Account number"
                }
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 font-mono text-sm focus:border-[#D4450A] focus:outline-none"
              />
              <select
                name="accountType"
                defaultValue={accountType ?? ""}
                className="
                  w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm
                  focus:border-[#D4450A] focus:outline-none
                "
              >
                <option value="">Account type (optional)</option>
                <option value="SAVINGS">Savings</option>
                <option value="CHEQUING">Chequing</option>
                <option value="CURRENT">Current</option>
              </select>
              {payoutError ? <p className="text-xs text-red-600">{payoutError}</p> : null}
              <button
                type="submit"
                disabled={payoutLoading}
                className="w-full rounded-xl bg-[#D4450A] py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {payoutLoading ? "Saving..." : hasPayout ? "Update payout details" : "Save payout details"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
