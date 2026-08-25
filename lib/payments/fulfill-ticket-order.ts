import { NotificationType } from "@prisma/client";

import { createNotification } from "@/app/actions/notifications";
import { BASE_URL } from "@/lib/email/resend";
import { sendEmail } from "@/lib/email/send";
import { ticketConfirmationEmail } from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";

const TICKET_PAYOUT_HOLD_HOURS = 72;

export async function fulfillPaidTicketOrder(ticketOrderId: string): Promise<void> {
  const order = await prisma.$transaction(async (tx) => {
    const claimed = await tx.ticketOrder.updateMany({
      where: { id: ticketOrderId, status: "PENDING_PAYMENT" },
      data: {
        status: "PAID",
        promoReservationExpiresAt: null,
      },
    });
    if (claimed.count === 0) return null;

    const claimedOrder = await tx.ticketOrder.findUnique({
      where: { id: ticketOrderId },
      select: {
        reference: true,
        total: true,
        userId: true,
        promoCodeId: true,
        event: { select: { title: true, startDate: true, endDate: true } },
        user: { select: { email: true, fullName: true } },
        tickets: { select: { ticketTypeId: true } },
      },
    });
    if (!claimedOrder) throw new Error(`Paid ticket order not found: ${ticketOrderId}`);

    if (claimedOrder.promoCodeId) {
      await tx.eventPromoCode.update({
        where: { id: claimedOrder.promoCodeId },
        data: { usedCount: { increment: 1 } },
      });
    }
    const eventEnd = claimedOrder.event.endDate ?? claimedOrder.event.startDate;
    await tx.ticketOrder.update({
      where: { id: ticketOrderId },
      data: {
        payoutEligibleAt: new Date(
          eventEnd.getTime() + TICKET_PAYOUT_HOLD_HOURS * 60 * 60 * 1000,
        ),
      },
    });
    const countByType = new Map<string, number>();
    for (const ticket of claimedOrder.tickets) {
      countByType.set(ticket.ticketTypeId, (countByType.get(ticket.ticketTypeId) ?? 0) + 1);
    }
    for (const [ticketTypeId, count] of countByType) {
      await tx.eventTicketType.update({
        where: { id: ticketTypeId },
        data: { quantitySold: { increment: count } },
      });
    }
    return claimedOrder;
  });

  if (!order) return;
  const ticketCount = order.tickets.length;
  await createNotification({
    userId: order.userId,
    type: NotificationType.TICKET_PURCHASED,
    title: `Tickets confirmed — ${order.event.title}`,
    body: `${ticketCount} ticket${ticketCount !== 1 ? "s" : ""} for ${order.event.title}`,
    linkUrl: "/my-tickets",
  });
  await sendEmail({
    to: order.user.email,
    ...ticketConfirmationEmail({
      customerName: order.user.fullName ?? order.user.email,
      eventTitle: order.event.title,
      orderRef: order.reference,
      ticketCount,
      totalTTD: order.total / 100,
      myTicketsUrl: `${BASE_URL}/my-tickets`,
    }),
  });
}
