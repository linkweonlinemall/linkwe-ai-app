import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { NotificationType } from "@prisma/client";

import { handleBookingPaymentIntentSucceeded } from "@/lib/finance/booking-payment";
import { createSplitOrdersFromMainOrder } from "@/lib/fulfillment/split-orders";
import { createNotification } from "@/app/actions/notifications";
import { BASE_URL } from "@/lib/email/resend";
import { sendEmail } from "@/lib/email/send";
import { ticketConfirmationEmail } from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/stripe";

export const runtime = "nodejs";

// ── Ticket order fulfilment ────────────────────────────────────────────────────
// Idempotent: updateMany only matches PENDING_PAYMENT; a second Stripe retry
// gets count=0 and exits immediately without re-incrementing sold counts or
// re-sending emails.
async function handleTicketOrderPaid(
  ticketOrderId: string,
  paymentIntentId: string,
): Promise<void> {
  const updated = await prisma.ticketOrder.updateMany({
    where: { id: ticketOrderId, status: "PENDING_PAYMENT" },
    data: { status: "PAID", stripePaymentIntentId: paymentIntentId },
  });

  if (updated.count === 0) return; // Already processed — nothing to do

  const order = await prisma.ticketOrder.findUnique({
    where: { id: ticketOrderId },
    select: {
      reference: true,
      total: true,
      userId: true,
      event: { select: { title: true } },
      user: { select: { email: true, fullName: true } },
      tickets: { select: { ticketTypeId: true } },
    },
  });

  if (!order) return;

  // Increment quantitySold per ticket type — count from the tickets array
  const countByType = new Map<string, number>();
  for (const ticket of order.tickets) {
    countByType.set(ticket.ticketTypeId, (countByType.get(ticket.ticketTypeId) ?? 0) + 1);
  }
  for (const [ticketTypeId, count] of countByType) {
    await prisma.eventTicketType
      .update({ where: { id: ticketTypeId }, data: { quantitySold: { increment: count } } })
      .catch((err) => console.error("[webhook/ticket] quantitySold increment failed:", err));
  }

  const ticketCount = order.tickets.length;

  // createNotification has an internal try/catch — cannot throw out
  await createNotification({
    userId: order.userId,
    type: NotificationType.TICKET_PURCHASED,
    title: `Tickets confirmed — ${order.event.title}`,
    body: `${ticketCount} ticket${ticketCount !== 1 ? "s" : ""} for ${order.event.title}`,
    linkUrl: "/my-tickets",
  });

  // sendEmail has an internal try/catch — cannot throw out
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

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook] Invalid signature:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        const requestId = checkoutSession.metadata?.requestId;

        if (requestId) {
          await prisma.onDemandRequest.update({
            where: { id: requestId },
            data: { status: "CONFIRMED" },
          });
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata?.bookingId;
        if (bookingId) {
          await handleBookingPaymentIntentSucceeded(paymentIntent);
        }

        const orderId = paymentIntent.metadata?.orderId;
        if (orderId) {
          await prisma.mainOrder.updateMany({
            where: { id: orderId, status: "PENDING_PAYMENT" },
            data: { status: "PAID" },
          });
          await createSplitOrdersFromMainOrder(orderId);
        }

        const ticketOrderId = paymentIntent.metadata?.ticketOrderId;
        if (ticketOrderId) {
          await handleTicketOrderPaid(ticketOrderId, paymentIntent.id);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[webhook] Handler error:", message, stack);
    return NextResponse.json({ error: "Handler error", message, stack }, { status: 500 });
  }
}
