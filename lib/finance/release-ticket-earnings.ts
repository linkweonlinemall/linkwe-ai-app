import { NotificationType } from "@prisma/client";

import { createNotification } from "@/app/actions/notifications";
import { getTicketCommissionRate, minorToTtd } from "@/lib/finance/commission";
import { createTicketOrderEarningsLedger } from "@/lib/finance/release-earnings";
import { prisma } from "@/lib/prisma";
import { ticketPaidMinor, type TicketPaidMinorInput } from "@/lib/tickets/ticket-paid-minor";

const ELIGIBLE_TICKET_STATUSES = new Set(["VALID", "USED"]);

function ticketGrossMinor(tickets: (TicketPaidMinorInput & { status: string })[]): number {
  return tickets
    .filter((t) => ELIGIBLE_TICKET_STATUSES.has(t.status))
    .reduce((sum, t) => sum + ticketPaidMinor(t), 0);
}

export async function releaseTicketOrderEarnings(
  ticketOrderId: string,
  reason: string,
): Promise<{ ok: true; netMinor: number } | { ok: false; error: string }> {
  const order = await prisma.ticketOrder.findUnique({
    where: { id: ticketOrderId },
    select: {
      id: true,
      reference: true,
      status: true,
      earningsReleased: true,
      event: {
        select: {
          storeId: true,
          store: { select: { ownerId: true } },
        },
      },
      tickets: {
        select: {
          status: true,
          pricePaidMinor: true,
          ticketType: { select: { price: true } },
        },
      },
    },
  });

  if (!order || order.earningsReleased) {
    return { ok: false, error: "Order not eligible" };
  }

  if (order.status !== "PAID") {
    return { ok: false, error: "Order not paid" };
  }

  const grossMinor = ticketGrossMinor(order.tickets);
  const commissionRate = getTicketCommissionRate();
  let netMinor = 0;

  await prisma.$transaction(async (tx) => {
    const fresh = await tx.ticketOrder.findUnique({
      where: { id: ticketOrderId },
      select: { earningsReleased: true },
    });
    if (!fresh || fresh.earningsReleased) return;

    await tx.ticketOrder.update({
      where: { id: ticketOrderId },
      data: { earningsReleased: true },
    });

    if (grossMinor > 0) {
      await createTicketOrderEarningsLedger(tx, {
        storeId: order.event.storeId,
        ticketOrderId: order.id,
        grossMinor,
        commissionRate,
        ledgerEntryType: "TICKET_SALE",
        idempotencyKey: `ticket:${order.id}:TICKET_SALE`,
        description: reason,
      });
      netMinor = grossMinor - Math.round(grossMinor * commissionRate);
    }
  });

  const ownerId = order.event.store.ownerId;
  if (ownerId && netMinor > 0) {
    await createNotification({
      userId: ownerId,
      type: NotificationType.PAYOUT_PROCESSED,
      title: "Event ticket earnings released",
      body: `TTD ${minorToTtd(netMinor).toFixed(2)} added to your balance (${order.reference})`,
      linkUrl: "/dashboard/vendor/finance",
    });
  }

  return { ok: true, netMinor };
}
