import type { PrismaClient, TicketStatus } from "@prisma/client";

type Scan = { qrToken: string; eventId: string; source: "ONLINE" | "OFFLINE"; scannedAt: Date; checkedInBy: string; deviceId?: string; deviceLabel?: string };
export type Admission = { outcome: "ADMITTED" | "DUPLICATE" | "invalid"; reason?: "not_valid" | "wrong_event" | "cancelled" | "refunded" | "not_paid"; checkedInAt?: Date | null };
/** The ticket and its audit entry commit together. Row locks also make offline retries idempotent. */
export async function admitTicket(db: PrismaClient, scan: Scan): Promise<Admission> {
  return db.$transaction(async tx => {
    const initial = await tx.ticket.findUnique({ where: { qrToken: scan.qrToken }, select: { id: true, eventId: true, orderId: true } });
    if (!initial) return { outcome: "invalid", reason: "not_valid" };
    if (initial.eventId !== scan.eventId) return { outcome: "invalid", reason: "wrong_event" };
    if (!initial.orderId) return { outcome: "invalid", reason: "not_paid" };
    // Use the same order → ticket lock order as payment/refund operations.
    await tx.$queryRaw`SELECT id FROM ticket_orders WHERE id = ${initial.orderId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM tickets WHERE id = ${initial.id} FOR UPDATE`;
    if (scan.source === "OFFLINE") {
      const previous = await tx.ticketCheckIn.findFirst({ where: { ticketId: initial.id, source: "OFFLINE", deviceId: scan.deviceId, scannedAt: scan.scannedAt }, select: { outcome: true } });
      if (previous) return { outcome: previous.outcome as Admission["outcome"] };
    }
    const ticket = await tx.ticket.findUniqueOrThrow({ where: { id: initial.id }, select: { status: true, checkedInAt: true, ticketOrder: { select: { status: true } } } });
    const terminal: Partial<Record<TicketStatus, Admission["reason"]>> = { CANCELLED: "cancelled", REFUNDED: "refunded" };
    const reason = terminal[ticket.status] ?? (ticket.ticketOrder?.status !== "PAID" ? "not_paid" : undefined);
    const outcome = reason ? "invalid" : ticket.status === "VALID" ? "ADMITTED" : ticket.status === "USED" ? "DUPLICATE" : "invalid";
    if (outcome === "ADMITTED") await tx.ticket.update({ where: { id: initial.id }, data: { status: "USED", checkedInAt: scan.scannedAt, checkedInBy: scan.checkedInBy } });
    await tx.ticketCheckIn.create({ data: { ticketId: initial.id, eventId: scan.eventId, source: scan.source, scannedAt: scan.scannedAt, deviceId: scan.deviceId?.slice(0,100) || null, deviceLabel: scan.deviceLabel?.trim().slice(0,60) || null, outcome } });
    return { outcome, reason, checkedInAt: ticket.checkedInAt };
  }, { timeout: 15000 });
}
