"use server";

import { revalidatePath } from "next/cache";
import type { TicketStatus } from "@prisma/client";

import { getSession } from "@/lib/auth/session";
import { eventScanCodesMatch } from "@/lib/tickets/event-scan-code";
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
      eventId: string;
      event: {
        title: string;
        startDate: Date;
        venueLabel: string;
      };
    };

export type VerifyEventScanCodeResult =
  | {
      valid: true;
      eventTitle: string;
      eventStartDate: string;
      venueName?: string;
    }
  | { valid: false };

export async function verifyEventScanCode(
  eventId: string,
  code: string,
): Promise<VerifyEventScanCodeResult> {
  const trimmedId = eventId?.trim();
  if (!trimmedId) return { valid: false };

  const event = await prisma.event.findUnique({
    where: { id: trimmedId },
    select: {
      scanCode: true,
      title: true,
      startDate: true,
      venueName: true,
    },
  });

  if (!event?.scanCode || !eventScanCodesMatch(event.scanCode, code)) {
    return { valid: false };
  }

  return {
    valid: true,
    eventTitle: event.title,
    eventStartDate: event.startDate.toISOString(),
    venueName: event.venueName ?? undefined,
  };
}

export type CheckInTicketResult =
  | { ok: true; justCheckedIn: true }
  | {
      ok: false;
      reason:
        | "unauthenticated"
        | "unauthorized"
        | "wrong_event"
        | "already_used"
        | "cancelled"
        | "refunded"
        | "not_paid"
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

async function isScanCodeAuthorized(
  expectedEventId: string,
  scanCode: string | undefined,
): Promise<boolean> {
  const trimmed = scanCode?.trim();
  if (!trimmed) return false;

  const event = await prisma.event.findUnique({
    where: { id: expectedEventId },
    select: { scanCode: true },
  });

  return eventScanCodesMatch(event?.scanCode ?? null, trimmed);
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
    eventId: ticket.event.id,
    event: {
      title: ticket.event.title,
      startDate: ticket.event.startDate,
      venueLabel: venueLabel(ticket.event),
    },
  };
}

export async function checkInTicket(
  qrToken: string,
  expectedEventId: string,
  scanCode?: string,
): Promise<CheckInTicketResult> {
  const session = await getSession();

  const trimmed = qrToken?.trim();
  if (!trimmed) return { ok: false, reason: "not_valid" };

  const trimmedEventId = expectedEventId?.trim();
  if (!trimmedEventId) return { ok: false, reason: "not_valid" };

  const ticket = await prisma.ticket.findUnique({
    where: { qrToken: trimmed },
    select: {
      status: true,
      eventId: true,
      event: { select: { storeId: true } },
      ticketOrder: { select: { status: true } },
    },
  });

  if (!ticket) return { ok: false, reason: "not_valid" };

  if (ticket.eventId !== trimmedEventId) {
    return { ok: false, reason: "wrong_event" };
  }

  const ownerAuthorized =
    session != null && (await isAuthorizedForTicket(session, ticket.event.storeId));
  const scanAuthorized = await isScanCodeAuthorized(trimmedEventId, scanCode);

  if (!ownerAuthorized && !scanAuthorized) {
    return { ok: false, reason: "unauthorized" };
  }

  if (ticket.ticketOrder?.status !== "PAID") {
    return { ok: false, reason: "not_paid" };
  }

  const checkedInBy = ownerAuthorized
    ? session!.userId
    : `scancode:${trimmedEventId}`;

  const result = await prisma.ticket.updateMany({
    where: { qrToken: trimmed, status: "VALID" },
    data: {
      status: "USED",
      checkedInAt: new Date(),
      checkedInBy,
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
