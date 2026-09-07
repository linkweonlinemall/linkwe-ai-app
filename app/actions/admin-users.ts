"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";

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
    isActive: true,
    ...(search.trim()
      ? {
          OR: [
            { fullName: { contains: search.trim(), mode: "insensitive" as const } },
            { email: { contains: search.trim(), mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(role && role !== "all" ? { role: { in: role.toUpperCase() === "CUSTOMER" ? ["CUSTOMER", "COURIER"] as UserRole[] : [role.toUpperCase() as UserRole] } } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, fullName: true, email: true, role: true, createdAt: true, suspended: true,
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
    users: users.map(u => ({ ...u, role: u.role === "COURIER" ? "CUSTOMER" as const : u.role })),
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export async function getAdminUserDetail(userId: string) {
  await assertAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, fullName: true, email: true, phone: true, role: true, region: true, vehicleType: true,
      createdAt: true, updatedAt: true, suspended: true, idVerificationStatus: true, idDocumentUrl: true,
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
  const courierStats = null;

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

  return { user: { ...user, role: user.role === "COURIER" ? "CUSTOMER" as const : user.role }, vendorStats, customerStats, courierStats };
}

export async function createAdminUser(input: { fullName: string; email: string; phone?: string; password: string; role: string }) {
  const actor = await assertAdmin();
  const fullName = input.fullName?.trim();
  const email = input.email?.trim().toLowerCase();
  if (!fullName || fullName.length > 150 || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { error: "Enter a name and valid email address." };
  if (!["CUSTOMER", "VENDOR", "ADMIN"].includes(input.role)) return { error: "Choose Customer, Vendor or Admin." };
  if (typeof input.password !== "string" || input.password.length < 12 || Buffer.byteLength(input.password, "utf8") > 72) return { error: "Use a password of at least 12 characters and no more than 72 bytes." };
  const phone = input.phone?.trim() || null;
  if (phone && !/^[+\d\s()-]{7,30}$/.test(phone)) return { error: "Enter a valid phone number." };
  try {
    const passwordHash = await hashPassword(input.password);
    const user = await prisma.$transaction(async tx => {
      const created = await tx.user.create({ data: { fullName, email, phone, passwordHash, role: input.role as UserRole }, select: { id: true } });
      await tx.notification.create({ data: { userId: actor.userId, type: "GENERAL", title: "Account created", body: `${actor.fullName} created ${fullName} (${input.role}).`, linkUrl: `/dashboard/admin/records/user/${created.id}` } });
      return created;
    });
    revalidatePath(ADMIN_USERS_PATH);
    return { id: user.id };
  } catch { return { error: "Could not create this account. Check whether the email or phone is already registered." }; }
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
    select: {
      role: true,
      isActive: true,
      _count: { select: { mainOrders: true } },
      storesOwned: {
        select: {
          subscriptionStatus: true,
          _count: { select: { splitOrders: true } },
        },
      },
    },
  });
  if (!user) return { ok: false, error: "User not found." };
  if (!user.isActive) return { ok: false, error: "This user has already been deleted." };
  if (user.role === "ADMIN") return { ok: false, error: "Cannot delete an admin account." };
  if (user._count.mainOrders > 0) {
    return {
      ok: false,
      error: `This user has ${user._count.mainOrders} order(s). Resolve or archive their orders before deleting.`,
    };
  }

  const vendorOrders = user.storesOwned.reduce((count, store) => count + store._count.splitOrders, 0);
  if (vendorOrders > 0) {
    return {
      ok: false,
      error: `This vendor has ${vendorOrders} store order(s). Preserve the account for order records or suspend it instead.`,
    };
  }
  if (user.storesOwned.some((store) => store.subscriptionStatus === "ACTIVE" || store.subscriptionStatus === "PAST_DUE")) {
    return { ok: false, error: "Cancel the vendor’s active billing plan before deleting this account." };
  }

  try {
    await prisma.$transaction([
      prisma.store.updateMany({
        where: { ownerId: userId },
        data: { status: "DRAFT" },
      }),
      prisma.user.update({
        where: { id: userId },
        data: deletedUserData(userId),
      }),
    ]);
  } catch (error) {
    console.error("deleteUser", error);
    return { ok: false, error: "Could not delete this user. Please try again." };
  }
  revalidatePath(ADMIN_USERS_PATH);
  return { ok: true };
}

function deletedUserData(userId: string) {
  return {
    email: `deleted-${userId}@deleted.invalid`,
    phone: null,
    passwordHash: null,
    resetToken: null,
    resetTokenExpiry: null,
    emailVerifyToken: null,
    emailVerifyTokenExpiry: null,
    fullName: "Deleted user",
    region: null,
    idDocumentUrl: null,
    selfieWithIdUrl: null,
    vehicleType: null,
    courierBio: null,
    bankName: null,
    accountName: null,
    accountNumber: null,
    isActive: false,
    suspended: true,
  } as const;
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
    where: { id: { in: userIds }, role: { not: "ADMIN" }, isActive: true },
    select: {
      id: true,
      fullName: true,
      _count: { select: { mainOrders: true } },
      storesOwned: {
        select: {
          subscriptionStatus: true,
          _count: { select: { splitOrders: true } },
        },
      },
    },
  });

  const toDelete: string[] = [];
  const skipped: { id: string; name: string; reason: string }[] = [];

  for (const u of users) {
    if (u._count.mainOrders > 0) {
      skipped.push({ id: u.id, name: u.fullName, reason: `${u._count.mainOrders} order(s)` });
    } else if (u.storesOwned.some((store) => store._count.splitOrders > 0)) {
      skipped.push({ id: u.id, name: u.fullName, reason: "store order history" });
    } else if (u.storesOwned.some((store) => store.subscriptionStatus === "ACTIVE" || store.subscriptionStatus === "PAST_DUE")) {
      skipped.push({ id: u.id, name: u.fullName, reason: "active billing plan" });
    } else {
      toDelete.push(u.id);
    }
  }

  if (toDelete.length > 0) {
    try {
      await prisma.$transaction([
        prisma.store.updateMany({
          where: { ownerId: { in: toDelete } },
          data: { status: "DRAFT" },
        }),
        ...toDelete.map((id) => prisma.user.update({ where: { id }, data: deletedUserData(id) })),
      ]);
    } catch (error) {
      console.error("bulkDeleteUsers", error);
      return {
        deleted: [],
        skipped: users.map((user) => ({
          id: user.id,
          name: user.fullName,
          reason: "delete failed; please retry",
        })),
      };
    }
  }

  revalidatePath(ADMIN_USERS_PATH);
  return { deleted: toDelete, skipped };
}
