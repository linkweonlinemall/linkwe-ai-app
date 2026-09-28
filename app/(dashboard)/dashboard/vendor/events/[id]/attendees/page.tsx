import EventOperationsHeader from "@/components/events/operations/EventOperationsHeader";
import s from "@/components/events/operations/operations.module.css";

import { redirect } from "next/navigation";

import { getEventTicketCounts, searchEventTickets } from "@/app/actions/event-attendees";
import { getEventCheckInReport } from "@/app/actions/ticket-checkin";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

import { AttendeesDashboard } from "./AttendeesDashboard";
import { DuplicateScansReport } from "./DuplicateScansReport";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EventAttendeesPage({ params }: Props) {
  const { id } = await params;

  const session = await getSession();
  if (!session || session.role !== "VENDOR") redirect("/login");

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) redirect("/dashboard/vendor");

  const event = await prisma.event.findFirst({
    where: { id, storeId: store.id },
    select: { id: true, title: true, startDate: true, venueName: true },
  });
  if (!event) redirect("/dashboard/vendor/events");

  const [countsResult, ticketsResult, reportResult] = await Promise.all([
    getEventTicketCounts(event.id),
    searchEventTickets(event.id, { q: "", status: "all", page: 1 }),
    getEventCheckInReport(event.id),
  ]);

  if ("error" in countsResult || "error" in ticketsResult) {
    redirect("/dashboard/vendor/events");
  }

  return <div className={s.page}><EventOperationsHeader event={event} tab="attendees"/>
    <AttendeesDashboard eventId={event.id} eventTitle={event.title} initialCounts={countsResult.counts} initialTickets={ticketsResult}/>
    {reportResult.ok && <details className={`${s.panel} mt-5`}><summary className="font-bold">Entry audit · {reportResult.summary.totalDuplicates} duplicate attempts</summary><div className="mt-4"><DuplicateScansReport report={reportResult}/></div></details>}
  </div>;
}
