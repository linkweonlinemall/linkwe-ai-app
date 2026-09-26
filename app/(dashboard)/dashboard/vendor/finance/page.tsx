import Link from "next/link";
import WorkspacePage from "@/components/vendor/WorkspacePage";
import styles from "@/components/vendor/business-workspace.module.css";
import { redirect } from "next/navigation";

import FinanceTab from "@/app/(dashboard)/dashboard/vendor/components/tabs/finance-tab";
import { getSession } from "@/lib/auth/session";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getAIUsageState } from "@/lib/finance/ai-usage";
import { getCurrentPeriodKey } from "@/lib/finance/ai-usage-period";
import { resolveVendorPlan } from "@/lib/finance/vendor-plan";
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
  const subPaidThisPeriod = !!(await prisma.vendorLedgerEntry.findFirst({
    where: { storeId: store.id, idempotencyKey: { in: [
      subIdempotencyKey,
      `subscription:${store.id}:${resolveVendorPlan(store.subscriptionPlan)}:${subPeriodKey}`,
    ] } },
    select: { id: true },
  }));

  const subscriptionMode: "live" | null = store.wipayTrustedCardId ? "live" : null;

  return (
    <WorkspacePage eyebrow="Money centre" title="Make sense of your money." description="Your earnings, payouts, bank details and subscription, organised in one place." action={<Link href="/dashboard/vendor/reports" className={styles.secondary}>Business reports ↗</Link>}>
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
    </WorkspacePage>
  );
}
