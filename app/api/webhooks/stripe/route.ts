import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { createSplitOrdersFromMainOrder } from "@/lib/fulfillment/split-orders";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/stripe";

export const runtime = "nodejs";

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
        const orderId = paymentIntent.metadata?.orderId;
        if (orderId) {
          await prisma.mainOrder.updateMany({
            where: { id: orderId, status: "PENDING_PAYMENT" },
            data: { status: "PAID" },
          });
          await createSplitOrdersFromMainOrder(orderId);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook] Handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}
