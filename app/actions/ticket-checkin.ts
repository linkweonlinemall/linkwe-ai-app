"use server";

import { revalidatePath } from "next/cache";
import type { TicketStatus } from "@prisma/client";

import { getSession } from "@/lib/auth/session";
import { eventScanCodesMatch } from "@/lib/tickets/event-scan-code";
import { admitTicket } from "@/lib/tickets/admit";
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
  ticketOrder: {
    select: { status: true },
  },
} as const;

export type TicketCheckInLookup =
  | { found: false; reason?: "wrong_event" | "not_paid" | "unauthorized" }
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

export type EventAllowlistTicket = {
  qrToken: string;
  ticketNumber: string;
  holderName: string;
  ticketTypeName: string;
  status: TicketStatus;
};

export type GetEventAllowlistResult =
  | { ok: false }
  | { ok: true; tickets: EventAllowlistTicket[] };

export async function getEventAllowlist(
  eventId: string,
  scanCode: string,
): Promise<GetEventAllowlistResult> {
  const trimmedId = eventId?.trim();
  if (!trimmedId) return { ok: false };

  const event = await prisma.event.findUnique({
    where: { id: trimmedId },
    select: { scanCode: true },
  });

  if (!event?.scanCode || !eventScanCodesMatch(event.scanCode, scanCode)) {
    return { ok: false };
  }

  const tickets = await prisma.ticket.findMany({
    where: {
      eventId: trimmedId,
      status: { notIn: ["REFUNDED", "CANCELLED"] },
      ticketOrder: { status: "PAID" },
    },
    select: {
      qrToken: true,
      ticketNumber: true,
      holderName: true,
      status: true,
      ticketType: { select: { name: true } },
    },
  });

  return {
    ok: true,
    tickets: tickets.map((t) => ({
      qrToken: t.qrToken,
      ticketNumber: t.ticketNumber,
      holderName: t.holderName,
      ticketTypeName: t.ticketType.name,
      status: t.status,
    })),
  };
}

export type OfflineCheckInSyncOutcome = "ADMITTED" | "DUPLICATE" | "invalid" | "retry";

export type SyncOfflineCheckInsResult =
  | { ok: false }
  | { ok: true; results: { qrToken: string; outcome: OfflineCheckInSyncOutcome }[] };

export async function syncOfflineCheckIns(
  eventId: string,
  scanCode: string,
  scans: { qrToken: string; scannedAt: number; deviceId: string; deviceLabel?: string }[],
): Promise<SyncOfflineCheckInsResult> {
  const trimmedId = eventId?.trim();
  if (!trimmedId) return { ok: false };

  const event = await prisma.event.findUnique({
    where: { id: trimmedId },
    select: { scanCode: true },
  });

  if (!event?.scanCode || !eventScanCodesMatch(event.scanCode, scanCode)) {
    return { ok: false };
  }

  if (!Array.isArray(scans) || scans.length > 100) return { ok: false };
  const results: { qrToken: string; outcome: OfflineCheckInSyncOutcome }[] = [];
  // Preserve request order so each acknowledged row maps to the exact queued scan.
  for (const scan of scans) {
    if (!scan || typeof scan.qrToken !== "string" || scan.qrToken.length > 200 || !Number.isFinite(scan.scannedAt) || scan.scannedAt < Date.now() - 7 * 86400000 || scan.scannedAt > Date.now() + 300000 || typeof scan.deviceId !== "string" || !scan.deviceId || scan.deviceId.length > 100 || (scan.deviceLabel !== undefined && typeof scan.deviceLabel !== "string")) {
      results.push({ qrToken: scan?.qrToken ?? "", outcome: "invalid" }); continue;
    }
    try {
      const result = await admitTicket(prisma, { qrToken: scan.qrToken.trim(), eventId: trimmedId, source: "OFFLINE", scannedAt: new Date(scan.scannedAt), checkedInBy: `scancode:${trimmedId}`, deviceId: scan.deviceId, deviceLabel: scan.deviceLabel });
      results.push({ qrToken: scan.qrToken, outcome: result.outcome });
    } catch {
      results.push({ qrToken: scan.qrToken, outcome: "retry" });
    }
  }
  revalidatePath(`/dashboard/vendor/events/${trimmedId}/attendees`);
  return { ok: true, results };
}

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

