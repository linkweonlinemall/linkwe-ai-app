"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { cancelAutoRenew, payMySubscriptionFromBalance, requestPayout, resumeAutoRenew, saveVendorBankDetails, startSubscriptionCheckout } from "@/app/actions/vendor";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { getCommissionRate } from "@/lib/finance/commission";
import { PLAN_PRICE_MINOR } from "@/lib/finance/plan-limits";
import { getStorePlan } from "@/lib/finance/store-plan";
import { isVendorBalanceDebit } from "@/lib/finance/vendor-balance";
import { maskBankAccountStars } from "@/lib/format/banking";
import { formatDate } from "@/lib/format/format-display-date-utc";

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
  grossMinor: number | null;
  commissionMinor: number | null;
  netMinor: number | null;
  releasedAt: Date | string | null;
};

function ledgerTypeLabel(ledgerEntryType: string | null): string {
  switch (ledgerEntryType) {
    case "BOOKING_COMPLETE":
      return "Booking";
    case "BOOKING_AUTO_COMPLETE":
      return "Auto-complete";
    case "DEPOSIT_RECEIVED":
      return "Deposit";
    case "ORDER_AUTO_COMPLETE":
      return "Order auto";
    case "ORDER_REVENUE":
      return "Order";
    case "SHIPPING":
      return "Delivery fee";
    case "PLATFORM_COMMISSION":
      return "Commission";
    default:
      return ledgerEntryType ?? "Entry";
  }
}

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
  subscriptionPlan: string;
  subscriptionStatus: string;
  aiUsed: number;
  aiAllowance: number;
  aiRemaining: number;
  subPaidThisPeriod: boolean;
  isCardBilled: boolean;
  planRenewsAt: Date | string | null;
  pastDueSince: Date | string | null;
  autoRenew: boolean;
};

