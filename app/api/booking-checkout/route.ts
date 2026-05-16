import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/stripe";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { bookingId, serviceName, price, successUrl, cancelUrl } = body;

  if (!bookingId || !price || !successUrl) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify booking belongs to this user
  const booking = await prisma.productBooking.findFirst({
    where: { id: bookingId, customerId: session.userId },
    select: { id: true, status: true, totalPrice: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "ttd",
            product_data: {
              name: serviceName ?? "Service Booking",
              description: `Booking ID: ${bookingId}`,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        bookingId,
        userId: session.userId,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch {
    return NextResponse.json({ error: "Stripe checkout failed" }, { status: 500 });
  }
}
