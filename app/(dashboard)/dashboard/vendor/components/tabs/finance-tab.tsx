"use client";

import { useState } from "react";

import { requestPayout, saveVendorBankDetails } from "@/app/actions/vendor";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

const BANK_OPTIONS = [
  "Republic Bank",
  "First Citizens",
  "Scotiabank Trinidad & Tobago",
  "RBC Royal Bank",
  "JMMB Bank",
  "CIBC Caribbean",
  "Bank of Baroda Trinidad & Tobago",
  "EXIMBANK",
  "FCB Merchant Bank",
] as const;

type LedgerEntry = {
  id: string;
  amountMinor: number;
  entryType: string;
  ledgerEntryType: string | null;
  description: string | null;
  createdAt: Date | string;
};

type PayoutRequest = {
  id: string;
  amountMinor: number;
  status: string;
  requestedAt: Date | string;
};

type BankDetails = {
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  accountType: string | null;
} | null;

type Props = {
  bankDetails: BankDetails;
  ledgerEntries: LedgerEntry[];
  payoutRequests: PayoutRequest[];
};

function formatTTD(minor: number): string {
  return (minor / 100).toLocaleString("en-TT", {
    style: "currency",
    currency: "TTD",
  });
}

export default function FinanceTab({ bankDetails, ledgerEntries, payoutRequests }: Props) {
  const [requestAmount, setRequestAmount] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [activeSection, setActiveSection] = useState<"earnings" | "bank" | "history">("earnings");

  const hasBankOnFile =
    !!bankDetails?.bankName && !!bankDetails.accountName && !!bankDetails.accountNumber;

  const credits = ledgerEntries
    .filter((e) => e.entryType === "CREDIT_ORDER_SETTLEMENT")
    .reduce((s, e) => s + e.amountMinor, 0);

  const debits = ledgerEntries
    .filter((e) => ["DEBIT_PLATFORM_FEE", "DEBIT_PAYOUT"].includes(e.entryType))
    .reduce((s, e) => s + e.amountMinor, 0);

  const lastPayoutDate = payoutRequests
    .filter((p) => p.status === "APPROVED")
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())[0]
    ?.requestedAt ?? null;

  const pendingDebits = ledgerEntries
    .filter(
      (e) =>
        ["DEBIT_PLATFORM_FEE", "DEBIT_PAYOUT"].includes(e.entryType) &&
        (lastPayoutDate === null ||
          new Date(e.createdAt).getTime() > new Date(lastPayoutDate).getTime()),
    )
    .reduce((s, e) => s + e.amountMinor, 0);

  const availableBalance = credits - debits;

  const pendingPayout = payoutRequests.find((p) => p.status === "PENDING");

  async function handleRequestPayout() {
    setRequestError(null);
    setRequesting(true);
    const fd = new FormData();
    const minor = Math.round(parseFloat(requestAmount) * 100);
    fd.append("amountMinor", String(minor));
    const result = await requestPayout(fd);
    if (result.ok) {
      setRequestSuccess(true);
      setRequestAmount("");
    } else {
      setRequestError(result.error ?? "Something went wrong");
    }
    setRequesting(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Balance summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Total Earned</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900">{formatTTD(credits)}</p>
          <p className="mt-1 text-xs text-zinc-500">Gross revenue from orders</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Deductions</p>
          <p className="mt-2 text-2xl font-bold text-red-500">-{formatTTD(pendingDebits)}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {lastPayoutDate ? "Since last payout" : "Platform fees and courier costs"}
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div
            className="-mx-5 -mt-5 mb-4 h-1 w-[calc(100%+40px)]"
            style={{ backgroundColor: "#D4450A" }}
          />
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Available Balance</p>
          <p className="mt-2 text-2xl font-bold" style={{ color: "#D4450A" }}>
            {formatTTD(availableBalance)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Ready to withdraw</p>
        </div>
      </div>

      {/* Pending payout alert */}
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

      {/* Request payout */}
      {!pendingPayout && availableBalance >= 5000 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900">Request a Payout</h3>
          {!hasBankOnFile ? (
            <p className="text-sm text-amber-600">
              ⚠ Please add your bank details below before requesting a payout.
            </p>
          ) : requestSuccess ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Payout request submitted successfully. Admin will review shortly.
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">TTD</span>
                <input
                  type="number"
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  placeholder="0.00"
                  min={50}
                  max={(availableBalance / 100).toFixed(2)}
                  step="0.01"
                  className="w-full rounded-xl border border-zinc-200 py-2.5 pl-12 pr-4 text-sm outline-none ring-zinc-300 focus:ring-2"
                />
              </div>
              <button
                type="button"
                onClick={handleRequestPayout}
                disabled={requesting || !requestAmount}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: "#D4450A" }}
              >
                {requesting ? "Requesting..." : "Request Payout"}
              </button>
              <button
                type="button"
                onClick={() => setRequestAmount(String((availableBalance / 100).toFixed(2)))}
                className="whitespace-nowrap text-xs text-zinc-500 transition-colors hover:text-zinc-900"
              >
                Max {formatTTD(availableBalance)}
              </button>
            </div>
          )}
          {requestError ? <p className="mt-2 text-xs text-red-600">{requestError}</p> : null}
        </div>
      ) : null}

      {availableBalance > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">Subscription</h3>
              <p className="mt-1 text-xs text-zinc-500">Starter plan — Free tier</p>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">Free</span>
          </div>
          <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500">
              Upgrade to Growth plan for TTD 200/month to reduce your commission from 15% to 12% and unlock 500 AI
              prompts per month.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: "#D4450A" }}
                onClick={() => alert("Subscription upgrades coming soon in Phase E.")}
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Section tabs */}
      <div className="flex overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        {(["earnings", "bank", "history"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setActiveSection(s)}
            className={`flex-1 px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
              activeSection === s ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {s === "earnings" ? "Earnings Ledger" : s === "bank" ? "Bank Details" : "Payout History"}
          </button>
        ))}
      </div>

      {/* Earnings ledger */}
      {activeSection === "earnings" ? (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {ledgerEntries.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-zinc-500">
                No earnings yet. Earnings appear here when customers confirm receipt of their orders.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((entry, i) => {
                  const isCredit = entry.entryType === "CREDIT_ORDER_SETTLEMENT";
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
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            isCredit ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                          }`}
                        >
                          {isCredit ? "Revenue" : "Deduction"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-600">{entry.description ?? "—"}</td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono text-xs font-semibold ${
                          isCredit ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {isCredit ? "+" : "-"}
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

      {/* Bank details */}
      {activeSection === "bank" ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900">Bank Details</h3>
          {hasBankOnFile ? (
            <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Current Details</p>
              <p className="text-sm font-medium text-zinc-900">{bankDetails?.bankName}</p>
              <p className="text-sm text-zinc-600">{bankDetails?.accountName}</p>
              <p className="text-sm text-zinc-600">****{bankDetails?.accountNumber?.slice(-4)}</p>
              <p className="mt-1 text-xs capitalize text-zinc-400">{bankDetails?.accountType?.toLowerCase()}</p>
            </div>
          ) : null}
          <form action={saveVendorBankDetails} className="flex flex-col gap-4">
            <Select
              required
              className="rounded-xl border-zinc-200"
              defaultValue={bankDetails?.bankName ?? ""}
              label="Bank name"
              name="bankName"
            >
              <option value="">Select your bank</option>
              {BANK_OPTIONS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </Select>
            <Input
              required
              className="rounded-xl border-zinc-200"
              defaultValue={bankDetails?.accountName ?? ""}
              label="Account name"
              name="accountName"
              placeholder="Name on the account"
            />
            <Input
              required
              className="rounded-xl border-zinc-200"
              defaultValue={bankDetails?.accountNumber ?? ""}
              label="Account number"
              name="accountNumber"
              placeholder="Account number"
            />
            <Select
              required
              className="rounded-xl border-zinc-200"
              defaultValue={bankDetails?.accountType ?? ""}
              label="Account type"
              name="accountType"
            >
              <option value="">Select account type</option>
              <option value="CHEQUING">Chequing</option>
              <option value="SAVINGS">Savings</option>
            </Select>
            <button
              type="submit"
              className="w-fit rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: "#D4450A" }}
            >
              Save bank details
            </button>
          </form>
        </div>
      ) : null}

      {/* Payout history */}
      {activeSection === "history" ? (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {payoutRequests.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-zinc-500">No payout requests yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {payoutRequests.map((req, i) => (
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
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          req.status === "PENDING"
                            ? "border border-amber-200 bg-amber-50 text-amber-700"
                            : req.status === "APPROVED"
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border border-red-200 bg-red-50 text-red-600"
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