function formatTTD(minor: number): string {
  const amount = (minor / 100).toFixed(2)
  return `TTD ${Number(amount).toLocaleString("en-TT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

type FinanceSection = "earnings" | "bank" | "history";

function sectionFromTabParam(tab: string | null): FinanceSection | null {
  if (tab === "bank-details" || tab === "bank") return "bank";
  if (tab === "history" || tab === "payout-history") return "history";
  if (tab === "earnings") return "earnings";
  return null;
}

export default function FinanceTab({
  bankDetails,
  ledgerEntries,
  payoutRequests,
  subscriptionPlan,
  subscriptionStatus,
  aiUsed,
  aiAllowance,
  aiRemaining,
  subPaidThisPeriod,
  isCardBilled,
  planRenewsAt,
  pastDueSince,
  autoRenew,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { plan, limits } = getStorePlan({ subscriptionPlan, subscriptionStatus });
  const planLabel = `${plan.charAt(0)}${plan.slice(1).toLowerCase()} plan`;
  const productCommissionPct = Math.round(getCommissionRate("product", plan) * 100);
  const priceMinor = PLAN_PRICE_MINOR[plan];
  const pricePill =
    plan === "STARTER"
      ? "Free"
      : `TTD ${(priceMinor / 100).toLocaleString("en-TT", { maximumFractionDigits: 0 })}/mo`;
  const aiLine =
    limits.aiMonthlyAllowance === 0
      ? "No AI assistant"
      : `${aiUsed} of ${aiAllowance} AI uses used · ${aiRemaining} left this period`;
  const [requestAmount, setRequestAmount] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [payingSubscription, setPayingSubscription] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subPayMessage, setSubPayMessage] = useState<string | null>(null);
  const [subPayError, setSubPayError] = useState<string | null>(null);
  const [autoRenewLoading, setAutoRenewLoading] = useState(false);
  const subCheckoutStatus = searchParams.get("sub");
  const [activeSection, setActiveSection] = useState<FinanceSection>(
    () => sectionFromTabParam(searchParams.get("tab")) ?? "earnings",
  );
  const [editingBankDetails, setEditingBankDetails] = useState(false);
  const [editAccountNumber, setEditAccountNumber] = useState("");

  useEffect(() => {
    const section = sectionFromTabParam(searchParams.get("tab"));
    if (section) setActiveSection(section);
  }, [searchParams]);

  const hasBankOnFile =
    !!bankDetails?.bankName && !!bankDetails.accountName && !!bankDetails.accountNumber;

  const showBankDetailForm = !hasBankOnFile || editingBankDetails;

  useEffect(() => {
    if (!showBankDetailForm) return;
    if (!hasBankOnFile) {
      setEditAccountNumber("");
      return;
    }
    if (bankDetails?.accountNumber) {
      setEditAccountNumber(bankDetails.accountNumber);
    }
  }, [showBankDetailForm, hasBankOnFile, bankDetails?.accountNumber]);

  const earningCredits = ledgerEntries.filter(
    (e) =>
      e.entryType === "CREDIT_ORDER_SETTLEMENT" &&
      e.ledgerEntryType !== "PLATFORM_COMMISSION",
  );

  const totalEarnedMinor = earningCredits.reduce(
    (s, e) => s + (e.netMinor ?? e.amountMinor),
    0,
  );
  const totalCommissionMinor = earningCredits.reduce(
    (s, e) => s + (e.commissionMinor ?? 0),
    0,
  );

  const credits = ledgerEntries
    .filter((e) => e.entryType === "CREDIT_ORDER_SETTLEMENT")
    .reduce((s, e) => s + e.amountMinor, 0);

  const debits = ledgerEntries
    .filter((e) => isVendorBalanceDebit(e.entryType))
    .reduce((s, e) => s + e.amountMinor, 0);

  const lastPayoutDate = payoutRequests
    .filter((p) => p.status === "APPROVED")
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())[0]
    ?.requestedAt ?? null;

  const pendingDebits = ledgerEntries
    .filter(
      (e) =>
        isVendorBalanceDebit(e.entryType) &&
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

  async function handlePaySubscription() {
    setSubPayMessage(null);
    setSubPayError(null);
    setPayingSubscription(true);
    const result = await payMySubscriptionFromBalance();
    setPayingSubscription(false);
    if (result.ok) {
      if (result.charged) {
        setSubPayMessage("Subscription paid from your balance");
        router.refresh();
      } else if (result.reason === "already_charged_this_period") {
        setSubPayMessage("Already paid this period.");
        router.refresh();
      } else {
        setSubPayMessage(result.reason ?? "No charge applied.");
      }
    } else if (result.error === "insufficient_balance") {
      setSubPayError(
        "Your balance is too low to cover the subscription. (Card payment coming soon.)",
      );
    } else if (result.error === "card_subscription_active") {
      setSubPayError("You're billed automatically by card — no balance payment needed.");
    } else {
      setSubPayError(result.error);
    }
  }

  async function handleSubscribeByCard(targetPlan: string) {
    setSubPayError(null);
    setSubscribing(true);
    const result = await startSubscriptionCheckout(targetPlan);
    if (result.ok) {
      window.location.href = result.checkoutUrl;
      return;
    }
    setSubscribing(false);
    setSubPayError(result.error);
  }

  async function handleCancelAutoRenew() {
    setAutoRenewLoading(true);
    const r = await cancelAutoRenew();
    setAutoRenewLoading(false);
    if (r.ok) router.refresh();
    else setSubPayError(r.error);
  }

  async function handleResumeAutoRenew() {
    setAutoRenewLoading(true);
    const r = await resumeAutoRenew();
    setAutoRenewLoading(false);
    if (r.ok) router.refresh();
    else setSubPayError(r.error);
  }

  const CARD = "rounded-[12px] border-[0.5px] border-[rgba(28,28,26,0.12)] bg-white";

  const downgradeDate = pastDueSince
    ? new Date(new Date(pastDueSince).getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Balance summary cards — denser */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className={`${CARD} p-4 shadow-none`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Total earned (net)</p>
          <p className="mt-1 truncate text-xl font-bold text-zinc-900">{formatTTD(totalEarnedMinor)}</p>
          <p className="mt-0.5 text-[11px] text-zinc-500">After platform commission</p>
        </div>
        <div className={`${CARD} p-4 shadow-none`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Commission paid</p>
          <p className="mt-1 truncate text-xl font-bold text-red-500">-{formatTTD(totalCommissionMinor)}</p>
          <p className="mt-0.5 text-[11px] text-zinc-500">Platform fees on released earnings</p>
        </div>
        <div className={`overflow-hidden ${CARD} p-4 shadow-none`}>
          <div className="-mx-4 -mt-4 mb-3 h-0.5 w-[calc(100%+32px)]" style={{ backgroundColor: "#D4450A" }} />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Available balance</p>
          <p className="mt-1 truncate text-xl font-bold" style={{ color: "#D4450A" }}>
            {formatTTD(availableBalance)}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">Ready to withdraw</p>
        </div>
      </div>

      {/* Pending payout alert */}
      {pendingPayout ? (
        <div className="flex items-center justify-between rounded-[12px] border-[0.5px] border-amber-200/80 bg-amber-50 px-4 py-2.5">
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
        <div className={`${CARD} p-4 shadow-none`}>
          <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Request a Payout
          </h2>
          {!hasBankOnFile ? (
            <p className="text-sm text-amber-600">
              Please add your bank details below before requesting a payout.
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

      <div className={`${CARD} p-4 shadow-none`}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Subscription
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-500">{planLabel}</p>
          </div>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-medium text-zinc-600">
            {pricePill}
          </span>
        </div>
        <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 p-2.5">
          {subCheckoutStatus === "success" ? (
            <p className="mb-2 text-[11px] text-emerald-700">
              Subscription started — your plan is now active
            </p>
          ) : subCheckoutStatus === "cancelled" ? (
            <p className="mb-2 text-[11px] text-zinc-500">Checkout cancelled</p>
          ) : null}
          <p className="text-[11px] text-zinc-500">
            Product commission: {productCommissionPct}% · {aiLine}
          </p>
          {plan === "STARTER" ? (
            <>
              <p className="mt-2 text-[11px] text-zinc-500">
                Upgrade to Growth plan for TTD 200/month to reduce your commission from 15% to 12% and
                unlock 300 AI uses per month.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: "#D4450A" }}
                  onClick={() => {
                    window.location.href =
                      "mailto:admin@linkwemall.com?subject=Subscription Upgrade Enquiry";
                  }}
                >
                  Upgrade Plan
                </button>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#D4450A" }}
                  disabled={subscribing}
                  onClick={() => void handleSubscribeByCard("GROWTH")}
                >
                  {subscribing ? "Redirecting…" : "Upgrade to Growth — TTD 200/mo"}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                  disabled={subscribing}
                  onClick={() => void handleSubscribeByCard("PRO")}
                >
                  Go Pro — TTD 450/mo
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-[11px] font-medium text-zinc-600">
                You&apos;re on the {planLabel}.
              </p>
              {subscriptionStatus === "PAST_DUE" ? (
                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2.5">
                  <p className="text-[11px] font-medium text-red-700">
                    ⚠️ Your last payment failed.
                  </p>
                  <p className="mt-1 text-[11px] text-red-600">
                    {downgradeDate
                      ? `Update your card by ${formatDate(downgradeDate)} or your plan will move to Starter.`
                      : "Update your card soon or your plan will move to Starter."}
                  </p>
                  <button
                    type="button"
                    disabled={subscribing}
                    onClick={() => void handleSubscribeByCard(plan)}
                    className="mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: "#D4450A" }}
                  >
                    {subscribing ? "Redirecting…" : "Update payment method"}
                  </button>
                  {subPayError ? (
                    <p className="mt-2 text-[11px] text-red-600">{subPayError}</p>
                  ) : null}
                </div>
              ) : isCardBilled ? (
                <div className="mt-2">
                  {autoRenew ? (
                    <>
                      <p className="text-[11px] text-zinc-500">
                        💳 Billed automatically to your card
                        {planRenewsAt
                          ? ` · renews ${formatDate(planRenewsAt)}`
                          : " each month"}
                      </p>
                      <button
                        type="button"
                        disabled={autoRenewLoading}
                        onClick={() => void handleCancelAutoRenew()}
                        className="mt-2 text-[11px] font-medium text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline disabled:opacity-50"
                      >
                        {autoRenewLoading ? "Updating…" : "Turn off auto-renewal"}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-[11px] text-amber-700">
                        ⏸ Auto-renewal off
                        {planRenewsAt
                          ? ` · access until ${formatDate(planRenewsAt)}`
                          : " · access until period end"}
                      </p>
                      <button
                        type="button"
                        disabled={autoRenewLoading}
                        onClick={() => void handleResumeAutoRenew()}
                        className="mt-2 text-[11px] font-medium text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline disabled:opacity-50"
                      >
                        {autoRenewLoading ? "Updating…" : "Turn auto-renewal back on"}
                      </button>
                      {subPaidThisPeriod ? (
                        <p className="mt-2 text-[11px] text-zinc-500">
                          ✓ Subscription paid for this period
                        </p>
                      ) : (
                        <div className="mt-2">
                          <button
                            type="button"
                            disabled={payingSubscription || subscribing || autoRenewLoading}
                            onClick={() => void handlePaySubscription()}
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                          >
                            {payingSubscription
                              ? "Paying…"
                              : `Pay TTD ${(priceMinor / 100).toLocaleString("en-TT", { maximumFractionDigits: 0 })} from balance`}
                          </button>
                          {subPayMessage ? (
                            <p className="mt-2 text-[11px] text-emerald-700">{subPayMessage}</p>
                          ) : null}
                          {subPayError ? (
                            <p className="mt-2 text-[11px] text-red-600">{subPayError}</p>
                          ) : null}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : subPaidThisPeriod ? (
                <p className="mt-2 text-[11px] text-zinc-500">
                  ✓ Subscription paid for this period
                </p>
              ) : (
                <div className="mt-2">
                  <button
                    type="button"
                    disabled={payingSubscription || subscribing}
                    onClick={() => void handlePaySubscription()}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {payingSubscription
                      ? "Paying…"
                      : `Pay TTD ${(priceMinor / 100).toLocaleString("en-TT", { maximumFractionDigits: 0 })} from balance`}
                  </button>
                  {subPayMessage ? (
                    <p className="mt-2 text-[11px] text-emerald-700">{subPayMessage}</p>
                  ) : null}
                  {subPayError ? (
                    <p className="mt-2 text-[11px] text-red-600">{subPayError}</p>
                  ) : null}
                </div>
              )}
              {!isCardBilled ? (
                <button
                  type="button"
                  disabled={subscribing || payingSubscription}
                  onClick={() => void handleSubscribeByCard(plan)}
                  className="mt-2 text-[11px] font-medium text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline disabled:opacity-50"
                >
                  {subscribing ? "Redirecting to checkout…" : "Pay by card instead"}
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Section tabs */}
      <div className={`flex overflow-hidden ${CARD} shadow-none`}>
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
        <div>
          {ledgerEntries.length === 0 ? (
            <div className={`${CARD} p-6 text-center shadow-none`}>
              <p className="text-sm text-zinc-500">
                No earnings yet. Earnings appear here once your delivered orders are completed.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {earningCredits.map((entry) => {
                const dateLabel = formatDate(entry.createdAt);
                const gross = entry.grossMinor ?? entry.amountMinor;
                const commission = entry.commissionMinor ?? 0;
                const net = entry.netMinor ?? entry.amountMinor;
                const isShipping = entry.ledgerEntryType === "SHIPPING";
                return (
                  <div key={entry.id} className={`px-4 py-3 ${CARD} shadow-none`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-zinc-500">{dateLabel}</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        {ledgerTypeLabel(entry.ledgerEntryType)}
                      </span>
                      {entry.releasedAt ? (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                          Released
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-[11px] text-zinc-600">{entry.description ?? "—"}</p>
                    {isShipping ? (
                      <div className="mt-2">
                        <p className="font-semibold tabular-nums text-emerald-600">+{formatTTD(net)}</p>
                        <p className="mt-0.5 text-[10px] text-zinc-400">Your delivery fee · no commission</p>
                      </div>
                    ) : (
                      <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                        <div>
                          <p className="text-zinc-400">Gross</p>
                          <p className="font-semibold tabular-nums text-zinc-800">{formatTTD(gross)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-400">Commission</p>
                          <p className="font-semibold tabular-nums text-red-500">-{formatTTD(commission)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-400">Net</p>
                          <p className="font-semibold tabular-nums text-emerald-600">+{formatTTD(net)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* Bank details */}
      {activeSection === "bank" ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Bank Details
          </h2>

          {hasBankOnFile && !editingBankDetails ? (
            <>
              <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Current details</p>
                <dl className="space-y-2 text-sm">
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-8">
                    <dt className="shrink-0 font-medium text-zinc-500 sm:w-40">Bank name</dt>
                    <dd className="font-medium text-zinc-900">{bankDetails!.bankName}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-8">
                    <dt className="shrink-0 font-medium text-zinc-500 sm:w-40">Account name</dt>
                    <dd className="text-zinc-700">{bankDetails!.accountName}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-8">
                    <dt className="shrink-0 font-medium text-zinc-500 sm:w-40">Account number</dt>
                    <dd className="font-mono text-zinc-900">{maskBankAccountStars(bankDetails!.accountNumber)}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-8">
                    <dt className="shrink-0 font-medium text-zinc-500 sm:w-40">Account type</dt>
                    <dd className="capitalize text-zinc-600">{bankDetails!.accountType?.toLowerCase() ?? "—"}</dd>
                  </div>
                </dl>
              </div>
              <button
                type="button"
                onClick={() => setEditingBankDetails(true)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: "#D4450A" }}
              >
                Edit bank details
              </button>
            </>
          ) : null}

          {showBankDetailForm ? (
            <div className={hasBankOnFile && editingBankDetails ? "mt-6 border-t border-zinc-100 pt-6" : ""}>
              {hasBankOnFile && editingBankDetails ? (
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">Update details</p>
              ) : null}
              <form
                key={hasBankOnFile ? `edit-${editingBankDetails}` : "new-bank"}
                action={saveVendorBankDetails}
                className="flex flex-col gap-4"
              >
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
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="finance-vendor-account-number" className="text-sm font-medium text-zinc-700">
                    Account number
                  </label>
                  <input
                    id="finance-vendor-account-number"
                    name="accountNumber"
                    value={editAccountNumber}
                    onChange={(e) => setEditAccountNumber(e.target.value)}
                    autoComplete="off"
                    required={!hasBankOnFile}
                    placeholder={
                      hasBankOnFile ? "Leave blank to keep current number, or enter a new one" : "Account number"
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 transition-colors duration-150 outline-none focus:border-[#1A7FB5] focus:ring-2 focus:ring-blue-200"
                  />
                </div>
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
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="w-fit rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
                    style={{ backgroundColor: "#D4450A" }}
                  >
                    Save bank details
                  </button>
                  {hasBankOnFile && editingBankDetails ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBankDetails(false);
                        setEditAccountNumber(bankDetails?.accountNumber ?? "");
                      }}
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>
            </div>
          ) : null}
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
                    <td className="px-4 py-2.5 text-xs text-zinc-500">{formatDate(req.requestedAt)}</td>
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
