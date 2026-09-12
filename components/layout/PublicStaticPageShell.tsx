import type { ReactNode } from "react";
import { FileText, ShieldCheck, Sparkles } from "lucide-react";

import PublicNav from "@/components/layout/PublicNav";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { prisma } from "@/lib/prisma";

type Props = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  updated?: string;
  legal?: boolean;
  children: ReactNode;
};

export default async function PublicStaticPageShell({
  eyebrow,
  title,
  subtitle,
  updated,
  legal = false,
  children,
}: Props) {
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId } }) : null;
  const continueHref = user ? getRoleDashboardPath(user.role) : null;
  const unreadCount = await getNavUnreadCount();

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f7fbff_0%,#fff_40%,#fff9f4_100%)] pb-mobile-public lg:pb-0">
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
        unreadCount={unreadCount}
      />
      <div className="pointer-events-none absolute -left-52 top-20 size-[32rem] rounded-full bg-[#1A7FB5]/10 blur-[120px]" aria-hidden />
      <div className="pointer-events-none absolute -right-48 top-[30rem] size-[28rem] rounded-full bg-[#D4450A]/8 blur-[110px]" aria-hidden />
      <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="relative mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 p-6 text-white shadow-[0_30px_80px_rgba(20,48,67,.24)] sm:mb-10 sm:p-10">
          <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#1A7FB5]/35 blur-[80px]" aria-hidden />
          <div className="pointer-events-none absolute -bottom-24 left-16 size-64 rounded-full bg-[#D4450A]/22 blur-[85px]" aria-hidden />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-3.5 py-2 text-[10px] font-black uppercase tracking-[.18em] text-sky-200">
              {legal ? <ShieldCheck className="size-3.5" /> : <Sparkles className="size-3.5" />}
              {eyebrow}
            </span>
            <h1 className="font-display mt-5 text-4xl font-black tracking-[-.04em] text-white sm:text-5xl">{title}</h1>
            {subtitle ? <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">{subtitle}</p> : null}
            {updated ? <p className="mt-5 inline-flex items-center gap-2 text-[11px] font-bold text-white/50"><FileText className="size-3.5" /> Effective {updated} · LinkWe Online Directory</p> : null}
          </div>
        </div>
        <div className="flex flex-col gap-5 [&>section]:rounded-[1.5rem] [&>section]:border [&>section]:border-white [&>section]:bg-white/85 [&>section]:p-5 [&>section]:shadow-[0_16px_48px_rgba(38,73,96,.09)] [&>section]:ring-1 [&>section]:ring-sky-950/[.035] [&>section]:backdrop-blur sm:[&>section]:p-7">{children}</div>
      </div>
    </div>
  );
}
