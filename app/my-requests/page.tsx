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

export default async function MyRequestsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const continueHref = user ? getRoleDashboardPath(user.role) : null;
  const unreadCount = await getNavUnreadCount();
  const requests = await getCustomerOnDemandRequests();

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16 sm:pb-0">
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
        unreadCount={unreadCount}
      />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-zinc-900">
            My <span className="italic text-[#D4450A]">requests</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Track your on-demand service requests</p>
        </div>
        <CustomerRequestsClient initialRequests={requests as any} />
      </div>
    </div>
  );
}
