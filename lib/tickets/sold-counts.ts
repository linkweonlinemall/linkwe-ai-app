import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/** Live checkout hold for PENDING_PAYMENT orders (TicketOrder.createdAt). */
export const SEAT_HOLD_MINUTES = 30;

type DbClient = Prisma.TransactionClient | typeof prisma;

/** Ticket.orderId → Ticket.ticketOrder (TicketOrder.status, createdAt). */
function takenSeatWhere(holdCutoff: Date): Prisma.TicketWhereInput {
  return {
    status: { notIn: ["REFUNDED", "CANCELLED"] },
    OR: [
      { ticketOrder: { status: "PAID" } },
      {
        ticketOrder: {
          status: "PENDING_PAYMENT",
          createdAt: { gte: holdCutoff },
        },
      },
    ],
  };
}

/** Ticket.orderId → Ticket.ticketOrder (TicketOrder.status must be PAID). */
const PAID_TICKET_SOLD_WHERE: Prisma.TicketWhereInput = {
  status: { notIn: ["REFUNDED", "CANCELLED"] },
  ticketOrder: { status: "PAID" },
};

export type TicketTypeAvailability = {
  quantity: number;
  taken: number;
  available: number;
};

export class InsufficientSeatsError extends Error {
  readonly reason = "insufficient_seats" as const;

  constructor(
    public readonly ticketTypeName: string,
    public readonly available: number,
  ) {
    const detail =
      available <= 0
        ? `${ticketTypeName}: sold out`
        : `${ticketTypeName}: only ${available} left`;
    super(detail);
    this.name = "InsufficientSeatsError";
  }

  get detail(): string {
    return this.available <= 0
      ? `${this.ticketTypeName}: sold out`
      : `${this.ticketTypeName}: only ${this.available} left`;
  }
}

export async function getAvailableSeatsForTicketTypes(
  ticketTypeIds: string[],
  client?: Prisma.TransactionClient,
): Promise<Record<string, TicketTypeAvailability>> {
  const db: DbClient = client ?? prisma;
  if (ticketTypeIds.length === 0) return {};

  const holdCutoff = new Date(Date.now() - SEAT_HOLD_MINUTES * 60 * 1000);

  const [types, takenRows] = await Promise.all([
    db.eventTicketType.findMany({
      where: { id: { in: ticketTypeIds } },
      select: { id: true, quantity: true },
    }),
    db.ticket.groupBy({
      by: ["ticketTypeId"],
      where: {
        ticketTypeId: { in: ticketTypeIds },
        ...takenSeatWhere(holdCutoff),
      },
      _count: { _all: true },
    }),
  ]);

  const takenByType = Object.fromEntries(
    takenRows.map((r) => [r.ticketTypeId, r._count._all]),
  );

  const result: Record<string, TicketTypeAvailability> = {};
  for (const t of types) {
    const taken = takenByType[t.id] ?? 0;
    result[t.id] = {
      quantity: t.quantity,
      taken,
      available: Math.max(0, t.quantity - taken),
    };
  }
  return result;
}

export async function assertAvailableSeatsForCheckout(
  items: { ticketTypeId: string; ticketTypeName: string; quantity: number }[],
  client?: Prisma.TransactionClient,
): Promise<void> {
  const availability = await getAvailableSeatsForTicketTypes(
    items.map((i) => i.ticketTypeId),
    client,
  );
  for (const item of items) {
    const available = availability[item.ticketTypeId]?.available ?? 0;
    if (item.quantity > available) {
      throw new InsufficientSeatsError(item.ticketTypeName, available);
    }
  }
}

export type EventSoldCounts = {
  byTicketTypeId: Record<string, number>;
  total: number;
};

function rowsToSoldCounts(
  rows: { ticketTypeId: string; _count: { _all: number } }[],
): EventSoldCounts {
  const byTicketTypeId: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    byTicketTypeId[row.ticketTypeId] = row._count._all;
    total += row._count._all;
  }
  return { byTicketTypeId, total };
}

export async function getPaidTicketSoldCountsForEvent(
  eventId: string,
): Promise<EventSoldCounts> {
  const rows = await prisma.ticket.groupBy({
    by: ["ticketTypeId"],
    where: { eventId, ...PAID_TICKET_SOLD_WHERE },
    _count: { _all: true },
  });
  return rowsToSoldCounts(rows);
}

export async function getPaidTicketSoldCountsForEvents(
  eventIds: string[],
): Promise<Record<string, EventSoldCounts>> {
  if (eventIds.length === 0) return {};

  const rows = await prisma.ticket.groupBy({
    by: ["eventId", "ticketTypeId"],
    where: { eventId: { in: eventIds }, ...PAID_TICKET_SOLD_WHERE },
    _count: { _all: true },
  });

  const result: Record<string, EventSoldCounts> = {};
  for (const id of eventIds) {
    result[id] = { byTicketTypeId: {}, total: 0 };
  }
  for (const row of rows) {
    const bucket = result[row.eventId]!;
    bucket.byTicketTypeId[row.ticketTypeId] = row._count._all;
    bucket.total += row._count._all;
  }
  return result;
}
