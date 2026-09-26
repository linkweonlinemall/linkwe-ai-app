"use client";
import RexUsageMeter from "@/components/vendor/RexUsageMeter";
import workspace from "@/components/vendor/business-workspace.module.css";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { payMySubscriptionFromBalance, requestPayout, saveVendorBankDetails, startSubscriptionBillingPortal, startSubscriptionCheckout } from "@/app/actions/vendor";
import AITopupCheckout from "@/components/vendor/ai-topup-checkout";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { getCommissionRate } from "@/lib/finance/commission";
import { PLAN_PRICE_MINOR } from "@/lib/finance/plan-limits";
import { getStorePlan } from "@/lib/finance/store-plan";
import {
  isVendorBalanceDebit,
  isVendorLedgerDebit,
} from "@/lib/finance/vendor-balance";
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

function debitDisplay(entryType: string): { label: string; detail: string } {
  switch (entryType) {
    case "DEBIT_PLATFORM_FEE":
      return { label: "Commission", detail: "Platform fee deducted from your balance" };
    case "DEBIT_PAYOUT":
      return { label: "Payout", detail: "Paid out from your available balance" };
    case "DEBIT_REFUND":
      return { label: "Refund", detail: "Reversed from your available balance" };
    case "DEBIT_SUBSCRIPTION":
      return { label: "Subscription", detail: "Subscription charge deducted from your balance" };
    default:
      return { label: "Deduction", detail: "Deducted from your available balance" };
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
  topupRemaining: number;
  subPaidThisPeriod: boolean;
  isCardBilled: boolean;
  planRenewsAt: Date | string | null;
  pastDueSince: Date | string | null;
  subscriptionMode: "live" | null;
};

function formatTTD(minor: number): string {
  const amount = (minor / 100).toFixed(2)
  return `TTD ${Number(amount).toLocaleString("en-TT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

type FinanceSection = "overview" | "earnings" | "bank" | "history" | "plan";

function sectionFromTabParam(tab: string | null): FinanceSection | null {
  if (tab === "bank-details" || tab === "bank") return "bank";
  if (tab === "history" || tab === "payout-history") return "history";
  if (tab === "plan" || tab === "overview") return tab;
  if (tab === "earnings") return "earnings";
  return null;
}

export default function FinanceTab({
  bankDetails,
  ledgerEntries,
  payoutRequests,
  subscriptionPlan,
  subscriptionStatus,
  aiAllowance,
  aiRemaining,
  topupRemaining,
  subPaidThisPeriod,
  isCardBilled,
  planRenewsAt,
  pastDueSince,
  subscriptionMode,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { plan } = getStorePlan({ subscriptionPlan, subscriptionStatus });
  const planLabel = `${plan.charAt(0)}${plan.slice(1).toLowerCase()} plan`;
  const productCommissionPct = Math.round(getCommissionRate("product", plan) * 100);
  const priceMinor = PLAN_PRICE_MINOR[plan];
  const pricePill =
    plan === "STARTER"
      ? "Free"
      : `TTD ${(priceMinor / 100).toLocaleString("en-TT", { maximumFractionDigits: 0 })}/mo`;
  const [requestAmount, setRequestAmount] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [payingSubscription, setPayingSubscription] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subPayMessage, setSubPayMessage] = useState<string | null>(null);
  const [subPayError, setSubPayError] = useState<string | null>(null);
  const subCheckoutStatus = searchParams.get("sub");
  const activeSection = sectionFromTabParam(searchParams.get("tab")) ?? (searchParams.get("sub") ? "plan" : "overview");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [transactionKind, setTransactionKind] = useState("all");
  const [transactionLimit, setTransactionLimit] = useState(30);
  function chooseSection(section: FinanceSection) { const query = new URLSearchParams(searchParams.toString()); query.set("tab", section); router.replace(`/dashboard/vendor/finance?${query}`, {scroll:false}); }
  const [editingBankDetails, setEditingBankDetails] = useState(false);
  const [editAccountNumber, setEditAccountNumber] = useState("");

  const hasBankOnFile =
    !!bankDetails?.bankName && !!bankDetails.accountName && !!bankDetails.accountNumber;

  const showBankDetailForm = !hasBankOnFile || editingBankDetails;

  const earningCredits = ledgerEntries.filter(
    (e) =>
      e.entryType === "CREDIT_ORDER_SETTLEMENT" &&
      e.ledgerEntryType !== "PLATFORM_COMMISSION",
  );

  const ledgerActivity = ledgerEntries.filter(
    (entry) =>
      entry.entryType === "CREDIT_ORDER_SETTLEMENT" ||
      isVendorLedgerDebit(entry.entryType),
  );

  const totalEarnedMinor = earningCredits.reduce(
    (s, e) => s + (e.netMinor ?? e.amountMinor),
    0,
  );
  const totalCommissionMinor = earningCredits.reduce(
    (s, e) => s + (e.commissionMinor ?? 0),
    0,
  );
  const pendingReleaseMinor = earningCredits.filter((entry) => !entry.releasedAt).reduce((sum, entry) => sum + (entry.netMinor ?? entry.amountMinor), 0);

  const credits = ledgerEntries
    .filter((e) => e.entryType === "CREDIT_ORDER_SETTLEMENT")
    .reduce((s, e) => s + e.amountMinor, 0);

  const debits = ledgerEntries
    .filter((e) => isVendorBalanceDebit(e.entryType))
    .reduce((s, e) => s + e.amountMinor, 0);

  const availableBalance = credits - debits;

  const pendingPayout = payoutRequests.find((p) => p.status === "PENDING");

  async function handleRequestPayout() {
    setRequestError(null);
    setRequesting(true);
    const fd = new FormData();
    const minor = Math.round(parseFloat(requestAmount) * 100);
    fd.append("amountMinor", String(minor));
    try {
    const result = await requestPayout(fd);
    if (result.ok) {
      setRequestSuccess(true);
      setRequestAmount("");
      router.refresh();
    } else {
      setRequestError(result.error ?? "Something went wrong");
    }
    } catch { setRequestError("Could not submit the request. Check payout history before trying again."); } finally { setRequesting(false); }
  }

  async function handlePaySubscription(targetPlan?: "GROWTH" | "PRO") {
    setSubPayMessage(null);
    setSubPayError(null);
    setPayingSubscription(true);
    try {
    const result = await payMySubscriptionFromBalance(targetPlan);
    setPayingSubscription(false);
    if (result.ok) {
      if (result.charged) {
        const paidPlan = targetPlan
          ? `${targetPlan.charAt(0)}${targetPlan.slice(1).toLowerCase()} plan`
          : "Subscription";
        setSubPayMessage(`${paidPlan} paid from your balance`);
        router.refresh();
      } else if (result.reason === "already_charged_this_period") {
        setSubPayMessage("Already paid this period.");
        router.refresh();
      } else {
        setSubPayMessage(result.reason ?? "No charge applied.");
      }
    } else if (result.error === "insufficient_balance") {
      setSubPayError(
        "Your balance is too low to cover the subscription. You can continue with WiPay instead.",
      );
    } else if (result.error === "card_subscription_active") {
      setSubPayError("Your WiPay renewal is handled separately — no balance payment is needed.");
    } else {
      setSubPayError(result.error);
    }
    } catch { setSubPayError("We could not confirm the payment result. Refresh your plan and transactions before retrying."); } finally {setPayingSubscription(false);}
  }

  async function handleSubscribeByCard(targetPlan: string) {
    setSubPayError(null);
    setSubscribing(true);
    try {
    const result = await startSubscriptionCheckout(targetPlan);
    if (result.ok) {
      window.location.href = result.checkoutUrl;
      return;
    }
    setSubscribing(false);
    setSubPayError(result.error);
    } catch {setSubPayError("The payment page could not be opened. Please try again.");} finally {setSubscribing(false);}
  }

  async function handleUpdatePaymentMethod() {
    setSubPayError(null);
    setSubscribing(true);
    try {
    const result = await startSubscriptionBillingPortal();
    if (result.ok) {
      window.location.href = result.portalUrl;
      return;
    }
    setSubscribing(false);
    setSubPayError(result.error);
    } catch {setSubPayError("The payment page could not be opened. Please try again.");} finally {setSubscribing(false);}
  }

  const filteredActivity = ledgerActivity.filter(entry => (transactionKind === "all" || (transactionKind === "debits") === isVendorLedgerDebit(entry.entryType)) && `${entry.description ?? ""} ${entry.entryType}`.toLowerCase().includes(transactionSearch.toLowerCase().trim()));
  const CARD = "rounded-[20px] border border-[#dce5d8] bg-white";

  const downgradeDate = pastDueSince
    ? new Date(new Date(pastDueSince).getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Finance sections" className={workspace.tabs} data-tour="finance-navigation">
        {([['overview','Overview'],['earnings','Transactions'],['history','Payouts'],['bank','Bank details'],['plan','Plan & Rex']] as const).map(([key,label])=><button key={key} aria-pressed={activeSection===key} onClick={()=>chooseSection(key)}>{label}</button>)}
      </nav>
      {/* Balance summary cards */}
      <div data-tour="finance-balances" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={`${CARD} p-4 shadow-none`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Total earned (net)</p>
          <p className="mt-1 truncate text-xl font-bold text-zinc-900">{formatTTD(totalEarnedMinor)}</p>
          <p className="mt-0.5 text-xs text-zinc-500">After platform commission</p>
        </div>
        <div className={`${CARD} p-4 shadow-none`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Commission paid</p>
          <p className="mt-1 truncate text-xl font-bold text-red-500">-{formatTTD(totalCommissionMinor)}</p>
          <p className="mt-0.5 text-xs text-zinc-500">Platform fees on released earnings</p>
        </div>
        <div className={`overflow-hidden ${CARD} p-4 shadow-none`}>
          <div className="-mx-4 -mt-4 mb-3 h-0.5 w-[calc(100%+32px)]" style={{ backgroundColor: "#D4450A" }} />
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Available balance</p>
          <p className="mt-1 truncate text-xl font-bold" style={{ color: "#D4450A" }}>
            {formatTTD(availableBalance)}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">Ready to withdraw</p>
        </div>
        <div className={`${CARD} p-4 shadow-none`}><p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Pending release</p><p className="mt-1 truncate text-xl font-bold text-amber-600">{formatTTD(pendingReleaseMinor)}</p><p className="mt-0.5 text-xs text-zinc-500">Awaiting completion or release</p></div>
      </div>

      {activeSection === "overview" && <section className={workspace.hero}><div className={workspace.row}><div><h2 className={workspace.heading}>Your money, at a glance.</h2><p className={workspace.muted}>Released earnings fund your balance. Payouts, refunds, subscriptions and adjustments reduce it.</p><p className={workspace.muted} style={{marginTop:8}}>Payments customers make directly to you on arrival are separate from your LinkWe balance.</p></div><button className={workspace.secondary} onClick={()=>chooseSection("history")}>Manage payouts →</button></div></section>}

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
      {(activeSection === "overview" || activeSection === "history") && !pendingPayout && availableBalance >= 5000 ? (
        <div data-tour="finance-payout-request" className={`${CARD} p-4 shadow-none`}>
          <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Request a Payout
          </h2>
          {!hasBankOnFile ? (
            <p className="text-sm text-amber-600">
              <button onClick={()=>chooseSection("bank")} className="underline">Add your bank details</button> before requesting a payout.
            </p>
          ) : requestSuccess ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Payout request submitted successfully. Admin will review shortly.
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-40 flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">TTD</span>
                <input
                  type="number"
                  aria-label="Payout amount in TTD"
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

      {activeSection === "plan" && <div data-tour="finance-plan" className={`${CARD} p-4 shadow-none`}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Subscription
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">{planLabel}</p>
          </div>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
            {pricePill}
          </span>
        </div>
        <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 p-2.5">
          {subCheckoutStatus === "success" && subscriptionStatus === "ACTIVE" ? (
            <p className="mb-2 text-xs text-emerald-700">
              Subscription started — your plan is now active
            </p>
          ) : null}
          <p className="text-sm text-zinc-600 mb-3">Product commission: {productCommissionPct}%</p>
          <div className="rounded-xl bg-[#183f3a] p-4 mb-3"><RexUsageMeter allowance={aiAllowance} remaining={aiRemaining} topupRemaining={topupRemaining} lifetime={plan === "STARTER"}/></div>
          <AITopupCheckout topupRemaining={topupRemaining} />
          {plan === "STARTER" ? (
            <>
              <p className="mt-2 text-xs text-zinc-500">
                Upgrade to Growth for TTD 300/month: 5% product commission, no service commission, and 300 Rex uses per month.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#D4450A" }}
                  disabled={subscribing}
                  onClick={() => void handleSubscribeByCard("GROWTH")}
                >
                  {subscribing ? "Redirecting…" : "Upgrade to Growth — TTD 300/mo"}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                  disabled={subscribing}
                  onClick={() => void handleSubscribeByCard("PRO")}
                >
                  Go Pro — TTD 500/mo
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <button
                  type="button"
                  disabled={payingSubscription || subscribing}
                  onClick={() => void handlePaySubscription("GROWTH")}
                  className="font-semibold text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline disabled:opacity-50"
                >
                  {payingSubscription ? "Processing…" : "Pay Growth from balance"}
                </button>
                <button
                  type="button"
                  disabled={payingSubscription || subscribing}
                  onClick={() => void handlePaySubscription("PRO")}
                  className="font-semibold text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline disabled:opacity-50"
                >
                  {payingSubscription ? "Processing…" : "Pay Pro from balance"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-xs font-medium text-zinc-600">
                You&apos;re on the {planLabel}.
              </p>
              {subscriptionMode ? (
                <p
                  className="mt-1 text-xs font-semibold text-emerald-700"
                >
                  WiPay card connected
                </p>
              ) : null}
              {subscriptionStatus === "PAST_DUE" ? (
                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2.5">
                  <p className="text-xs font-medium text-red-700">
                    ⚠️ Your last payment failed.
                  </p>
                  <p className="mt-1 text-xs text-red-600">
                    {downgradeDate
                      ? `Update your card by ${formatDate(downgradeDate)} or your plan will move to Starter.`
                      : "Update your card soon or your plan will move to Starter."}
                  </p>
                  <button
                    type="button"
                    disabled={subscribing}
                    onClick={() => void handleUpdatePaymentMethod()}
                    className="mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: "#D4450A" }}
                  >
                    {subscribing ? "Redirecting…" : "Update payment method"}
                  </button>
                  {subPayError ? (
                    <p className="mt-2 text-xs text-red-600">{subPayError}</p>
                  ) : null}
                </div>
              ) : isCardBilled ? (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                  <p className="text-xs font-medium text-amber-900">
                    Paid through {planRenewsAt ? formatDate(planRenewsAt) : "the current period"}
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    WiPay requires you to approve each monthly renewal. Your card is not charged automatically.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={subscribing}
                      onClick={() => void handleSubscribeByCard(plan)}
                      className="rounded-lg bg-[#D4450A] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {subscribing ? "Redirecting…" : `Renew ${planLabel} with WiPay`}
                    </button>
                    <button
                      type="button"
                      disabled={subscribing}
                      onClick={() => void handleUpdatePaymentMethod()}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-50"
                    >
                      Update payment card
                    </button>
                  </div>
                </div>
              ) : subPaidThisPeriod ? (
                <p className="mt-2 text-xs text-zinc-500">
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
                    <p className="mt-2 text-xs text-emerald-700">{subPayMessage}</p>
                  ) : null}
                  {subPayError ? (
                    <p className="mt-2 text-xs text-red-600">{subPayError}</p>
                  ) : null}
                </div>
              )}
              {!isCardBilled ? (
                <>
                  <button
                    type="button"
                    disabled={subscribing || payingSubscription}
                    onClick={() => void handleSubscribeByCard(plan)}
                    className="mt-2 text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline disabled:opacity-50"
                  >
                    {subscribing ? "Redirecting to checkout…" : "Pay by card instead"}
                  </button>
                  {subscriptionStatus !== "PAST_DUE" ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      To change or downgrade your plan,{" "}
                      <Link
                        href="/contact"
                        className="font-medium text-zinc-700 underline-offset-2 hover:underline"
                      >
                        contact support
                      </Link>
                      .
                    </p>
                  ) : null}
                  {plan === "GROWTH" ? (
                    <div className="mt-3 flex flex-wrap gap-3 border-t border-zinc-100 pt-3 text-xs">
                      <button
                        type="button"
                        disabled={subscribing || payingSubscription}
                        onClick={() => void handleSubscribeByCard("PRO")}
                        className="font-semibold text-[#D4450A] disabled:opacity-50"
                      >
                        Upgrade to Pro with WiPay
                      </button>
                      <button
                        type="button"
                        disabled={subscribing || payingSubscription}
                        onClick={() => void handlePaySubscription("PRO")}
                        className="font-semibold text-zinc-600 disabled:opacity-50"
                      >
                        Upgrade to Pro from balance
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </div>
      </div>}

      {/* Earnings ledger */}
      {activeSection === "earnings" || activeSection === "overview" ? (
        <div data-tour="finance-transactions">
          <div className={workspace.row} style={{margin:"12px 0"}}><h2 className={workspace.heading}>{activeSection==="overview"?"Latest activity":"Transactions"}</h2>{activeSection==="overview"&&<button className={workspace.link} onClick={()=>chooseSection("earnings")}>View all activity →</button>}</div>
          {activeSection==="earnings"&&<div className={workspace.toolbar}><input className={workspace.input} aria-label="Search transactions" placeholder="Search descriptions…" value={transactionSearch} onChange={e=>{setTransactionSearch(e.target.value);setTransactionLimit(30);}}/><select className={workspace.select} aria-label="Transaction type" value={transactionKind} onChange={e=>{setTransactionKind(e.target.value);setTransactionLimit(30);}}><option value="all">All activity</option><option value="credits">Earnings</option><option value="debits">Deductions</option></select><span className={workspace.muted}>{filteredActivity.length} transactions</span></div>}
          {filteredActivity.length === 0 ? (
            <div className={`${CARD} p-6 text-center shadow-none`}>
              <p className="text-sm text-zinc-500">
                {ledgerActivity.length ? "No transactions match your filters." : "Earnings appear here when completed orders are released."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredActivity.slice(0,activeSection==="overview"?5:transactionLimit).map((entry) => {
                const dateLabel = formatDate(entry.createdAt);
                const gross = entry.grossMinor ?? entry.amountMinor;
                const commission = entry.commissionMinor ?? 0;
                const net = entry.netMinor ?? entry.amountMinor;
                const isShipping = entry.ledgerEntryType === "SHIPPING";
                const isDebit = isVendorLedgerDebit(entry.entryType);
                const debit = debitDisplay(entry.entryType);
                return (
                  <div key={entry.id} className={`px-4 py-3 ${CARD} shadow-none`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-zinc-500">{dateLabel}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isDebit
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {isDebit ? debit.label : ledgerTypeLabel(entry.ledgerEntryType)}
                      </span>
                      {entry.releasedAt ? (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                          Released
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-xs text-zinc-600">{entry.description ?? "—"}</p>
                    {isDebit ? (
                      <div className="mt-2">
                        <p className="font-semibold tabular-nums text-red-600">
                          -{formatTTD(entry.amountMinor)}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          {debit.detail}
                        </p>
                      </div>
                    ) : isShipping ? (
                      <div className="mt-2">
                        <p className="font-semibold tabular-nums text-emerald-600">+{formatTTD(net)}</p>
                        <p className="mt-0.5 text-xs text-zinc-400">Your delivery fee · no commission</p>
                      </div>
                    ) : (
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
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
          {activeSection === "earnings" && filteredActivity.length > transactionLimit && <button className={workspace.secondary} style={{marginTop:16}} onClick={()=>setTransactionLimit(n=>n+30)}>Show more transactions</button>}
        </div>
      ) : null}

      {/* Bank details */}
      {activeSection === "bank" ? (
        <div data-tour="finance-payout-details" className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
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
                onClick={() => {setEditAccountNumber("");setEditingBankDetails(true);}}
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
                        setEditAccountNumber("");
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

      {activeSection === "history" && !pendingPayout && availableBalance < 5000 && <div className={workspace.card}><h2 className={workspace.heading}>Build your next payout</h2><p className={workspace.muted}>The minimum payout is TTD 50.00. Your available balance is {formatTTD(availableBalance)}.</p>{!hasBankOnFile&&<button className={workspace.link} onClick={()=>chooseSection("bank")}>Add bank details now →</button>}</div>}
      {/* Payout history */}
      {activeSection === "history" ? (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
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
