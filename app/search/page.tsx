import type { Metadata } from "next";
import { Suspense } from "react";
import SearchPageClient from "@/app/search/SearchPageClient";
import PublicNav from "@/components/layout/PublicNav";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Search",
  description: "Search products, services, and stores on LinkWe.",
};

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  await searchParams;

  const session = await getSession();
  const user = session
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;
  const continueHref = user ? getRoleDashboardPath(user.role) : null;
  const unreadCount = await getNavUnreadCount();

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <PublicNav
        user={
          user
            ? { name: user.fullName ?? "Account", href: continueHref! }
            : null
        }
        dashboardHref={continueHref ?? undefined}
        unreadCount={unreadCount}
      />
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center text-sm text-zinc-500">
            Loading results…
          </div>
        }
      >
        <SearchPageClient />
      </Suspense>
    </div>
  );
}
