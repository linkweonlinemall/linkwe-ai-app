"use server";

import {getSession} from "@/lib/auth/session";
import {activeCustomerTicketsWhere} from "@/lib/customer/dashboard";
import { prisma } from "@/lib/prisma";

export type UpcomingTicketEventPreview = {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  eventStartDate: Date;
  ticketCount: number;
};

/** Read-only preview of upcoming events the user holds valid paid tickets for. */
export async function getUpcomingTicketsPreview(
  userId: string,
  limit = 3,
): Promise<UpcomingTicketEventPreview[]> {
  const trimmedUserId = userId?.trim();
  const session=await getSession();
  if (!session || session.userId!==trimmedUserId) return [];

  const now = new Date();

  const tickets = await prisma.ticket.findMany({
    where: activeCustomerTicketsWhere(trimmedUserId,now),
    select: {
      eventId: true,
      event: {
        select: {
          title: true,
          slug: true,
          startDate: true,
        },
      },
    },
    orderBy: { event: { startDate: "asc" } },
  });

  const byEvent = new Map<string, UpcomingTicketEventPreview>();

  for (const ticket of tickets) {
    const existing = byEvent.get(ticket.eventId);
    if (existing) {
      existing.ticketCount += 1;
    } else {
      byEvent.set(ticket.eventId, {
        eventId: ticket.eventId,
        eventSlug: ticket.event.slug,
        eventTitle: ticket.event.title,
        eventStartDate: ticket.event.startDate,
        ticketCount: 1,
      });
    }
  }

  return Array.from(byEvent.values()).slice(0, Math.max(1,Math.min(20,Math.trunc(limit))));
}
