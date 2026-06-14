"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

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
