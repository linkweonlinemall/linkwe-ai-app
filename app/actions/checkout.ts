"use server";

import { revalidatePath } from "next/cache";

import {
  computeCartShipping,
  computeCartShippingFromItems,
  formatCoverageBlockError,
  loadCheckoutCart,
  type CheckoutShippingBreakdown,
} from "@/lib/checkout/compute-cart-shipping";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createSplitOrdersFromMainOrder } from "@/lib/fulfillment/split-orders";
import { stripe } from "@/lib/stripe/stripe";
import { sendEmail } from "@/lib/email/send";
import { newOrderVendorEmail, orderConfirmedCustomerEmail } from "@/lib/email/templates";
import { BASE_URL } from "@/lib/email/resend";
import { VENDOR_DASHBOARD_ORDERS_TAB_HREF } from "@/lib/routes/vendor-dashboard";
import { createNotification } from "@/app/actions/notifications";
import { NotificationType } from "@prisma/client";
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
  | { ok: true; clientSecret: string; orderId: string }
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

  const { subtotalMinor, totalShippingMinor: shippingMinor, zone, pricingLines, storeIds } =
    shipping;
  const totalMinor = subtotalMinor + shippingMinor;
  const primaryStoreId = storeIds[0];

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

  const orderForEmail = await prisma.mainOrder.findUnique({
    where: { id: orderId },
    select: {
      referenceNumber: true,
      totalMinor: true,
      buyer: { select: { email: true, fullName: true } },
      items: {
        select: {
          titleSnapshot: true,
          priceMinor: true,
          quantity: true,
          store: {
            select: {
              ownerId: true,
              owner: { select: { email: true, fullName: true } },
            },
          },
          product: {
            select: {
              store: {
                select: {
                  ownerId: true,
                  owner: { select: { email: true, fullName: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (orderForEmail && orderForEmail.referenceNumber) {
    const itemCount = orderForEmail.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalTTD = orderForEmail.totalMinor / 100;
    const ref = orderForEmail.referenceNumber;

    const customerTemplate = orderConfirmedCustomerEmail({
      customerName: orderForEmail.buyer.fullName ?? "Customer",
      orderRef: ref,
      itemCount,
      totalTTD,
      orderUrl: `${BASE_URL}/orders/${orderId}`,
    });
    await sendEmail({
      to: orderForEmail.buyer.email,
      ...customerTemplate,
    });

    const vendors = new Map<
      string,
      { ownerId: string; email: string; name: string; itemCount: number; subtotalMinor: number }
    >();
    for (const item of orderForEmail.items) {
      const vendor = item.product?.store?.owner ?? item.store.owner;
      const ownerId = item.product?.store?.ownerId ?? item.store.ownerId;
      if (!vendor || !ownerId) continue;

      const existing = vendors.get(ownerId);
      if (existing) {
        existing.itemCount += item.quantity;
        existing.subtotalMinor += item.priceMinor * item.quantity;
      } else {
        vendors.set(ownerId, {
          ownerId,
          email: vendor.email,
          name: vendor.fullName ?? "Vendor",
          itemCount: item.quantity,
          subtotalMinor: item.priceMinor * item.quantity,
        });
      }
    }
    for (const vendor of vendors.values()) {
      const vendorTemplate = newOrderVendorEmail({
        vendorName: vendor.name,
        orderRef: ref,
        itemCount: vendor.itemCount,
        subtotalTTD: vendor.subtotalMinor / 100,
        dashboardUrl: `${BASE_URL}${VENDOR_DASHBOARD_ORDERS_TAB_HREF}`,
      });
      await sendEmail({ to: vendor.email, ...vendorTemplate });
    }

    await createNotification({
      userId: session.userId,
      type: NotificationType.ORDER_PLACED,
      title: "Order placed successfully",
      body: `Order #${orderForEmail.referenceNumber} has been confirmed.`,
      linkUrl: `/orders/${orderId}`,
    });

    for (const vendor of vendors.values()) {
      await createNotification({
        userId: vendor.ownerId,
        type: NotificationType.ORDER_PLACED,
        title: `New order #${orderForEmail.referenceNumber}`,
        body: `${vendor.itemCount} item${vendor.itemCount !== 1 ? "s" : ""} · TTD ${(vendor.subtotalMinor / 100).toFixed(2)}`,
        linkUrl: VENDOR_DASHBOARD_ORDERS_TAB_HREF,
      });
    }
  }

  revalidatePath("/cart");
  revalidatePath("/checkout");
}
