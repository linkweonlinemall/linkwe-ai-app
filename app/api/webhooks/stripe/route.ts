import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { createSplitOrdersFromMainOrder } from "@/lib/fulfillment/split-orders";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const orderId = pi.metadata?.orderId;
    if (orderId) {
      await prisma.mainOrder.updateMany({
        where: { id: orderId, status: "PENDING_PAYMENT" },
        data: { status: "PAID" },
      });
      await createSplitOrdersFromMainOrder(orderId);
    }
  }

  return NextResponse.json({ received: true });
}
