"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { Prisma, StoreStatus } from "@prisma/client";

import { getSession } from "@/lib/auth/session";
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

export async function adminDeleteStore(storeId: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  await prisma.store.delete({ where: { id: storeId } });
  revalidatePath("/dashboard/admin/stores");
  return { ok: true };
}
