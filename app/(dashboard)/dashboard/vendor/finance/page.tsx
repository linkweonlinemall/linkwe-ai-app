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
      stripeSubscriptionId: true,
      autoRenew: true,
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

  return (
    <div className="px-6 py-8">
      <Link
        href="/dashboard/vendor"
        className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Back to dashboard
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Finance
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            Earnings, payouts, and bank details
          </p>
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
        subPaidThisPeriod={subPaidThisPeriod}
        isCardBilled={!!store.stripeSubscriptionId}
        planRenewsAt={store.planRenewsAt}
        pastDueSince={store.pastDueSince}
        autoRenew={store.autoRenew}
      />
    </div>
  );
}
