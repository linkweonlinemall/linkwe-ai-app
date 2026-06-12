"use server";

import { revalidatePath } from "next/cache";

import type { CheckoutPricingLine } from "@/lib/checkout/pricing";
import { getCartSubtotal } from "@/lib/checkout/pricing";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getShippingZone } from "@/lib/shipping/trinidad-zoning";
import { loadStoreShippingConfigs } from "@/lib/shipping/load-store-shipping-configs";
import { computePerStoreShipping } from "@/lib/shipping/per-store-shipping";
import { createSplitOrdersFromMainOrder } from "@/lib/fulfillment/split-orders";
import { stripe } from "@/lib/stripe/stripe";
import { sendEmail } from "@/lib/email/send";
import { newOrderVendorEmail, orderConfirmedCustomerEmail } from "@/lib/email/templates";
import { BASE_URL } from "@/lib/email/resend";
import { VENDOR_DASHBOARD_ORDERS_TAB_HREF } from "@/lib/routes/vendor-dashboard";
import { createNotification } from "@/app/actions/notifications";
import { NotificationType } from "@prisma/client";

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

function itemWeightLbs(weight: number | null, weightUnit: string | null): number {
  if (!weight) return 0.5;
  return weightUnit === "KG" ? weight * 2.20462 : weight;
}

function formatCoverageBlockError(
  blockedStores: Array<{ storeId: string; storeName: string }>,
): string {
  const lines = blockedStores.map(
    (s) => `\`${s.storeName}\` doesn't deliver to your area.`,
  );
  return `${lines.join(" ")} Remove their items or choose a different delivery address.`;
}

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
          isDigital: true,
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
    weightLbs: itemWeightLbs(item.product.weight, item.product.weightUnit),
  }));

  const subtotalMinor = getCartSubtotal(pricingLines);

  const storeIds = [...new Set(cartItems.map((i) => i.product.storeId))];
  const configs = await loadStoreShippingConfigs(storeIds);
  const configByStoreId = new Map(configs.map((c) => [c.storeId, c]));

  const itemsByStore = new Map<string, typeof cartItems>();
  for (const item of cartItems) {
    const sid = item.product.storeId;
    if (!itemsByStore.has(sid)) itemsByStore.set(sid, []);
    itemsByStore.get(sid)!.push(item);
  }

  const zone = getShippingZone(deliveryRegion);
  const shippingResult = computePerStoreShipping({
    zone,
    region: deliveryRegion,
    stores: storeIds.map((storeId) => {
      const storeItems = itemsByStore.get(storeId) ?? [];
      const config = configByStoreId.get(storeId);
      const storeName =
        config?.storeName ?? storeItems[0]?.product.store.name ?? "Store";
      const totalWeightLbs = storeItems.reduce((sum, item) => {
        if (item.product.isDigital) return sum;
        const w = itemWeightLbs(item.product.weight, item.product.weightUnit);
        return sum + w * item.quantity;
      }, 0);
      const allItemsDigitalOrPickup =
        !useDelivery || storeItems.every((item) => item.product.isDigital);

      return {
        storeId,
        storeName,
        shippingMode: config?.shippingMode ?? "LINKWE",
        selfRates: config?.selfRates ?? [],
        totalWeightLbs,
        allItemsDigitalOrPickup,
      };
    }),
  });

  if (shippingResult.hasCoverageFailure) {
    return { ok: false, error: formatCoverageBlockError(shippingResult.blockedStores) };
  }

  const shippingMinor = shippingResult.totalShippingMinor;
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
    const itemCount = orderForEmail.items.length;
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

    const vendorEmails = new Map<string, { email: string; name: string }>();
    for (const item of orderForEmail.items) {
      const vendor = item.product?.store?.owner ?? item.store.owner;
      if (vendor && !vendorEmails.has(vendor.email)) {
        vendorEmails.set(vendor.email, { email: vendor.email, name: vendor.fullName ?? "Vendor" });
      }
    }
    for (const vendor of vendorEmails.values()) {
      const vendorTemplate = newOrderVendorEmail({
        vendorName: vendor.name,
        orderRef: ref,
        itemCount,
        totalTTD,
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

    const notifiedOwnerIds = new Set<string>();
    for (const item of orderForEmail.items) {
      const ownerId = item.product?.store?.ownerId ?? item.store.ownerId;
      if (ownerId && !notifiedOwnerIds.has(ownerId)) {
        notifiedOwnerIds.add(ownerId);
        await createNotification({
          userId: ownerId,
          type: NotificationType.ORDER_PLACED,
          title: `New order #${orderForEmail.referenceNumber}`,
          body: `${orderForEmail.items.length} item${orderForEmail.items.length !== 1 ? "s" : ""} · TTD ${(orderForEmail.totalMinor / 100).toFixed(2)}`,
          linkUrl: VENDOR_DASHBOARD_ORDERS_TAB_HREF,
        });
      }
    }
  }

  revalidatePath("/cart");
  revalidatePath("/checkout");
}
