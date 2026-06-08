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

export type OfflineCheckInSyncOutcome = "ADMITTED" | "DUPLICATE" | "invalid";

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

  const results: { qrToken: string; outcome: OfflineCheckInSyncOutcome }[] = [];
  const sorted = [...scans].sort((a, b) => a.scannedAt - b.scannedAt);

  for (const scan of sorted) {
    try {
      const trimmedToken = scan.qrToken?.trim();
      if (!trimmedToken) {
        results.push({ qrToken: scan.qrToken, outcome: "invalid" });
        continue;
      }

      const ticket = await prisma.ticket.findUnique({
        where: { qrToken: trimmedToken },
        select: {
          id: true,
          eventId: true,
          status: true,
          checkedInAt: true,
        },
      });

      if (!ticket || ticket.eventId !== trimmedId) {
        results.push({ qrToken: scan.qrToken, outcome: "invalid" });
        continue;
      }

      const scannedAtDate = new Date(scan.scannedAt);

      const earlierAdmitted = await prisma.ticketCheckIn.findFirst({
        where: {
          ticketId: ticket.id,
          outcome: "ADMITTED",
          scannedAt: { lt: scannedAtDate },
        },
        select: { id: true },
      });

      const usedFromEarlierCheckIn =
        ticket.status === "USED" &&
        ticket.checkedInAt != null &&
        ticket.checkedInAt.getTime() < scan.scannedAt;

      let outcome: "ADMITTED" | "DUPLICATE";

      if (earlierAdmitted || usedFromEarlierCheckIn || ticket.status !== "VALID") {
        outcome = "DUPLICATE";
      } else {
        outcome = "ADMITTED";
      }

      try {
        await prisma.ticketCheckIn.create({
          data: {
            ticketId: ticket.id,
            eventId: trimmedId,
            scannedAt: scannedAtDate,
            source: "OFFLINE",
            deviceId: scan.deviceId || null,
            deviceLabel: scan.deviceLabel?.trim() || null,
            outcome,
          },
        });
      } catch {
        // Non-blocking per-row audit insert.
      }

      if (outcome === "ADMITTED") {
        try {
          await prisma.ticket.updateMany({
            where: { id: ticket.id, status: "VALID" },
            data: {
              status: "USED",
              checkedInAt: scannedAtDate,
              checkedInBy: `scancode:${trimmedId}`,
            },
          });
        } catch {
          // Non-blocking; audit row still records the admission attempt.
        }
      }

      results.push({ qrToken: scan.qrToken, outcome });
    } catch {
      results.push({ qrToken: scan.qrToken, outcome: "invalid" });
    }
  }

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
    try {
      await prisma.ticketCheckIn.create({
        data: {
          ticketId: ticket.id,
          eventId: ticket.eventId,
          scannedAt: new Date(),
          source: "ONLINE",
          deviceId: null,
          outcome: "ADMITTED",
        },
      });
    } catch (err) {
      console.error("[checkInTicket] TicketCheckIn audit insert failed:", err);
    }

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

  const [duplicateRows, totalOfflineSynced] = await Promise.all([
    prisma.ticketCheckIn.findMany({
      where: { eventId: trimmedId, outcome: "DUPLICATE" },
      orderBy: { scannedAt: "asc" },
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
      totalDuplicates: duplicateRows.length,
    },
  };
}
