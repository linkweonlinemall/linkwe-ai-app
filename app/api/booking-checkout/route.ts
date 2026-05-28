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
  const { bookingId, serviceName, price, successUrl, cancelUrl, paymentType } = body as {
    bookingId?: string;
    serviceName?: string;
    price?: number;
    successUrl?: string;
    cancelUrl?: string;
    paymentType?: "full" | "deposit";
  };

  if (!bookingId || price == null || !successUrl) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const booking = await prisma.productBooking.findFirst({
    where: { id: bookingId, customerId: session.userId },
    select: {
      id: true,
      status: true,
      totalPrice: true,
      product: {
        select: { depositAmount: true },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const depositDue =
    booking.product.depositAmount != null && booking.product.depositAmount > 0
      ? booking.product.depositAmount
      : null;

  const expectedAmount =
    paymentType === "deposit" && depositDue != null
      ? depositDue
      : booking.totalPrice;

  if (Math.abs(Number(price) - expectedAmount) > 0.01) {
    return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
  }

  const chargeLabel =
    paymentType === "deposit" && depositDue != null
      ? `Booking deposit — ${serviceName ?? "Service"}`
      : `Service booking — ${serviceName ?? "Service"}`;

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "ttd",
            product_data: {
              name: chargeLabel,
              description: `Booking ID: ${bookingId}`,
            },
            unit_amount: Math.round(expectedAmount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        bookingId,
        userId: session.userId,
        paymentType: paymentType === "deposit" ? "deposit" : "full",
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch {
    return NextResponse.json({ error: "Stripe checkout failed" }, { status: 500 });
  }
}
