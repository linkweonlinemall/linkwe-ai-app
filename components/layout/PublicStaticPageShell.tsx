import type { ReactNode } from "react";

import PublicNav from "@/components/layout/PublicNav";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { prisma } from "@/lib/prisma";

type Props = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default async function PublicStaticPageShell({
  eyebrow,
  title,
  subtitle,
  children,
}: Props) {
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId } }) : null;
  const continueHref = user ? getRoleDashboardPath(user.role) : null;
  const unreadCount = await getNavUnreadCount();

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-mobile-public lg:pb-0">
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
        unreadCount={unreadCount}
      />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#D4450A]">{eyebrow}</p>
          <h1 className="font-display mt-2 text-4xl font-bold text-zinc-900">{title}</h1>
          {subtitle ? <p className="mt-3 text-sm text-zinc-500">{subtitle}</p> : null}
        </div>
        <div className="flex flex-col gap-8">{children}</div>
      </div>
    </div>
  );
}
