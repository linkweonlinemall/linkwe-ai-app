import Link from "next/link";

import { formatEventDateLong } from "@/lib/events/format-datetime";
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-[#1C1C1A]">
      <Link
        href={`/dashboard/vendor/events/${id}/tickets`}
        className="mb-4 inline-block text-sm font-medium text-zinc-500 hover:text-[#D4450A]"
      >
        ← Back to tickets
      </Link>
      <h1 className="text-2xl font-bold sm:text-3xl">Attendees — {event.title}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {formatEventDateLong(event.startDate)}
        {event.venueName ? ` · ${event.venueName}` : ""}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={`/dashboard/vendor/events/${id}/checkin`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#D4450A] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Open scanner
        </Link>
      </div>

      {reportResult.ok ? (
        <div className="mt-6">
          <DuplicateScansReport report={reportResult} />
        </div>
      ) : null}

      <div className="mt-6">
        <AttendeesDashboard
          eventId={event.id}
          eventTitle={event.title}
          initialCounts={countsResult.counts}
          initialTickets={ticketsResult}
        />
      </div>
    </div>
  );
}
