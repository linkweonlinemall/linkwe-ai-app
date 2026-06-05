"use server";

import { randomUUID } from "crypto";

import { NotificationType } from "@prisma/client";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/stripe";
import { BASE_URL } from "@/lib/email/resend";
import { sendEmail } from "@/lib/email/send";
import { ticketConfirmationEmail } from "@/lib/email/templates";
import { createNotification } from "@/app/actions/notifications";

export type CreateTicketPaymentIntentResult =
  | { ok: true; clientSecret: string; ticketOrderId: string; free: false }
  | { ok: true; clientSecret: null; ticketOrderId: string; free: true }
  | { ok: false; error: string };

export async function createTicketPaymentIntent(
  eventId: string,
  items: { ticketTypeId: string; quantity: number }[],
): Promise<CreateTicketPaymentIntentResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Please log in to purchase tickets." };

  if (!eventId) return { ok: false, error: "Event ID is required." };
  if (!items || items.length === 0) return { ok: false, error: "No tickets selected." };
  if (items.some((i) => i.quantity <= 0)) return { ok: false, error: "Invalid ticket quantity." };

  // Load event
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, isPublished: true, status: true },
  });
  if (!event) return { ok: false, error: "Event not found." };
  if (!event.isPublished || event.status !== "PUBLISHED") {
    return { ok: false, error: "This event is not available for ticket purchase." };
  }

  // Load buyer
  const buyer = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, fullName: true, email: true },
  });
  if (!buyer) return { ok: false, error: "User not found." };

  const now = new Date();
  let subtotalMinor = 0;

  type ValidatedItem = {
    ticketTypeId: string;
    ticketTypeName: string;
    quantity: number;
    unitMinor: number;
  };
  const validatedItems: ValidatedItem[] = [];

  // Validate each ticket type server-side
  for (const item of items) {
    const tt = await prisma.eventTicketType.findUnique({
      where: { id: item.ticketTypeId },
      select: {
        id: true,
        eventId: true,
        name: true,
        price: true,
        quantity: true,
        quantitySold: true,
        isVisible: true,
        saleStartDate: true,
        saleEnds: true,
        maxPerOrder: true,
      },
    });

    if (!tt) return { ok: false, error: "Ticket type not found." };
    if (tt.eventId !== eventId) {
      return { ok: false, error: `Ticket type does not belong to this event.` };
    }
    if (!tt.isVisible) {
      return { ok: false, error: `"${tt.name}" tickets are not available.` };
    }
    if (tt.saleStartDate && new Date(tt.saleStartDate) > now) {
      return { ok: false, error: `"${tt.name}" tickets are not on sale yet.` };
    }
    if (tt.saleEnds && new Date(tt.saleEnds) < now) {
      return { ok: false, error: `"${tt.name}" ticket sales have ended.` };
    }
    const remaining = tt.quantity - tt.quantitySold;
    if (remaining <= 0) {
      return { ok: false, error: `"${tt.name}" tickets are sold out.` };
    }
    if (item.quantity > remaining) {
      return {
        ok: false,
        error: `Only ${remaining} "${tt.name}" ticket${remaining !== 1 ? "s" : ""} remaining.`,
      };
    }
    if (item.quantity > tt.maxPerOrder) {
      return {
        ok: false,
        error: `Maximum ${tt.maxPerOrder} "${tt.name}" tickets per order.`,
      };
    }

    // Recompute price server-side — never trust client amount
    const unitMinor = Math.round(tt.price * 100);
    subtotalMinor += unitMinor * item.quantity;
    validatedItems.push({
      ticketTypeId: tt.id,
      ticketTypeName: tt.name,
      quantity: item.quantity,
      unitMinor,
    });
  }

  const totalMinor = subtotalMinor; // No shipping for tickets

  // Generate a human-readable reference like TKT-0001
  const orderCount = await prisma.ticketOrder.count();
  const reference = `TKT-${String(orderCount + 1).padStart(4, "0")}`;

  // Build ticket rows — one per purchased ticket
  let globalIdx = 0;
  const ticketRows = validatedItems.flatMap(({ ticketTypeId, quantity, unitMinor }) =>
    Array.from({ length: quantity }, () => {
      globalIdx++;
      return {
        ticketNumber: `${reference}-${String(globalIdx).padStart(2, "0")}`,
        qrToken: randomUUID(),
        eventId,
        ticketTypeId,
        userId: session.userId,
        holderName: buyer.fullName ?? buyer.email,
        holderEmail: buyer.email,
        pricePaidMinor: unitMinor,
      };
    }),
  );

  const ticketCount = ticketRows.length;

  // ── FREE TICKET PATH ──────────────────────────────────────────
  if (totalMinor === 0) {
    let order;
    try {
      order = await prisma.ticketOrder.create({
        data: {
          reference,
          userId: session.userId,
          eventId,
          status: "PAID",
          subtotal: 0,
          total: 0,
          tickets: { create: ticketRows },
        },
      });
    } catch (e) {
      console.error("[ticket-checkout] free order create", e);
      return { ok: false, error: "Could not register tickets. Please try again." };
    }

    // Increment quantitySold per ticket type
    for (const item of validatedItems) {
      await prisma.eventTicketType.update({
        where: { id: item.ticketTypeId },
        data: { quantitySold: { increment: item.quantity } },
      });
    }

    // Fire-and-forget: notification
    void createNotification({
      userId: session.userId,
      type: NotificationType.TICKET_PURCHASED,
      title: `You're registered for ${event.title}`,
      body: `${ticketCount} free ticket${ticketCount !== 1 ? "s" : ""} confirmed.`,
      linkUrl: "/my-tickets",
    });

    // Fire-and-forget: email
    const emailData = ticketConfirmationEmail({
      customerName: buyer.fullName ?? buyer.email,
      eventTitle: event.title,
      orderRef: reference,
      ticketCount,
      totalTTD: 0,
      myTicketsUrl: `${BASE_URL}/my-tickets`,
    });
    void sendEmail({ to: buyer.email, ...emailData });

    return { ok: true, clientSecret: null, ticketOrderId: order.id, free: true };
  }

  // ── PAID TICKET PATH ─────────────────────────────────────────
  let order;
  try {
    order = await prisma.ticketOrder.create({
      data: {
        reference,
        userId: session.userId,
        eventId,
        status: "PENDING_PAYMENT",
        subtotal: subtotalMinor,
        total: totalMinor,
        tickets: { create: ticketRows },
      },
    });
  } catch (e) {
    console.error("[ticket-checkout] paid order create", e);
    return { ok: false, error: "Could not create ticket order. Please try again." };
  }

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: totalMinor,
      currency: "ttd",
      metadata: {
        ticketOrderId: order.id,
        userId: session.userId,
        eventId,
      },
    });
  } catch (e) {
    console.error("[ticket-checkout] stripe", e);
    // Clean up the orphaned order
    await prisma.ticketOrder.delete({ where: { id: order.id } }).catch(() => {});
    return { ok: false, error: "Payment setup failed. Please try again." };
  }

  const clientSecret = paymentIntent.client_secret;
  if (!clientSecret) {
    await prisma.ticketOrder.delete({ where: { id: order.id } }).catch(() => {});
    return { ok: false, error: "Payment setup failed. Please try again." };
  }

  // Persist the PaymentIntent ID so the webhook can use it for deduplication
  await prisma.ticketOrder.update({
    where: { id: order.id },
    data: { stripePaymentIntentId: paymentIntent.id },
  });

  return { ok: true, clientSecret, ticketOrderId: order.id, free: false };
}
