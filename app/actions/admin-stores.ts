"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { Prisma, StoreStatus, StoreSubscriptionStatus, VendorSubscriptionPlan } from "@prisma/client";

import { getSession } from "@/lib/auth/session";
import { chargeSubscriptionFromBalance } from "@/lib/finance/subscription-billing";
import { prisma } from "@/lib/prisma";

export async function getAdminStores(filters: {
  q?: string;
  status?: string;
  sort?: string;
  page?: number;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const page = filters.page ?? 1;
  const take = 20;
  const skip = (page - 1) * take;

  const where: Prisma.StoreWhereInput = {};

  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { slug: { contains: filters.q, mode: "insensitive" } },
      { owner: { fullName: { contains: filters.q, mode: "insensitive" } } },
      { owner: { email: { contains: filters.q, mode: "insensitive" } } },
    ];
  }
  if (filters.status && filters.status !== "all") {
    where.status = filters.status as StoreStatus;
  }

  const orderBy: Prisma.StoreOrderByWithRelationInput =
    filters.sort === "name_asc"
      ? { name: "asc" }
      : filters.sort === "oldest"
        ? { createdAt: "asc" }
        : { createdAt: "desc" };

  const [total, stores] = await Promise.all([
    prisma.store.count({ where }),
    prisma.store.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        subscriptionPlan: true,
        region: true,
        logoUrl: true,
        createdAt: true,
        owner: {
          select: { fullName: true, email: true, idVerificationStatus: true },
        },
        _count: { select: { products: true } },
      },
      orderBy,
      take,
      skip,
    }),
  ]);

  return { stores, total, page, totalPages: Math.ceil(total / take) };
}

export async function updateStoreStatus(storeId: string, status: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  await prisma.store.update({
    where: { id: storeId },
    data: { status: status as StoreStatus },
  });
  revalidatePath("/dashboard/admin/stores");
  return { ok: true };
}

export async function setVendorPlan(storeId: string, plan: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const normalizedPlan: VendorSubscriptionPlan =
    plan === "GROWTH" || plan === "PRO" ? plan : "STARTER";
  const status: StoreSubscriptionStatus =
    normalizedPlan === "STARTER" ? "NONE" : "ACTIVE";

  await prisma.store.update({
    where: { id: storeId },
    data: {
      subscriptionPlan: normalizedPlan,
      subscriptionStatus: status,
    },
  });
  revalidatePath("/dashboard/admin/stores");
  return { ok: true };
}

export async function chargeVendorSubscriptionFromBalance(storeId: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true, subscriptionPlan: true, planRenewsAt: true },
  });
  if (!store) return { ok: false, error: "Store not found" };

  const result = await chargeSubscriptionFromBalance(
    store.id,
    store.subscriptionPlan,
    store.planRenewsAt,
  );

  revalidatePath("/dashboard/admin/stores");

  return result.ok
    ? {
        ok: true,
        charged: "charged" in result ? result.charged : false,
        reason: "reason" in result ? result.reason : undefined,
      }
    : { ok: false, error: result.reason };
}

export async function adminDeleteStore(storeId: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  await prisma.store.delete({ where: { id: storeId } });
  revalidatePath("/dashboard/admin/stores");
  return { ok: true };
}
