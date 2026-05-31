"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

const ADMIN_USERS_PATH = "/dashboard/admin/users";

async function assertAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") throw new Error("Unauthorized");
  return session;
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function getAdminUsers({
  search = "",
  role = "all",
  page = 1,
}: {
  search?: string;
  role?: string;
  page?: number;
}) {
  await assertAdmin();

  const PAGE_SIZE = 20;
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(search.trim()
      ? {
          OR: [
            { fullName: { contains: search.trim(), mode: "insensitive" as const } },
            { email: { contains: search.trim(), mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(role && role !== "all" ? { role: role.toUpperCase() as UserRole } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: {
        storesOwned: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            _count: { select: { products: true, splitOrders: true } },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export async function getAdminUserDetail(userId: string) {
  await assertAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      storesOwned: {
        include: {
          _count: { select: { products: true, splitOrders: true } },
        },
      },
      _count: { select: { mainOrders: true } },
    },
  });

  if (!user) return null;

  let vendorStats = null;
  let customerStats = null;
  let courierStats = null;

  if (user.role === "VENDOR" && user.storesOwned[0]) {
    const store = user.storesOwned[0];

    const [earnings, pendingOrders, bookings, requests, reviews] = await Promise.all([
      prisma.splitOrder.aggregate({
        where: { storeId: store.id, status: "COMPLETED" },
        _sum: { vendorNetMinor: true },
        _count: true,
      }),
      prisma.splitOrder.count({
        where: { storeId: store.id, status: "AWAITING_VENDOR_ACTION" },
      }),
      prisma.productBooking.aggregate({
        where: { product: { storeId: store.id } },
        _count: true,
        _sum: { earningsAmount: true },
      }),
      prisma.onDemandRequest.count({ where: { storeId: store.id } }),
      prisma.review.aggregate({
        where: { storeId: store.id },
        _count: true,
        _avg: { rating: true },
      }),
    ]);

    vendorStats = {
      totalEarningsMinor: earnings._sum.vendorNetMinor ?? 0,
      completedOrders: earnings._count,
      pendingOrders,
      totalBookings: bookings._count,
      bookingEarnings: bookings._sum.earningsAmount ?? 0,
      onDemandRequests: requests,
      reviewCount: reviews._count,
      avgRating: reviews._avg.rating ?? 0,
    };
  }

  if (user.role === "CUSTOMER") {
    const [spending, bookings, requests, reviews] = await Promise.all([
      prisma.mainOrder.aggregate({
        where: { buyerId: userId },
        _sum: { totalMinor: true },
        _count: true,
      }),
      prisma.productBooking.count({ where: { customerId: userId } }),
      prisma.onDemandRequest.count({ where: { customerId: userId } }),
      prisma.review.count({ where: { userId } }),
    ]);

    customerStats = {
      totalOrders: spending._count,
      totalSpentMinor: spending._sum.totalMinor ?? 0,
      totalBookings: bookings,
      onDemandRequests: requests,
      reviewsWritten: reviews,
    };
  }

  return { user, vendorStats, customerStats, courierStats };
}

// ─── Single mutations ─────────────────────────────────────────────────────────

export async function suspendUser(userId: string): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return { ok: false, error: "User not found." };
  if (user.role === "ADMIN") return { ok: false, error: "Cannot suspend an admin." };

  await prisma.user.update({ where: { id: userId }, data: { suspended: true } });
  revalidatePath(ADMIN_USERS_PATH);
  return { ok: true };
}

export async function unsuspendUser(userId: string): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();
  await prisma.user.update({ where: { id: userId }, data: { suspended: false } });
  revalidatePath(ADMIN_USERS_PATH);
  return { ok: true };
}

export async function deleteUser(userId: string): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, _count: { select: { mainOrders: true } } },
  });
  if (!user) return { ok: false, error: "User not found." };
  if (user.role === "ADMIN") return { ok: false, error: "Cannot delete an admin account." };
  if (user._count.mainOrders > 0) {
    return {
      ok: false,
      error: `This user has ${user._count.mainOrders} order(s). Resolve or archive their orders before deleting.`,
    };
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath(ADMIN_USERS_PATH);
  return { ok: true };
}

// ─── Bulk mutations ───────────────────────────────────────────────────────────

export async function bulkSuspendUsers(userIds: string[]): Promise<{ ok: boolean; count: number }> {
  await assertAdmin();

  const valid = await prisma.user.findMany({
    where: { id: { in: userIds }, role: { not: "ADMIN" } },
    select: { id: true },
  });
  const validIds = valid.map((u) => u.id);

  await prisma.user.updateMany({ where: { id: { in: validIds } }, data: { suspended: true } });
  revalidatePath(ADMIN_USERS_PATH);
  return { ok: true, count: validIds.length };
}

export async function bulkDeleteUsers(userIds: string[]): Promise<{
  deleted: string[];
  skipped: { id: string; name: string; reason: string }[];
}> {
  await assertAdmin();

  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, role: { not: "ADMIN" } },
    select: { id: true, fullName: true, _count: { select: { mainOrders: true } } },
  });

  const toDelete: string[] = [];
  const skipped: { id: string; name: string; reason: string }[] = [];

  for (const u of users) {
    if (u._count.mainOrders > 0) {
      skipped.push({ id: u.id, name: u.fullName, reason: `${u._count.mainOrders} order(s)` });
    } else {
      toDelete.push(u.id);
    }
  }

  if (toDelete.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: toDelete } } });
  }

  revalidatePath(ADMIN_USERS_PATH);
  return { deleted: toDelete, skipped };
}
