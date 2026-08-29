import Link from "next/link";
import { redirect } from "next/navigation";

import FinanceTab from "@/app/(dashboard)/dashboard/vendor/components/tabs/finance-tab";
import { getSession } from "@/lib/auth/session";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getAIUsageState } from "@/lib/finance/ai-usage";
import { getCurrentPeriodKey } from "@/lib/finance/ai-usage-period";
import { prisma } from "@/lib/prisma";

export default async function VendorFinancePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      bankDetails: {
        select: {
          bankName: true,
          accountName: true,
          accountNumber: true,
          accountType: true,
        },
      },
    },
  });
  if (!user) redirect("/login");

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: {
      id: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      planRenewsAt: true,
      pastDueSince: true,
      wipayTrustedCardId: true,
      aiTopupCreditsRemaining: true,
      ledgerEntries: {
        select: {
          id: true,
          amountMinor: true,
          entryType: true,
          ledgerEntryType: true,
          description: true,
          createdAt: true,
          grossMinor: true,
          commissionMinor: true,
          netMinor: true,
          releasedAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      payoutRequests: {
        select: {
          id: true,
          amountMinor: true,
          status: true,
          requestedAt: true,
        },
        orderBy: { requestedAt: "desc" },
      },
    },
  });
  if (!store) redirect("/onboarding/business/step-3");

  const aiUsage = await getAIUsageState(store);

  const subPeriodKey = getCurrentPeriodKey(store.planRenewsAt);
  const subIdempotencyKey = `subscription:${store.id}:${subPeriodKey}`;
  const subPaidThisPeriod = !!(await prisma.vendorLedgerEntry.findUnique({
    where: { idempotencyKey: subIdempotencyKey },
    select: { id: true },
  }));

  const subscriptionMode: "live" | null = store.wipayTrustedCardId ? "live" : null;

  return (
    <div className="min-w-0 overflow-x-hidden bg-[#F7F5F2] px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
      <Link
        href="/dashboard/vendor"
        className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Back to dashboard
      </Link>
      <div className="mb-6 overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_85%_0%,rgba(232,130,12,.34),transparent_30%),linear-gradient(135deg,#181816,#2A241F_62%,#5A210B)] p-5 text-white shadow-2xl shadow-orange-950/10 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">Money centre</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Finance
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-white/65">
            Understand released earnings, available funds, commission, payouts and your LinkWe plan.
          </p>
        </div>
        <Link href="/dashboard/vendor/reports" className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur hover:bg-white/15">View business reports →</Link>
        </div>
      </div>

      <FinanceTab
        bankDetails={user.bankDetails}
        ledgerEntries={store.ledgerEntries}
        payoutRequests={store.payoutRequests}
        subscriptionPlan={store.subscriptionPlan}
        subscriptionStatus={store.subscriptionStatus}
        aiUsed={aiUsage.used}
        aiAllowance={aiUsage.allowance}
        aiRemaining={aiUsage.remaining}
        topupRemaining={aiUsage.topupRemaining}
        subPaidThisPeriod={subPaidThisPeriod}
        isCardBilled={!!store.wipayTrustedCardId}
        planRenewsAt={store.planRenewsAt}
        pastDueSince={store.pastDueSince}
        subscriptionMode={subscriptionMode}
      />
      </div>
    </div>
  );
}
