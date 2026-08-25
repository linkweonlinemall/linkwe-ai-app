"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { calculateTicketEarningsMinor } from "@/lib/finance/commission";
import { prisma } from "@/lib/prisma";
import { requestWiPayRefund } from "@/lib/wipay/wapi";
import { ticketPaidMinor } from "@/lib/tickets/ticket-paid-minor";

export async function refundTicket(
  ticketId: string,
  amountMinor: number,
): Promise<{ success: true } | { error: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const trimmedId = ticketId?.trim();
  if (!trimmedId) return { error: "Ticket not found" };

  const ticket = await prisma.ticket.findUnique({
    where: { id: trimmedId },
    select: {
      id: true,
      status: true,
      ticketTypeId: true,
      orderId: true,
      pricePaidMinor: true,
      ticketType: { select: { price: true } },
      ticketOrder: {
        select: {
          id: true,
          status: true,
          total: true,
          earningsReleased: true,
          tickets: {
            select: {
              id: true,
              status: true,
              ticketTypeId: true,
              pricePaidMinor: true,
              ticketType: { select: { price: true } },
            },
          },
        },
      },
      event: { select: { storeId: true } },
    },
  });

  if (!ticket?.ticketOrder || !ticket.orderId) {
    return { error: "Ticket or order not found" };
  }

  if (ticket.status === "REFUNDED") {
    return { success: true };
  }

  if (ticket.status === "CANCELLED") {
    return { error: "This ticket was cancelled and cannot be refunded" };
  }

  if (ticket.status !== "VALID" && ticket.status !== "USED") {
    return { error: "This ticket cannot be refunded" };
  }

  const order = ticket.ticketOrder;
  if (order.status !== "PAID") {
    return { error: "Order must be paid before refunding" };
  }

  const ticketPriceMinor = ticketPaidMinor(ticket);
  if (
    !Number.isFinite(amountMinor) ||
    !Number.isInteger(amountMinor) ||
    amountMinor <= 0 ||
    amountMinor > ticketPriceMinor
  ) {
    return {
      error: `Refund amount must be a whole number from 1 to ${ticketPriceMinor} (ticket price in cents)`,
    };
  }

  if (amountMinor !== order.total) {
    return {
      error: `WiPay refunds the complete payment transaction. Enter ${order.total} to refund this entire ticket order.`,
    };
  }

  const payment = await prisma.paymentAttempt.findFirst({
    where: {
      purpose: "TICKET_ORDER",
      targetId: order.id,
      status: { in: ["SUCCEEDED", "REFUND_REQUESTED", "REFUNDED"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!payment?.providerTransactionId) {
    return { error: "The WiPay payment for this ticket order could not be located." };
  }

  try {
    if (payment.status === "SUCCEEDED") {
      await requestWiPayRefund(payment.providerTransactionId);
      await prisma.paymentAttempt.update({
        where: { id: payment.id },
        data: { status: "REFUND_REQUESTED" },
      });
    }
  } catch (e) {
    console.error("[ticket-refund] wipay", e);
    const message = e instanceof Error ? e.message : "WiPay refund failed";
    return { error: message };
  }

  const orderId = ticket.orderId;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    for (const orderTicket of order.tickets) {
      if (orderTicket.status === "REFUNDED" || orderTicket.status === "CANCELLED") continue;
      const paidMinor = ticketPaidMinor(orderTicket);
      await tx.ticket.update({
        where: { id: orderTicket.id },
        data: {
          status: "REFUNDED",
          refundedAt: now,
          refundAmountMinor: paidMinor,
          stripeRefundId: null,
        },
      });
      const tt = await tx.eventTicketType.findUnique({
        where: { id: orderTicket.ticketTypeId },
        select: { quantitySold: true },
      });
      if (tt && tt.quantitySold > 0) {
        await tx.eventTicketType.update({
          where: { id: orderTicket.ticketTypeId },
          data: { quantitySold: { decrement: 1 } },
        });
      }
      if (order.earningsReleased) {
        const key = `ticket:${orderId}:REFUND:${orderTicket.id}`;
        const existing = await tx.vendorLedgerEntry.findFirst({ where: { idempotencyKey: key } });
        if (!existing) {
          const { grossMinor, commissionMinor, netMinor } = calculateTicketEarningsMinor(paidMinor);
          await tx.vendorLedgerEntry.create({
            data: {
              storeId: ticket.event.storeId,
              currency: "TTD",
              entryType: "DEBIT_REFUND",
              ledgerEntryType: "ADJUSTMENT",
              amountMinor: netMinor,
              grossMinor,
              commissionMinor,
              netMinor,
              idempotencyKey: key,
              description: "Ticket order refund clawback",
              metadata: { ticketOrderId: orderId, ticketId: orderTicket.id, refundAmountMinor: paidMinor },
              releasedAt: now,
            },
          });
        }
      }
    }
    await tx.ticketOrder.update({ where: { id: orderId }, data: { status: "REFUNDED" } });
  });

  revalidatePath("/dashboard/admin");
  return { success: true };
}
