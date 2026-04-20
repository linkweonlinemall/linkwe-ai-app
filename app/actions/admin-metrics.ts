"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function getAdminOverviewMetrics() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const [
    ordersToday,
    revenueTodayResult,
    activeCouriers,
    pendingVendorPayouts,
    pendingCourierPayouts,
    awaitingVendor,
    inTransit,
    atWarehouse,
    readyToShip,
    vendorDelays,
    courierStale,
    payoutPending,
    recentOrders,
    lifetimeRevenueResult,
    totalOrders,
    activeVendors,
    totalCustomers,
  ] = await Promise.all([
    prisma.mainOrder.count({
      where: { createdAt: { gte: startOfToday }, status: { not: "PENDING_PAYMENT" } },
    }),
    prisma.mainOrder.aggregate({
      _sum: { totalMinor: true },
      where: { createdAt: { gte: startOfToday }, status: { not: "PENDING_PAYMENT" } },
    }),
    prisma.courierLocation.count({ where: { isActive: true } }),
    prisma.payoutRequest.count({ where: { status: "PENDING" } }),
    prisma.courierPayoutRequest.count({ where: { status: "PENDING" } }),
    prisma.splitOrder.count({ where: { status: "AWAITING_VENDOR_ACTION" } }),
    prisma.splitOrder.count({ where: { status: "COURIER_PICKED_UP" } }),
    prisma.splitOrder.count({ where: { status: "AT_WAREHOUSE" } }),
    prisma.mainOrder.count({ where: { status: "READY_TO_SHIP" } }),
    prisma.splitOrder.count({
      where: {
        status: "AWAITING_VENDOR_ACTION",
        createdAt: { lte: twentyFourHoursAgo },
      },
    }),
    prisma.courierLocation.count({
      where: { isActive: true, updatedAt: { lte: fiveMinutesAgo } },
    }),
    prisma.payoutRequest.count({
      where: { status: "PENDING", requestedAt: { lte: fortyEightHoursAgo } },
    }),
    prisma.mainOrder.findMany({
      where: { status: { not: "PENDING_PAYMENT" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        referenceNumber: true,
        totalMinor: true,
        status: true,
        createdAt: true,
        buyer: { select: { fullName: true } },
      },
    }),
    prisma.mainOrder.aggregate({
      _sum: { totalMinor: true },
      where: { status: { not: "PENDING_PAYMENT" } },
    }),
    prisma.mainOrder.count({ where: { status: { not: "PENDING_PAYMENT" } } }),
    prisma.store.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
  ]);

  return {
    ordersToday,
    revenueTodayMinor: revenueTodayResult._sum.totalMinor ?? 0,
    activeCouriers,
    pendingPayouts: pendingVendorPayouts + pendingCourierPayouts,
    pipeline: { awaitingVendor, inTransit, atWarehouse, readyToShip },
    alerts: { vendorDelays, courierStale, payoutPending },
    recentOrders,
    totals: {
      lifetimeRevenueMinor: lifetimeRevenueResult._sum.totalMinor ?? 0,
      totalOrders,
      activeVendors,
      totalCustomers,
    },
  };
}
