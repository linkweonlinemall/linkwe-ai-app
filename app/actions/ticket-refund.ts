"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { calculateTicketEarningsMinor } from "@/lib/finance/commission";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/stripe";

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
      ticketType: { select: { price: true } },
      ticketOrder: {
        select: {
          id: true,
          status: true,
          stripePaymentIntentId: true,
          earningsReleased: true,
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

  if (!order.stripePaymentIntentId) {
    return { error: "Free tickets cannot be refunded through Stripe" };
  }

  const ticketPriceMinor = Math.round(ticket.ticketType.price * 100);
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

  let stripeRefund;
  try {
    stripeRefund = await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
      amount: amountMinor,
    });
  } catch (e) {
    console.error("[ticket-refund] stripe", e);
    const message = e instanceof Error ? e.message : "Stripe refund failed";
    return { error: message };
  }

  const orderId = ticket.orderId;
  const idempotencyKey = `ticket:${orderId}:REFUND:${ticket.id}`;
  const { grossMinor, commissionMinor, netMinor } = calculateTicketEarningsMinor(ticketPriceMinor);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const fresh = await tx.ticket.findUnique({
      where: { id: ticket.id },
      select: { status: true },
    });
    if (!fresh || fresh.status === "REFUNDED") return;

    await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        status: "REFUNDED",
        refundedAt: now,
        refundAmountMinor: amountMinor,
        stripeRefundId: stripeRefund.id,
      },
    });

    const tt = await tx.eventTicketType.findUnique({
      where: { id: ticket.ticketTypeId },
      select: { quantitySold: true },
    });
    if (tt && tt.quantitySold > 0) {
      await tx.eventTicketType.update({
        where: { id: ticket.ticketTypeId },
        data: { quantitySold: { decrement: 1 } },
      });
    }

    if (order.earningsReleased) {
      const existing = await tx.vendorLedgerEntry.findFirst({
        where: { idempotencyKey },
      });
      if (!existing) {
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
            idempotencyKey,
            description: `Ticket refund clawback`,
            metadata: {
              ticketOrderId: orderId,
              ticketId: ticket.id,
              refundAmountMinor: amountMinor,
            },
            releasedAt: now,
          },
        });
      }
    }
  });

  revalidatePath("/dashboard/admin");
  return { success: true };
}
