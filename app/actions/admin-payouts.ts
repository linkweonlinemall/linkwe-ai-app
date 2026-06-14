"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { escapeCsvCell } from "@/lib/csv/escape-cell";
import { prisma } from "@/lib/prisma";

function formatTtdMinor(minor: number): string {
  return `TTD ${(minor / 100).toFixed(2)}`;
}

function splitRefLabel(referenceNumber: string | null, id: string): string {
  return referenceNumber ?? `SP-${id.slice(-8).toUpperCase()}`;
}

function formatItems(
  items: { titleSnapshot: string; quantity: number }[],
): string {
  return items.map((i) => `${i.quantity}x ${i.titleSnapshot}`).join(" | ");
}

export async function getPendingPayoutSplits() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const rows = await prisma.splitOrder.findMany({
    where: {
      status: "DELIVERED",
      earningsReleased: false,
    },
    select: {
      id: true,
      referenceNumber: true,
      status: true,
      subtotalMinor: true,
      shippingMinor: true,
      deliveredAt: true,
      createdAt: true,
      store: { select: { name: true, shippingMode: true } },
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
        },
      },
    },
    orderBy: [{ deliveredAt: "asc" }, { createdAt: "asc" }],
  });

  return rows;
}

export async function exportPayoutsCSV(splitIds: string[]): Promise<string> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const ids = splitIds.map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) return "Split Ref,Main Ref,Store,Shipping Mode,Customer,Email,Region,Subtotal,Shipping,Delivered Date,Items";

  const splits = await prisma.splitOrder.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      referenceNumber: true,
      subtotalMinor: true,
      shippingMinor: true,
      deliveredAt: true,
      createdAt: true,
      store: { select: { name: true, shippingMode: true } },
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
        },
      },
    },
    orderBy: [{ deliveredAt: "asc" }, { createdAt: "asc" }],
  });

  const header =
    "Split Ref,Main Ref,Store,Shipping Mode,Customer,Email,Region,Subtotal,Shipping,Delivered Date,Items";

  const rows = splits
    .map((s) => {
      const delivered = s.deliveredAt ?? s.createdAt;
      return [
        escapeCsvCell(splitRefLabel(s.referenceNumber, s.id)),
        escapeCsvCell(s.mainOrder.referenceNumber ?? ""),
        escapeCsvCell(s.store.name),
        escapeCsvCell(s.store.shippingMode),
        escapeCsvCell(s.mainOrder.buyer.fullName),
        escapeCsvCell(s.mainOrder.buyer.email),
        escapeCsvCell(s.mainOrder.region),
        escapeCsvCell(formatTtdMinor(s.subtotalMinor)),
        escapeCsvCell(formatTtdMinor(s.shippingMinor)),
        escapeCsvCell(new Date(delivered).toLocaleDateString("en-TT")),
        escapeCsvCell(formatItems(s.items)),
      ].join(",");
    })
    .join("\n");

  return `${header}\n${rows}`;
}
