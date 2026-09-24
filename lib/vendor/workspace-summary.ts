import { prisma } from "@/lib/prisma";
import { getVendorNavCounts } from "./get-vendor-nav-counts";

export async function getVendorWorkspaceSummary(storeId: string) {
  const [nav, catalogue, events, pendingBookings] = await Promise.all([
    getVendorNavCounts(storeId),
    prisma.product.groupBy({
      by: ["isService", "isPublished"],
      where: { storeId, isArchived: false },
      _count: { _all: true },
    }),
    prisma.event.count({ where: { storeId } }),
    prisma.productBooking.count({ where: { product: { storeId }, status: "PENDING" } }),
  ]);
  return {
    ...nav, pendingBookings, events,
    products: catalogue.filter(row => !row.isService).reduce((n, row) => n + row._count._all, 0),
    services: catalogue.filter(row => row.isService).reduce((n, row) => n + row._count._all, 0),
    drafts: catalogue.filter(row => !row.isPublished).reduce((n, row) => n + row._count._all, 0),
  };
}

export type VendorWorkspaceSummary = Awaited<ReturnType<typeof getVendorWorkspaceSummary>>;
