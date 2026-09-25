import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { prisma } from "@/lib/prisma";
import { ticketPaidMinor } from "@/lib/tickets/ticket-paid-minor";
import PublicNav from "@/components/layout/PublicNav";
import TicketsClient from "@/components/customer/TicketsClient";
import styles from "@/components/customer/customer.module.css";
export const metadata: Metadata = { title: "My tickets", description: "Your local event wallet. Find tickets, entry codes and event details." };
export default async function MyTicketsPage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=%2Fmy-tickets");
  const tickets = await prisma.ticket.findMany({
    where: { userId: session.userId, ticketOrder: { is: { status: { in: ["PAID", "REFUNDED"] } } } },
    select: {
      id: true, ticketNumber: true, holderName: true, status: true, transferredAt: true, transferredToName: true, pricePaidMinor: true,
      event: { select: { title: true, slug: true, startDate: true, endDate: true, status: true, venueName: true, coverImage: true, isOnline: true, store: { select: { name: true } } } },
      ticketType: { select: { name: true, price: true } }, ticketOrder: { select: { reference: true, total: true, status: true, couponSnapshot: true } },
    }, orderBy: { createdAt: "desc" },
  });
  const rows = tickets.map(t => ({ ...t, transferredAt: t.transferredAt?.toISOString() ?? null, event: { ...t.event, startDate: t.event.startDate.toISOString(), endDate: t.event.endDate?.toISOString() ?? null }, paidMinor: ticketPaidMinor(t) }));
  // eslint-disable-next-line react-hooks/purity -- One server-request snapshot, passed unchanged to the client.
  const now = Date.now();
  const dashboardHref = getRoleDashboardPath(session.role);
  return <div className={`${styles.page} pb-mobile-public lg:pb-0`}><PublicNav user={{ name: session.fullName ?? "Account", href: dashboardHref }} dashboardHref={dashboardHref} /><main className={styles.container}><TicketsClient tickets={rows} now={now} /><footer className={styles.footer}>We people. We business. We local.</footer></main></div>;
}
