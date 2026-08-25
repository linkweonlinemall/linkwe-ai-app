"use server";

import {
  computeCartShipping,
  computeCartShippingFromItems,
  formatCoverageBlockError,
  loadCheckoutCart,
  type CheckoutShippingBreakdown,
} from "@/lib/checkout/compute-cart-shipping";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createWiPayHostedPayment } from "@/lib/wipay/payments";
import { BASE_URL } from "@/lib/email/resend";
import { isStoreSellable } from "@/lib/store/sellable-store";
import { isValidRegion } from "@/lib/regions/tt-regions";

export type CheckoutItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  storeId: string;
  storeName: string;
};

export type CreatePaymentIntentResult =
  | { ok: true; checkoutUrl: string; orderId: string }
  | { ok: false; error: string };

export type CheckoutShippingBreakdownResult =
  | ({ ok: true } & CheckoutShippingBreakdown)
  | { ok: false; error?: string };

export async function getCheckoutShippingBreakdown(
  deliveryRegion: string,
  useDelivery: boolean,
): Promise<CheckoutShippingBreakdownResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "not_logged_in" };

  const result = await computeCartShipping(session.userId, deliveryRegion, useDelivery);
  if (!result.ok) return { ok: false, error: result.error };

  return {
    ok: true,
    perStore: result.perStore,
    totalShippingMinor: result.totalShippingMinor,
    hasCoverageFailure: result.hasCoverageFailure,
    blockedStores: result.blockedStores,
  };
}

export async function createPaymentIntent(
  deliveryAddress: string,
  deliveryRegion: string,
  useDelivery: boolean,
  deliveryLat?: number | null,
  deliveryLng?: number | null,
  deliveryPhone?: string | null,
): Promise<CreatePaymentIntentResult> {

  const session = await getSession();
  if (!session) return { ok: false, error: "not_logged_in" };

  const cartItems = await loadCheckoutCart(session.userId);
  if (cartItems.length === 0) return { ok: false, error: "cart_empty" };

  for (const item of cartItems) {
    if (!item.product.isPublished) {
      return { ok: false, error: `${item.product.name} is no longer available.` };
    }
    if (!isStoreSellable(item.product.store)) {
      return { ok: false, error: `${item.product.name} is no longer available.` };
    }
    if (item.product.stock !== null && item.product.stock < item.quantity) {
      return { ok: false, error: `Not enough stock for ${item.product.name}.` };
    }
  }

  const cartRequiresDelivery =
    useDelivery && cartItems.some((item) => !item.product.isDigital);

  if (cartRequiresDelivery) {
    const region = deliveryRegion.trim();
    if (!region || !isValidRegion(region)) {
      return { ok: false, error: "Please select a valid delivery region." };
    }
  }

  const shipping = await computeCartShippingFromItems(
    cartItems,
    deliveryRegion,
    useDelivery,
  );

  if (shipping.hasCoverageFailure) {
    return { ok: false, error: formatCoverageBlockError(shipping.blockedStores) };
  }

  const { subtotalMinor, totalShippingMinor: shippingMinor, zone, pricingLines } = shipping;
  const totalMinor = subtotalMinor + shippingMinor;

  const recentPending = await prisma.mainOrder.findFirst({
    where: {
      buyerId: session.userId,
      status: "PENDING_PAYMENT",
      createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
    },
    select: { id: true },
  });

  if (recentPending) {
    await prisma.orderItem.deleteMany({
      where: { mainOrderId: recentPending.id },
    });
    await prisma.mainOrder.delete({
      where: { id: recentPending.id },
    });
  }

  let shippingAddressId: string | undefined;
  const trimmedAddress = deliveryAddress.trim();
  if (useDelivery && trimmedAddress) {
    const savedAddress = await prisma.address.create({
      data: {
        userId: session.userId,
        line1: trimmedAddress,
        city: deliveryRegion || "unknown",
        region: deliveryRegion || null,
        country: "TT",
        latitude: deliveryLat ?? null,
        longitude: deliveryLng ?? null,
        phone: deliveryPhone?.trim() || null,
      },
    });
    shippingAddressId = savedAddress.id;
  }

  let order;
  try {
    order = await prisma.mainOrder.create({
      data: {
        buyerId: session.userId,
        status: "PENDING_PAYMENT",
        region: deliveryRegion || "unknown",
        shippingZone: zone,
        subtotalMinor,
        shippingMinor,
        totalMinor,
        shippingAddressId,
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

  const merchantOrderId = `product-${order.id}`;
  await prisma.paymentAttempt.create({
    data: {
      purpose: "PRODUCT_ORDER",
      merchantOrderId,
      amountMinor: totalMinor,
      userId: session.userId,
      targetId: order.id,
      mainOrderId: order.id,
    },
  });

  let payment;
  try {
    payment = await createWiPayHostedPayment({
      merchantOrderId,
      amountMinor: totalMinor,
      responseUrl: `${BASE_URL}/api/payments/wipay/return`,
      data: { purpose: "PRODUCT_ORDER", targetId: order.id },
    });
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Payment setup failed. Please try again." };
  }

  await prisma.paymentAttempt.update({
    where: { merchantOrderId },
    data: { providerTransactionId: payment.transactionId },
  });

  return { ok: true, checkoutUrl: payment.url, orderId: order.id };
}
