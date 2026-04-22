"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function getAdminCustomers() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  return prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: {
      id: true,
      fullName: true,
      email: true,
      region: true,
      createdAt: true,
      mainOrders: {
        where: { status: { not: "PENDING_PAYMENT" } },
        select: {
          id: true,
          totalMinor: true,
          status: true,
          createdAt: true,
          referenceNumber: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
