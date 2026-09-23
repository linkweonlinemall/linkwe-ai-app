import type { Prisma } from "@prisma/client";

/** Publication and archive are separate states; archived items are never labelled as drafts. */
export type AdminProductStatus = "active" | "draft" | "archived";

export type AdminProductFilters = {
  search?: string;
  storeId?: string | null;
  status?: "all" | AdminProductStatus;
  sort?:
    | "createdAt_desc"
    | "createdAt_asc"
    | "price_desc"
    | "price_asc"
    | "name_asc"
    | "name_desc";
};

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: number;
  stock: number | null;
  thumbnailUrl: string | null;
  storeId: string;
  storeName: string;
  status: AdminProductStatus;
  createdAt: string;
};

export function rowStatus(p: { isPublished: boolean; isArchived?: boolean }): AdminProductStatus {
  return p.isArchived ? "archived" : p.isPublished ? "active" : "draft";
}

export function statusWhere(
  status: AdminProductFilters["status"]
): Prisma.ProductWhereInput {
  if (status === "active") {
    return { isPublished: true, isArchived:false };
  }
  if (status === "draft") {
    return { isPublished: false, isArchived:false };
  }
  if (status === "archived") return { isArchived:true };
  return {};
}

export function orderByFromSort(
  sort: AdminProductFilters["sort"]
): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "createdAt_asc":
      return [{ createdAt: "asc" }];
    case "price_desc":
      return [{ price: "desc" }];
    case "price_asc":
      return [{ price: "asc" }];
    case "name_asc":
      return [{ name: "asc" }];
    case "name_desc":
      return [{ name: "desc" }];
    case "createdAt_desc":
    default:
      return [{ createdAt: "desc" }];
  }
}

export function dataForStatus(status: AdminProductStatus) {
  switch (status) {
    case "active":
      return { isPublished: true, isArchived:false };
    case "draft":
      return { isPublished: false, isArchived:false };
    case "archived":
      return {isPublished:false,isArchived:true};
  }
}