export async function getTicketForCheckIn(qrToken: string, expectedEventId?: string, scanCode?: string): Promise<TicketCheckInLookup> {
  const trimmed = qrToken?.trim();
  if (!trimmed) return { found: false };

  const session = await getSession();

  if (trimmed.length > 200) return { found: false };
  let eventAuthorized = false;
  if (expectedEventId) {
    const event = await prisma.event.findUnique({ where: { id: expectedEventId }, select: { storeId: true } });
    eventAuthorized = !!event && (await isAuthorizedForTicket(session, event.storeId) || await isScanCodeAuthorized(expectedEventId, scanCode));
    if (!eventAuthorized) return { found: false, reason: "unauthorized" };
  }
  const ticket = expectedEventId
    ? await prisma.ticket.findFirst({ where: { OR: [{ qrToken: trimmed }, { ticketNumber: { equals: trimmed, mode: "insensitive" } }] }, select: ticketSelect })
    : await prisma.ticket.findUnique({ where: { qrToken: trimmed }, select: ticketSelect });
  if (!ticket) return { found: false };
  if (expectedEventId && ticket.event.id !== expectedEventId) return { found: false, reason: "wrong_event" };
  if (ticket.ticketOrder?.status !== "PAID" && ticket.status !== "REFUNDED" && ticket.status !== "CANCELLED") return { found: false, reason: "not_paid" };
  const authorized = eventAuthorized || await isAuthorizedForTicket(session, ticket.event.storeId);

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
  device?: { id?: string; label?: string },
): Promise<CheckInTicketResult> {
  const session = await getSession();

  const trimmed = qrToken?.trim();
  if (!trimmed) return { ok: false, reason: "not_valid" };

  const trimmedEventId = expectedEventId?.trim();
  if (!trimmedEventId) return { ok: false, reason: "not_valid" };

  const ticket = await prisma.ticket.findUnique({
    where: { qrToken: trimmed },
    select: {
      id: true,
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

  const result = await admitTicket(prisma, { qrToken: trimmed, eventId: trimmedEventId, source: "ONLINE", scannedAt: new Date(), checkedInBy: ownerAuthorized ? session!.userId : `scancode:${trimmedEventId}`, deviceId: typeof device?.id === "string" ? device.id.slice(0,100) : undefined, deviceLabel: typeof device?.label === "string" ? device.label.slice(0,60) : undefined });
  if (result.outcome === "ADMITTED") {
    revalidatePath(`/checkin/${trimmed}`);
    revalidatePath(`/dashboard/vendor/events/${trimmedEventId}/attendees`);
    return { ok: true, justCheckedIn: true };
  }
  if (result.outcome === "DUPLICATE") return { ok: false, reason: "already_used", checkedInAt: result.checkedInAt };
  return { ok: false, reason: result.reason ?? "not_valid" };
}

export type DuplicateCheckInEntry = {
  ticketNumber: string;
  holderName: string;
  duplicateScannedAt: string;
  duplicateDeviceId: string | null;
  duplicateDeviceLabel: string | null;
  duplicateSource: string;
  admittedScannedAt: string | null;
  admittedDeviceId: string | null;
  admittedDeviceLabel: string | null;
  admittedSource: string | null;
};

export type EventCheckInReportResult =
  | { ok: false }
  | {
      ok: true;
      duplicates: DuplicateCheckInEntry[];
      summary: {
        totalOfflineSynced: number;
        totalDuplicates: number;
      };
    };

export async function getEventCheckInReport(
  eventId: string,
): Promise<EventCheckInReportResult> {
  const trimmedId = eventId?.trim();
  if (!trimmedId) return { ok: false };

  const session = await getSession();

  const event = await prisma.event.findUnique({
    where: { id: trimmedId },
    select: { id: true, storeId: true },
  });

  if (!event) return { ok: false };

  if (!(await isAuthorizedForTicket(session, event.storeId))) {
    return { ok: false };
  }

  const [duplicateRows, totalOfflineSynced, totalDuplicates] = await Promise.all([
    prisma.ticketCheckIn.findMany({
      where: { eventId: trimmedId, outcome: "DUPLICATE" },
      orderBy: { scannedAt: "desc" },
      take: 200,
      select: {
        scannedAt: true,
        deviceId: true,
        deviceLabel: true,
        source: true,
        ticketId: true,
        ticket: {
          select: {
            ticketNumber: true,
            holderName: true,
          },
        },
      },
    }),
    prisma.ticketCheckIn.count({
      where: { eventId: trimmedId, source: "OFFLINE" },
    }),
    prisma.ticketCheckIn.count({ where: { eventId: trimmedId, outcome: "DUPLICATE" } }),
  ]);

  const ticketIds = [...new Set(duplicateRows.map((row) => row.ticketId))];

  const admittedRows =
    ticketIds.length > 0
      ? await prisma.ticketCheckIn.findMany({
          where: {
            eventId: trimmedId,
            outcome: "ADMITTED",
            ticketId: { in: ticketIds },
          },
          orderBy: { scannedAt: "asc" },
          select: {
            ticketId: true,
            scannedAt: true,
            deviceId: true,
            deviceLabel: true,
            source: true,
          },
        })
      : [];

  const earliestAdmittedByTicket = new Map<
    string,
    {
      scannedAt: Date;
      deviceId: string | null;
      deviceLabel: string | null;
      source: string;
    }
  >();

  for (const row of admittedRows) {
    if (!earliestAdmittedByTicket.has(row.ticketId)) {
      earliestAdmittedByTicket.set(row.ticketId, {
        scannedAt: row.scannedAt,
        deviceId: row.deviceId,
        deviceLabel: row.deviceLabel,
        source: row.source,
      });
    }
  }

  const duplicates: DuplicateCheckInEntry[] = duplicateRows.map((row) => {
    const admitted = earliestAdmittedByTicket.get(row.ticketId);
    return {
      ticketNumber: row.ticket.ticketNumber,
      holderName: row.ticket.holderName,
      duplicateScannedAt: row.scannedAt.toISOString(),
      duplicateDeviceId: row.deviceId,
      duplicateDeviceLabel: row.deviceLabel,
      duplicateSource: row.source,
      admittedScannedAt: admitted?.scannedAt.toISOString() ?? null,
      admittedDeviceId: admitted?.deviceId ?? null,
      admittedDeviceLabel: admitted?.deviceLabel ?? null,
      admittedSource: admitted?.source ?? null,
    };
  });

  return {
    ok: true,
    duplicates,
    summary: {
      totalOfflineSynced,
      totalDuplicates,
    },
  };
}

export async function getEventGateSummary(eventId: string, scanCode?: string) {
  const session = await getSession();
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { storeId: true } });
  if (!event || !(await isAuthorizedForTicket(session, event.storeId) || await isScanCodeAuthorized(eventId, scanCode))) return { error: "Access expired. Sign in or ask the host for a current staff code." };
  const rows = await prisma.ticket.groupBy({ by: ["status"], where: { eventId, ticketOrder: { status: "PAID" }, status: { in: ["VALID", "USED"] } }, _count: { _all: true } });
  const admitted = rows.find(row=>row.status==="USED")?._count._all ?? 0;
  const remaining = rows.find(row=>row.status==="VALID")?._count._all ?? 0;
  return { admitted, remaining, total: admitted+remaining };
}
