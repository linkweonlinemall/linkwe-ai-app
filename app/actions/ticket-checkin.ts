"use server";

import { revalidatePath } from "next/cache";
import type { TicketStatus } from "@prisma/client";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const ticketSelect = {
  id: true,
  ticketNumber: true,
  qrToken: true,
  status: true,
  checkedInAt: true,
  holderName: true,
  event: {
    select: {
      id: true,
      storeId: true,
      title: true,
      startDate: true,
      venueName: true,
      isOnline: true,
    },
  },
  ticketType: {
    select: { name: true },
  },
} as const;

export type TicketCheckInLookup =
  | { found: false }
  | {
      found: true;
      authorized: boolean;
      id: string;
      ticketNumber: string;
      qrToken: string;
      status: TicketStatus;
      checkedInAt: Date | null;
      holderName: string;
      ticketTypeName: string;
      event: {
        title: string;
        startDate: Date;
        venueLabel: string;
      };
    };

export type CheckInTicketResult =
  | { ok: true; justCheckedIn: true }
  | {
      ok: false;
      reason:
        | "unauthenticated"
        | "unauthorized"
        | "already_used"
        | "cancelled"
        | "refunded"
        | "not_valid";
      checkedInAt?: Date | null;
    };

async function isAuthorizedForTicket(
  session: { userId: string; role: string } | null,
  eventStoreId: string,
): Promise<boolean> {
  if (!session) return false;
  if (session.role === "ADMIN") return true;

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });

  return store?.id === eventStoreId;
}

function venueLabel(event: { isOnline: boolean; venueName: string | null }): string {
  if (event.isOnline) return "Online";
  return event.venueName ?? "Venue TBA";
}

export async function getTicketForCheckIn(qrToken: string): Promise<TicketCheckInLookup> {
  const trimmed = qrToken?.trim();
  if (!trimmed) return { found: false };

  const session = await getSession();

  const ticket = await prisma.ticket.findUnique({
    where: { qrToken: trimmed },
    select: ticketSelect,
  });

  if (!ticket) return { found: false };

  const authorized = await isAuthorizedForTicket(session, ticket.event.storeId);

  return {
    found: true,
    authorized,
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    qrToken: ticket.qrToken,
    status: ticket.status,
    checkedInAt: ticket.checkedInAt,
    holderName: ticket.holderName,
    ticketTypeName: ticket.ticketType.name,
    event: {
      title: ticket.event.title,
      startDate: ticket.event.startDate,
      venueLabel: venueLabel(ticket.event),
    },
  };
}

export async function checkInTicket(qrToken: string): Promise<CheckInTicketResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "unauthenticated" };

  const trimmed = qrToken?.trim();
  if (!trimmed) return { ok: false, reason: "not_valid" };

  const ticket = await prisma.ticket.findUnique({
    where: { qrToken: trimmed },
    select: {
      status: true,
      event: { select: { storeId: true } },
    },
  });

  if (!ticket) return { ok: false, reason: "not_valid" };

  const authorized = await isAuthorizedForTicket(session, ticket.event.storeId);
  if (!authorized) return { ok: false, reason: "unauthorized" };

  const result = await prisma.ticket.updateMany({
    where: { qrToken: trimmed, status: "VALID" },
    data: {
      status: "USED",
      checkedInAt: new Date(),
      checkedInBy: session.userId,
    },
  });

  if (result.count === 1) {
    revalidatePath(`/checkin/${trimmed}`);
    return { ok: true, justCheckedIn: true };
  }

  const current = await prisma.ticket.findUnique({
    where: { qrToken: trimmed },
    select: { status: true, checkedInAt: true },
  });

  if (!current) return { ok: false, reason: "not_valid" };

  if (current.status === "USED") {
    return { ok: false, reason: "already_used", checkedInAt: current.checkedInAt };
  }

  if (current.status === "CANCELLED") {
    return { ok: false, reason: "cancelled" };
  }

  if (current.status === "REFUNDED") {
    return { ok: false, reason: "refunded" };
  }

  return { ok: false, reason: "not_valid" };
}
