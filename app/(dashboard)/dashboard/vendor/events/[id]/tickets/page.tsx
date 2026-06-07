import { redirect } from "next/navigation";
import Link from "next/link";

import { formatEventDateLong } from "@/lib/events/format-datetime";
import { ScanLine, Users } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getPaidTicketSoldCountsForEvent } from "@/lib/tickets/sold-counts";
import { TicketTypesClient } from "./TicketTypesClient";

type Props = { params: Promise<{ id: string }> };

export default async function TicketTypesPage({ params }: Props) {
  const { id } = await params;

  const session = await getSession();
  if (!session || session.role !== "VENDOR") redirect("/login");

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) redirect("/dashboard/vendor/events");

  const event = await prisma.event.findFirst({
    where: { id, storeId: store.id },
    select: {
      id: true,
      title: true,
      startDate: true,
      status: true,
      coverImage: true,
      ticketTypes: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          price: true,
          quantity: true,
          quantitySold: true,
          description: true,
          perks: true,
          saleStartDate: true,
          saleEnds: true,
          maxPerOrder: true,
          isVisible: true,
          color: true,
        },
      },
    },
  });

  if (!event) redirect("/dashboard/vendor/events");

  const paidSold = await getPaidTicketSoldCountsForEvent(event.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/dashboard/vendor/events/${id}/edit`}
          className="mb-4 inline-block text-sm font-medium text-zinc-500 hover:text-[#D4450A]"
        >
          ← Back to event
        </Link>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href={`/dashboard/vendor/events/${id}/attendees`}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border-2 border-[#D4450A] bg-white px-4 py-3 text-sm font-semibold text-[#D4450A] transition-colors hover:bg-[#FEF0EB] sm:w-auto"
          >
            <Users className="h-5 w-5 shrink-0" aria-hidden />
            View attendees
          </Link>
          <Link
            href={`/dashboard/vendor/events/${id}/checkin`}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#D4450A] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
          >
            <ScanLine className="h-5 w-5 shrink-0" aria-hidden />
            Check in — scan tickets
          </Link>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-zinc-900">Ticket types</h1>
            <p className="mt-1 truncate text-sm text-zinc-500">{event.title}</p>
            <p className="text-xs text-zinc-400">
              {formatEventDateLong(event.startDate)}
            </p>
          </div>
          <span
            className="inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor:
                event.status === "PUBLISHED"
                  ? "#DCFCE7"
                  : event.status === "CANCELLED"
                    ? "#FEE2E2"
                    : "#F4F4F5",
              color:
                event.status === "PUBLISHED"
                  ? "#15803D"
                  : event.status === "CANCELLED"
                    ? "#DC2626"
                    : "var(--text-muted)",
            }}
          >
            {event.status}
          </span>
        </div>
      </div>

      <TicketTypesClient
        eventId={id}
        eventStatus={event.status}
        initialTicketTypes={event.ticketTypes.map((tt) => ({
          ...tt,
          quantitySold: paidSold.byTicketTypeId[tt.id] ?? 0,
          saleStartDate: tt.saleStartDate?.toISOString() ?? null,
          saleEnds: tt.saleEnds?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
