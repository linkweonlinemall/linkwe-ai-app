"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ListingStatus, ListingType, Prisma } from "@prisma/client";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export type AdminListingFilters = {
  q?: string;
  status?: string;
  type?: string;
  storeId?: string;
  sort?: string;
  page?: number;
};

export async function getAdminListings(filters: AdminListingFilters) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const page = filters.page ?? 1;
  const take = 20;
  const skip = (page - 1) * take;

  const where: Prisma.ListingWhereInput = {};

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { slug: { contains: filters.q, mode: "insensitive" } },
      { store: { name: { contains: filters.q, mode: "insensitive" } } },
    ];
  }
  if (filters.status && filters.status !== "all") {
    where.status = filters.status as ListingStatus;
  }
  if (filters.type && filters.type !== "all") {
    where.type = filters.type as ListingType;
  }
  if (filters.storeId && filters.storeId !== "all") {
    where.storeId = filters.storeId;
  }

  const orderBy: Prisma.ListingOrderByWithRelationInput =
    filters.sort === "price_asc"
      ? { priceMinor: "asc" }
      : filters.sort === "price_desc"
        ? { priceMinor: "desc" }
        : filters.sort === "title_asc"
          ? { title: "asc" }
          : filters.sort === "createdAt_asc"
            ? { createdAt: "asc" }
            : { createdAt: "desc" };

  const [total, listings] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        status: true,
        priceMinor: true,
        currency: true,
        imageUrl: true,
        createdAt: true,
        publishedAt: true,
        store: { select: { name: true, slug: true } },
        owner: { select: { fullName: true } },
      },
      orderBy,
      take,
      skip,
    }),
  ]);

  return { listings, total, page, totalPages: Math.ceil(total / take) };
}

export async function updateListingStatus(listingId: string, status: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  await prisma.listing.update({
    where: { id: listingId },
    data: { status: status as ListingStatus },
  });
  revalidatePath("/dashboard/admin/listings");
  return { ok: true as const };
}

export async function deleteListing(listingId: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  await prisma.listing.delete({ where: { id: listingId } });
  revalidatePath("/dashboard/admin/listings");
  return { ok: true as const };
}

export async function bulkUpdateListingStatus(listingIds: string[], status: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  await prisma.listing.updateMany({
    where: { id: { in: listingIds } },
    data: { status: status as ListingStatus },
  });
  revalidatePath("/dashboard/admin/listings");
  return { ok: true as const };
}
