import { NotificationType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { createNotification } from "@/app/actions/notifications";
import { BASE_URL } from "@/lib/email/resend";
import { sendEmail } from "@/lib/email/send";
import { newOrderVendorEmail, orderConfirmedCustomerEmail } from "@/lib/email/templates";
import { createSplitOrdersFromMainOrder } from "@/lib/fulfillment/split-orders";
import { prisma } from "@/lib/prisma";
import { VENDOR_DASHBOARD_ORDERS_TAB_HREF } from "@/lib/routes/vendor-dashboard";

export async function fulfillProductOrder(orderId: string, buyerId: string): Promise<void> {
  const claimed = await prisma.mainOrder.updateMany({
    where: { id: orderId, buyerId, status: "PENDING_PAYMENT" },
    data: { status: "PAID" },
  });
  await createSplitOrdersFromMainOrder(orderId);
  await prisma.productCartItem.deleteMany({ where: { userId: buyerId } });
  if (claimed.count === 0) return;

  const order = await prisma.mainOrder.findUnique({
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
          store: { select: { ownerId: true, owner: { select: { email: true, fullName: true } } } },
          product: { select: { store: { select: { ownerId: true, owner: { select: { email: true, fullName: true } } } } } },
        },
      },
    },
  });
  if (!order?.referenceNumber) return;

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const customerTemplate = orderConfirmedCustomerEmail({
    customerName: order.buyer.fullName ?? "Customer",
    orderRef: order.referenceNumber,
    itemCount,
    totalTTD: order.totalMinor / 100,
    orderUrl: `${BASE_URL}/orders/${orderId}`,
  });
  await sendEmail({ to: order.buyer.email, ...customerTemplate });

  const vendors = new Map<string, { ownerId: string; email: string; name: string; itemCount: number; subtotalMinor: number }>();
  for (const item of order.items) {
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
    const template = newOrderVendorEmail({
      vendorName: vendor.name,
      orderRef: order.referenceNumber,
      itemCount: vendor.itemCount,
      subtotalTTD: vendor.subtotalMinor / 100,
      dashboardUrl: `${BASE_URL}${VENDOR_DASHBOARD_ORDERS_TAB_HREF}`,
    });
    await sendEmail({ to: vendor.email, ...template });
  }

  await createNotification({
    userId: buyerId,
    type: NotificationType.ORDER_PLACED,
    title: "Order placed successfully",
    body: `Order #${order.referenceNumber} has been confirmed.`,
    linkUrl: `/orders/${orderId}`,
  });
  for (const vendor of vendors.values()) {
    await createNotification({
      userId: vendor.ownerId,
      type: NotificationType.ORDER_PLACED,
      title: `New order #${order.referenceNumber}`,
      body: `${vendor.itemCount} item${vendor.itemCount !== 1 ? "s" : ""} · TTD ${(vendor.subtotalMinor / 100).toFixed(2)}`,
      linkUrl: VENDOR_DASHBOARD_ORDERS_TAB_HREF,
    });
  }
  for (const path of ["/cart", "/checkout"]) {
    try { revalidatePath(path); } catch { /* Route-handler cache context is optional. */ }
  }
}
