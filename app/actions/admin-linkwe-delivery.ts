"use server";

import { NotificationType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createNotification } from "@/app/actions/notifications";
import { getSession } from "@/lib/auth/session";
import { escapeCsvCell } from "@/lib/csv/escape-cell";
import { BASE_URL } from "@/lib/email/resend";
import { sendEmail } from "@/lib/email/send";
import { orderOutForDeliveryCustomerEmail } from "@/lib/email/templates";
import { recalculateMainOrderStatus } from "@/lib/fulfillment/order-status";
import {
  formatTtdMinor,
  MAIN_ORDER_ITEMS_WEIGHT_SELECT,
  splitRefLabel,
} from "@/lib/orders/manifest-shared";
import {
  computeSplitWeightLbs,
  formatItemsWithWeight,
  formatWeightLbs,
} from "@/lib/orders/split-weight";
import { prisma } from "@/lib/prisma";

const STATUS_SORT_ORDER: Record<string, number> = {
  READY_FOR_LINKWE: 0,
  OUT_FOR_DELIVERY: 1,
};

export async function getLinkWeDeliveryQueue() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const rows = await prisma.splitOrder.findMany({
    where: {
      status: { in: ["READY_FOR_LINKWE", "OUT_FOR_DELIVERY"] },
    },
    select: {
      id: true,
      referenceNumber: true,
      status: true,
      subtotalMinor: true,
      shippingMinor: true,
      createdAt: true,
      vendorActionAt: true,
      store: { select: { name: true } },
      items: {
        select: {
          titleSnapshot: true,
          quantity: true,
          unitPriceMinor: true,
        },
      },
      mainOrder: {
        select: {
          referenceNumber: true,
          region: true,
          buyer: { select: { fullName: true, email: true } },
          shippingAddress: {
            select: { line1: true, phone: true, latitude: true, longitude: true },
          },
          items: { select: MAIN_ORDER_ITEMS_WEIGHT_SELECT },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return rows.sort((a, b) => {
    const statusDiff =
      (STATUS_SORT_ORDER[a.status] ?? 99) - (STATUS_SORT_ORDER[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export async function markOutForLinkWeDelivery(
  splitOrderId: string,
): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const id = splitOrderId.trim();
  if (!id) return { error: "Order is required" };

  const splitOrder = await prisma.splitOrder.findUnique({
    where: { id },
    select: {
      id: true,
      mainOrderId: true,
      status: true,
      store: { select: { name: true } },
      mainOrder: {
        select: {
          buyerId: true,
          referenceNumber: true,
          buyer: { select: { email: true, fullName: true } },
        },
      },
    },
  });

  if (!splitOrder) return { error: "Order not found" };
  if (splitOrder.status === "OUT_FOR_DELIVERY") return { ok: true };
  if (splitOrder.status !== "READY_FOR_LINKWE") {
    return { error: "Order is not ready for LinkWe delivery" };
  }

  await prisma.splitOrder.update({
    where: { id },
    data: { status: "OUT_FOR_DELIVERY" },
  });

  await recalculateMainOrderStatus(splitOrder.mainOrderId);

  await createNotification({
    userId: splitOrder.mainOrder.buyerId,
    type: NotificationType.ORDER_STATUS_UPDATED,
    title: "Your order is out for delivery",
    body: `Your items from ${splitOrder.store.name} are on the way with LinkWe delivery.`,
    linkUrl: `/orders/${splitOrder.mainOrderId}`,
  });

  const deliveryTemplate = orderOutForDeliveryCustomerEmail({
    customerName: splitOrder.mainOrder.buyer.fullName ?? "Customer",
    orderRef: splitOrder.mainOrder.referenceNumber ?? splitOrder.mainOrderId,
    storeName: splitOrder.store.name,
    orderUrl: `${BASE_URL}/orders/${splitOrder.mainOrderId}`,
  });
  await sendEmail({
    to: splitOrder.mainOrder.buyer.email,
    ...deliveryTemplate,
  });

  revalidatePath("/dashboard/admin");
  revalidatePath(`/orders/${splitOrder.mainOrderId}`, "page");

  return { ok: true };
}

export async function exportLinkWeManifestCSV(splitIds: string[]): Promise<string> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const ids = splitIds.map((id) => id.trim()).filter(Boolean);

  const comment =
    "# LinkWe delivery manifest — Deliver to the street address below (phone for contact, map coords for exact location). Region is a fallback when no address was captured.";

  const header = [
    "Split Ref",
    "Main Ref",
    "Store (pickup from)",
    "Customer (deliver to)",
    "Email",
    "Phone",
    "Address",
    "Map (lat,lng)",
    "Region",
    "Items",
    "Total Weight (lbs)",
    "LinkWe Fee",
  ].map(escapeCsvCell).join(",");

  if (ids.length === 0) {
    return `${comment}\n${header}`;
  }

  const splits = await prisma.splitOrder.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      referenceNumber: true,
      shippingMinor: true,
      createdAt: true,
      store: { select: { name: true } },
      items: {
        select: {
          titleSnapshot: true,
          quantity: true,
        },
      },
      mainOrder: {
        select: {
          referenceNumber: true,
          region: true,
          buyer: { select: { fullName: true, email: true } },
          shippingAddress: {
            select: { line1: true, phone: true, latitude: true, longitude: true },
          },
          items: { select: MAIN_ORDER_ITEMS_WEIGHT_SELECT },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const rows = splits
    .map((s) => {
      const weight = computeSplitWeightLbs(s.items, s.mainOrder.items);
      const addr = s.mainOrder.shippingAddress;
      const mapCoords =
        addr?.latitude != null && addr?.longitude != null
          ? `${String(addr.latitude)},${String(addr.longitude)}`
          : "";
      return [
        escapeCsvCell(splitRefLabel(s.referenceNumber, s.id)),
        escapeCsvCell(s.mainOrder.referenceNumber ?? ""),
        escapeCsvCell(s.store.name),
        escapeCsvCell(s.mainOrder.buyer.fullName),
        escapeCsvCell(s.mainOrder.buyer.email),
        escapeCsvCell(addr?.phone ?? ""),
        escapeCsvCell(addr?.line1 ?? ""),
        escapeCsvCell(mapCoords),
        escapeCsvCell(s.mainOrder.region),
        escapeCsvCell(formatItemsWithWeight(weight.lines)),
        escapeCsvCell(formatWeightLbs(weight.totalLbs)),
        escapeCsvCell(formatTtdMinor(s.shippingMinor)),
      ].join(",");
    })
    .join("\n");

  return `${comment}\n${header}\n${rows}`;
}
