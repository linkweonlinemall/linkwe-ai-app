"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function getAdminTicketOrders(filters?: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const limit = Math.min(100, Math.max(1, Math.floor(filters?.limit || 50)));
  const offset = Math.max(0, Math.floor(filters?.offset || 0));
  const search = filters?.search?.trim().slice(0, 100);

  return prisma.ticketOrder.findMany({
    where: {
      status: "PAID",
      ...(search
        ? {
            OR: [
              { reference: { contains: search, mode: "insensitive" } },
              { user: { fullName: { contains: search, mode: "insensitive" } } },
              { user: { email: { contains: search, mode: "insensitive" } } },
              { event: { title: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      reference: true,
      total: true,
      earningsReleased: true,
      createdAt: true,
      user: {
        select: { fullName: true, email: true },
      },
      event: {
        select: {
          title: true,
          startDate: true,
          refundPolicyType: true,
          refundCutoffHours: true,
        },
      },
      tickets: {
        select: {
          id: true,
          ticketNumber: true,
          holderName: true,
          holderEmail: true,
          status: true,
          pricePaidMinor: true,
          refundedAt: true,
          refundAmountMinor: true,
          ticketType: { select: { name: true, price: true } },
        },
        orderBy: { ticketNumber: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}
