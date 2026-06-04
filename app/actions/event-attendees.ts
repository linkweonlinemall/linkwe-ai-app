"use server";

import { revalidatePath } from "next/cache";
import type { Prisma, TicketStatus } from "@prisma/client";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 25;

export type EventTicketTypeSales = {
  ticketTypeId: string;
  name: string;
  linkweSold: number;
  externalSold: number;
  realTotal: number;
  capacity: number;
};

export type EventTicketCounts = {
  valid: number;
  used: number;
  cancelled: number;
  refunded: number;
  issued: number;
  checkedIn: number;
  linkweSoldTotal: number;
  externalSoldTotal: number;
  realTotalSold: number;
  /** Sum of EventTicketType.quantity — tickets put up for sale */
  ticketsAvailable: number;
  eventCapacity: number | null;
  byType: EventTicketTypeSales[];
};

export type AttendeeStatusFilter =
  | "all"
  | "not_checked_in"
  | "checked_in"
  | "cancelled_refunded";

export type AttendeeTicketRow = {
  id: string;
  ticketNumber: string;
  holderName: string;
  holderEmail: string;
  ticketTypeName: string;
  status: TicketStatus;
  checkedInAt: string | null;
  qrToken: string;
};

type AuthContext = {
  session: { userId: string; role: string };
  storeId: string;
  eventId: string;
};

async function assertVendorOwnsEvent(eventId: string): Promise<AuthContext | { error: string }> {
  const trimmedId = eventId?.trim();
  if (!trimmedId) return { error: "Event not found" };

  const session = await getSession();
  if (!session || session.role !== "VENDOR") {
    return { error: "You must be signed in as a vendor" };
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) return { error: "Store not found" };

  const event = await prisma.event.findFirst({
    where: { id: trimmedId, storeId: store.id },
    select: { id: true },
  });
  if (!event) return { error: "Event not found" };

  return { session, storeId: store.id, eventId: event.id };
}

function countsFromGroupBy(rows: { status: TicketStatus; _count: { _all: number } }[]): EventTicketCounts {
  let valid = 0;
  let used = 0;
  let cancelled = 0;
  let refunded = 0;

  for (const row of rows) {
    const n = row._count._all;
    if (row.status === "VALID") valid = n;
    else if (row.status === "USED") used = n;
    else if (row.status === "CANCELLED") cancelled = n;
    else if (row.status === "REFUNDED") refunded = n;
  }

  return {
    valid,
    used,
    cancelled,
    refunded,
    issued: valid + used,
    checkedIn: used,
  };
}

function statusWhere(filter: AttendeeStatusFilter): Prisma.TicketWhereInput | undefined {
  switch (filter) {
    case "not_checked_in":
      return { status: "VALID" };
    case "checked_in":
      return { status: "USED" };
    case "cancelled_refunded":
      return { status: { in: ["CANCELLED", "REFUNDED"] } };
    default:
      return undefined;
  }
}

function mapTicketRow(t: {
  id: string;
  ticketNumber: string;
  holderName: string;
  holderEmail: string;
  status: TicketStatus;
  checkedInAt: Date | null;
  qrToken: string;
  ticketType: { name: string };
}): AttendeeTicketRow {
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    holderName: t.holderName,
    holderEmail: t.holderEmail,
    ticketTypeName: t.ticketType.name,
    status: t.status,
    checkedInAt: t.checkedInAt?.toISOString() ?? null,
    qrToken: t.qrToken,
  };
}

export async function getEventTicketCounts(
  eventId: string,
): Promise<{ counts: EventTicketCounts } | { error: string }> {
  const auth = await assertVendorOwnsEvent(eventId);
  if ("error" in auth) return auth;

  const [grouped, event, ticketTypes] = await Promise.all([
    prisma.ticket.groupBy({
      by: ["status"],
      where: { eventId: auth.eventId },
      _count: { _all: true },
    }),
    prisma.event.findUnique({
      where: { id: auth.eventId },
      select: { capacity: true },
    }),
    prisma.eventTicketType.findMany({
      where: { eventId: auth.eventId },
      select: {
        id: true,
        name: true,
        quantity: true,
        quantitySold: true,
        externalSold: true,
      },
      orderBy: { price: "asc" },
    }),
  ]);

  const checkIn = countsFromGroupBy(grouped);

  const byType: EventTicketTypeSales[] = ticketTypes.map((t) => {
    const linkweSold = t.quantitySold;
    const externalSold = t.externalSold;
    return {
      ticketTypeId: t.id,
      name: t.name,
      linkweSold,
      externalSold,
      realTotal: linkweSold + externalSold,
      capacity: t.quantity,
    };
  });

  const linkweSoldTotal = byType.reduce((s, t) => s + t.linkweSold, 0);
  const externalSoldTotal = byType.reduce((s, t) => s + t.externalSold, 0);
  const ticketsAvailable = byType.reduce((s, t) => s + t.capacity, 0);

  return {
    counts: {
      ...checkIn,
      linkweSoldTotal,
      externalSoldTotal,
      realTotalSold: linkweSoldTotal + externalSoldTotal,
      ticketsAvailable,
      eventCapacity: event?.capacity ?? null,
      byType,
    },
  };
}

export async function setExternalSold(
  eventId: string,
  ticketTypeId: string,
  count: number,
): Promise<{ success: true } | { error: string }> {
  const auth = await assertVendorOwnsEvent(eventId);
  if ("error" in auth) return auth;

  const trimmedTypeId = ticketTypeId?.trim();
  if (!trimmedTypeId) return { error: "Ticket type not found" };

  if (!Number.isFinite(count) || !Number.isInteger(count) || count < 0) {
    return { error: "Count must be a whole number of zero or more" };
  }

  const ticketType = await prisma.eventTicketType.findFirst({
    where: { id: trimmedTypeId, eventId: auth.eventId },
    select: { id: true },
  });
  if (!ticketType) return { error: "Ticket type not found for this event" };

  await prisma.eventTicketType.update({
    where: { id: ticketType.id },
    data: { externalSold: count },
  });

  revalidatePath(`/dashboard/vendor/events/${auth.eventId}/attendees`);

  return { success: true };
}

export async function searchEventTickets(
  eventId: string,
  options: {
    q?: string;
    status?: AttendeeStatusFilter;
    page?: number;
  },
): Promise<
  | {
      items: AttendeeTicketRow[];
      total: number;
      page: number;
      totalPages: number;
      pageSize: number;
    }
  | { error: string }
> {
  const auth = await assertVendorOwnsEvent(eventId);
  if ("error" in auth) return auth;

  const q = options.q?.trim() ?? "";
  const status = options.status ?? "all";
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const skip = (page - 1) * PAGE_SIZE;

  const andClauses: Prisma.TicketWhereInput[] = [{ eventId: auth.eventId }];

  const statusClause = statusWhere(status);
  if (statusClause) andClauses.push(statusClause);

  if (q) {
    andClauses.push({
      OR: [
        { holderName: { contains: q, mode: "insensitive" } },
        { holderEmail: { contains: q, mode: "insensitive" } },
        { ticketNumber: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.TicketWhereInput = { AND: andClauses };

  const [total, rows] = await prisma.$transaction([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      select: {
        id: true,
        ticketNumber: true,
        holderName: true,
        holderEmail: true,
        status: true,
        checkedInAt: true,
        qrToken: true,
        ticketType: { select: { name: true } },
      },
      orderBy: [{ status: "asc" }, { holderName: "asc" }],
      skip,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return {
    items: rows.map(mapTicketRow),
    total,
    page,
    totalPages,
    pageSize: PAGE_SIZE,
  };
}
