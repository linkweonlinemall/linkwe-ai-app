import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getCustomerOnDemandRequests } from "@/app/actions/on-demand";
import PublicNav from "@/components/layout/PublicNav";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { prisma } from "@/lib/prisma";

import CustomerRequestsClient from "./CustomerRequestsClient";

export const metadata: Metadata = {
  title: "My requests",
  description: "Track your on-demand service requests.",
};

export default async function MyRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const paymentNotice = (await searchParams).payment;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const continueHref = user ? getRoleDashboardPath(user.role) : null;
  const unreadCount = await getNavUnreadCount();
  const requests = await getCustomerOnDemandRequests();

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-mobile-public lg:pb-0">
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
        unreadCount={unreadCount}
      />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#1C1C1A] via-[#352823] to-[#9f390e] p-6 text-white shadow-xl sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300">Services on your schedule</p><h1 className="font-display mt-2 text-3xl font-bold text-white">
            My <span className="italic text-orange-300">requests</span>
          </h1>
          <p className="mt-2 text-sm text-white/60">Track quotes, provider responses, payment and completion from one place.</p>
        </div>
        {paymentNotice === "refunded" ? (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            This checkout had already closed, so LinkWe immediately requested a full refund to your card.
          </div>
        ) : null}
        <CustomerRequestsClient initialRequests={requests} />
      </div>
    </div>
  );
}
