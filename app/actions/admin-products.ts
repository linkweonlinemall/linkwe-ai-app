"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  dataForStatus,
  orderByFromSort,
  rowStatus,
  statusWhere,
  type AdminProductFilters,
  type AdminProductRow,
  type AdminProductStatus,
} from "@/app/actions/admin-products-helpers";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

export type {
  AdminProductFilters,
  AdminProductRow,
  AdminProductStatus,
} from "@/app/actions/admin-products-helpers";

function assertAdmin() {
  return getSession().then((s) => {
    if (!s || s.role !== "ADMIN") redirect("/");
    return s;
  });
}

export async function getAdminStoreOptions() {
  await assertAdmin();
  return prisma.store.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getAdminProducts(
  filters: AdminProductFilters,
  page: number
): Promise<{
  items: AdminProductRow[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
}> {
  await assertAdmin();

  const search = filters.search?.trim() || "";
  const storeId = filters.storeId?.trim() || null;
  const status = filters.status ?? "all";
  const sort = filters.sort ?? "createdAt_desc";

  const andClauses: Prisma.ProductWhereInput[] = [];
  if (search) {
    andClauses.push({
      name: { contains: search, mode: "insensitive" },
    });
  }
  if (storeId) {
    andClauses.push({ storeId });
  }
  const stWhere = statusWhere(status);
  if (Object.keys(stWhere).length > 0) {
    andClauses.push(stWhere);
  }

  const where: Prisma.ProductWhereInput =
    andClauses.length > 0 ? { AND: andClauses } : {};

  const safePage = Math.max(1, Math.floor(page));
  const skip = (safePage - 1) * PAGE_SIZE;

  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        price: true,
        stock: true,
        images: true,
        isPublished: true,
        createdAt: true,
        store: { select: { id: true, name: true } },
      },
      orderBy: orderByFromSort(sort),
      skip,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const items: AdminProductRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    sku: r.sku,
    price: r.price,
    stock: r.stock,
    thumbnailUrl: r.images[0] ?? null,
    storeId: r.store.id,
    storeName: r.store.name,
    status: rowStatus({ isPublished: r.isPublished }),
    createdAt: r.createdAt.toISOString(),
  }));

  return {
    items,
    total,
    page: safePage,
    totalPages,
    pageSize: PAGE_SIZE,
  };
}

export async function updateProductStatus(
  productId: string,
  status: AdminProductStatus
) {
  await assertAdmin();
  await prisma.product.update({
    where: { id: productId },
    data: dataForStatus(status),
  });
  revalidatePath("/dashboard/admin/products");
}

export async function bulkUpdateProductStatus(
  productIds: string[],
  status: AdminProductStatus
) {
  await assertAdmin();
  if (productIds.length === 0) return { ok: true as const };
  await prisma.product.updateMany({
    where: { id: { in: productIds } },
    data: dataForStatus(status),
  });
  revalidatePath("/dashboard/admin/products");
  return { ok: true as const };
}

export async function deleteProduct(productId: string) {
  await assertAdmin();

  const orderCount = await prisma.orderItem.count({
    where: { productId },
  });
  if (orderCount > 0) {
    return {
      ok: false as const,
      error:
        "This product has been purchased and cannot be deleted. Unpublish it instead.",
    };
  }

  try {
    await prisma.product.delete({ where: { id: productId } });
  } catch {
    return {
      ok: false as const,
      error: "Could not delete this product. It may still be referenced.",
    };
  }

  revalidatePath("/dashboard/admin/products");
  return { ok: true as const };
}

export async function bulkDeleteProducts(productIds: string[]) {
  await assertAdmin();
  if (productIds.length === 0) return { ok: true as const, deleted: 0 };

  const blocked = await prisma.orderItem.findMany({
    where: { productId: { in: productIds } },
    select: { productId: true },
    distinct: ["productId"],
  });
  const blockedIds = new Set(blocked.map((b) => b.productId).filter(Boolean));
  const deletable = productIds.filter((id) => !blockedIds.has(id));

  if (deletable.length === 0) {
    return {
      ok: false as const,
      error: "Selected products have order history and cannot be deleted.",
      deleted: 0,
    };
  }

  await prisma.product.deleteMany({
    where: { id: { in: deletable } },
  });

  revalidatePath("/dashboard/admin/products");
  return {
    ok: true as const,
    deleted: deletable.length,
    skipped: productIds.length - deletable.length,
  };
}
