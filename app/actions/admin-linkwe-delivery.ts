"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { escapeCsvCell } from "@/lib/csv/escape-cell";
import { recalculateMainOrderStatus } from "@/lib/fulfillment/order-status";
import {
  computeSplitWeightLbs,
  formatItemsWithWeight,
  formatWeightLbs,
} from "@/lib/orders/split-weight";
import { prisma } from "@/lib/prisma";

function formatTtdMinor(minor: number): string {
  return `TTD ${(minor / 100).toFixed(2)}`;
}

function splitRefLabel(referenceNumber: string | null, id: string): string {
  return referenceNumber ?? `SP-${id.slice(-8).toUpperCase()}`;
}

const MAIN_ORDER_ITEMS_WEIGHT_SELECT = {
  titleSnapshot: true,
  weightLbs: true,
  quantity: true,
} as const;

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
    select: { id: true, mainOrderId: true, status: true },
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
  revalidatePath("/dashboard/admin");
  revalidatePath(`/orders/${splitOrder.mainOrderId}`, "page");

  return { ok: true };
}

export async function exportLinkWeManifestCSV(splitIds: string[]): Promise<string> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const ids = splitIds.map((id) => id.trim()).filter(Boolean);

  const comment =
    "# LinkWe delivery manifest — Region only. Street address is not yet captured at checkout; deliver-to location is the customer region below.";

  const header =
    "Split Ref,Main Ref,Store (pickup from),Customer (deliver to),Email,Region,Items,Total Weight (lbs),LinkWe Fee";

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
          items: { select: MAIN_ORDER_ITEMS_WEIGHT_SELECT },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const rows = splits
    .map((s) => {
      const weight = computeSplitWeightLbs(s.items, s.mainOrder.items);
      return [
        escapeCsvCell(splitRefLabel(s.referenceNumber, s.id)),
        escapeCsvCell(s.mainOrder.referenceNumber ?? ""),
        escapeCsvCell(s.store.name),
        escapeCsvCell(s.mainOrder.buyer.fullName),
        escapeCsvCell(s.mainOrder.buyer.email),
        escapeCsvCell(s.mainOrder.region),
        escapeCsvCell(formatItemsWithWeight(weight.lines)),
        escapeCsvCell(formatWeightLbs(weight.totalLbs)),
        escapeCsvCell(formatTtdMinor(s.shippingMinor)),
      ].join(",");
    })
    .join("\n");

  return `${comment}\n${header}\n${rows}`;
}
