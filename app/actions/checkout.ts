"use server";

import { revalidatePath } from "next/cache";

import type { CheckoutPricingLine } from "@/lib/checkout/pricing";
import { getCheckoutTotal } from "@/lib/checkout/pricing";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getShippingZone } from "@/lib/shipping/trinidad-zoning";
import { createSplitOrdersFromMainOrder } from "@/lib/fulfillment/split-orders";
import { stripe } from "@/lib/stripe/stripe";

export type CheckoutItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  storeId: string;
  storeName: string;
};

export type CreatePaymentIntentResult =
  | { ok: true; clientSecret: string; orderId: string }
  | { ok: false; error: string };

export async function createPaymentIntent(
  _deliveryAddress: string,
  deliveryRegion: string,
  useDelivery: boolean,
): Promise<CreatePaymentIntentResult> {

  const session = await getSession();
  if (!session) return { ok: false, error: "not_logged_in" };

  const cartItems = await prisma.productCartItem.findMany({
    where: { userId: session.userId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          isPublished: true,
          deliveryFee: true,
          allowDelivery: true,
          allowPickup: true,
          storeId: true,
          weight: true,
          weightUnit: true,
          store: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (cartItems.length === 0) return { ok: false, error: "cart_empty" };

  for (const item of cartItems) {
    if (!item.product.isPublished) {
      return { ok: false, error: `${item.product.name} is no longer available.` };
    }
    if (item.product.stock !== null && item.product.stock < item.quantity) {
      return { ok: false, error: `Not enough stock for ${item.product.name}.` };
    }
  }

  const pricingLines: CheckoutPricingLine[] = cartItems.map((item) => ({
    priceMinor: Math.round(item.product.price * 100),
    quantity: item.quantity,
    weightLbs: item.product.weight
      ? item.product.weightUnit === "KG"
        ? item.product.weight * 2.20462
        : item.product.weight
      : 0.5,
  }));

  const totalWeightLbs = pricingLines.reduce(
    (sum, line) => sum + line.weightLbs * line.quantity,
    0,
  );

  const totals = getCheckoutTotal(
    pricingLines,
    deliveryRegion,
    useDelivery ? totalWeightLbs : 0,
  );

  const subtotalMinor = totals.subtotalMinor;
  const shippingMinor = totals.shippingMinor;
  const totalMinor = totals.totalMinor;

  const storeIds = [...new Set(cartItems.map((i) => i.product.storeId))];
  const primaryStoreId = storeIds[0];

  let order;
  try {
    order = await prisma.mainOrder.create({
      data: {
        buyerId: session.userId,
        status: "PENDING_PAYMENT",
        region: deliveryRegion || "unknown",
        shippingZone: getShippingZone(deliveryRegion),
        subtotalMinor,
        shippingMinor,
        totalMinor,
        items: {
          create: cartItems.map((item, index) => ({
            listingId: null,
            productId: item.productId,
            storeId: item.product.storeId,
            titleSnapshot: item.product.name,
            priceMinor: Math.round(item.product.price * 100),
            quantity: item.quantity,
            weightLbs: pricingLines[index]?.weightLbs ?? 0.5,
          })),
        },
      },
    });

    const orderCount = await prisma.mainOrder.count();
    const refNumber = `LW-${String(orderCount).padStart(4, "0")}`;
    await prisma.mainOrder.update({
      where: { id: order.id },
      data: { referenceNumber: refNumber },
    });
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Could not create order. Please try again." };
  }

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: totalMinor,
      currency: "ttd",
      metadata: {
        orderId: order.id,
        userId: session.userId,
        storeId: primaryStoreId,
      },
    });
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Payment setup failed. Please try again." };
  }

  const clientSecret = paymentIntent.client_secret;
  if (!clientSecret) {
    return { ok: false, error: "Payment setup failed." };
  }

  await prisma.mainOrder.update({
    where: { id: order.id },
    data: { status: "PENDING_PAYMENT" },
  });

  return { ok: true, clientSecret, orderId: order.id };
}

export async function confirmOrderPaid(orderId: string): Promise<void> {
  const session = await getSession();
  if (!session) return;

  await prisma.mainOrder.update({
    where: { id: orderId, buyerId: session.userId },
    data: { status: "PAID" },
  });

  await createSplitOrdersFromMainOrder(orderId);

  await prisma.productCartItem.deleteMany({
    where: { userId: session.userId },
  });

  revalidatePath("/cart");
  revalidatePath("/checkout");
}
