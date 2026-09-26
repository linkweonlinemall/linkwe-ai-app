import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, FileText, ShieldCheck, Sparkles } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { prisma } from "@/lib/prisma";
import s from "./public-pages.module.css";

const helpLinks = [["/features", "Explore every feature"], ["/pricing", "Plans & pricing"], ["/faq", "Common questions"], ["/shipping-info", "Delivery & pickup"], ["/returns", "Returns & refunds"], ["/terms", "Terms of service"], ["/privacy", "Privacy policy"], ["/cookies", "Cookies & storage"]];
export default async function PublicStaticPageShell({ eyebrow, title, subtitle, updated, legal = false, wide = false, children }: {
  eyebrow: string; title: string; subtitle?: string; updated?: string; legal?: boolean; wide?: boolean; children: ReactNode;
}) {
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId } }) : null;
  const continueHref = user ? getRoleDashboardPath(user.role) : null;
  const unreadCount = await getNavUnreadCount();
  return <div className={`${s.page} pb-mobile-public lg:pb-0`}>
    <PublicNav user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null} dashboardHref={continueHref ?? undefined} unreadCount={unreadCount}/>
    <main className={`${s.wrap} ${wide ? s.wide : ""}`} id="main-content">
      <header className={s.hero}>
        <p className={s.eyebrow}>{legal ? <ShieldCheck size={15}/> : <Sparkles size={15}/>} {eyebrow}</p>
        <h1>{title}</h1>
        {subtitle && <p className={s.subtitle}>{subtitle}</p>}
        {updated && <p className={s.updated}><FileText size={14}/> Updated {updated} · LinkWe Online Directory</p>}
      </header>
      {wide ? children : <div className={s.layout}>
        <nav className={s.side} aria-label="Help and policies"><p>Find your way</p>{helpLinks.map(([href,label]) => <Link key={href} href={href}>{label}<ArrowUpRight size={13}/></Link>)}<div className={s.sideHelp}><p>Still need a hand?</p><Link href="/contact">Contact our team <ArrowUpRight size={13}/></Link></div></nav>
        <div className={s.content}>{children}</div>
      </div>}
    </main>
  </div>;
}
