import { cache } from "react";

import { prisma } from "@/lib/prisma";

export type VendorReviewStats = {
  total: number;
  average: number;
  breakdown: Record<number, number>;
  unanswered: number;
};

/** Review stats for the vendor's store (products, store reviews, booking reviews). */
export const getVendorReviewStatsForStore = cache(
  async (storeId: string): Promise<VendorReviewStats> => {
    const reviews = await prisma.review.findMany({
      where: {
        OR: [
          { product: { storeId } },
          { store: { id: storeId } },
          { booking: { product: { storeId } } },
        ],
      },
      select: { rating: true, vendorReply: true },
    });

    const total = reviews.length;
    const average = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      breakdown[r.rating] = (breakdown[r.rating] ?? 0) + 1;
    });
    const unanswered = reviews.filter((r) => !r.vendorReply).length;

    return { total, average, breakdown, unanswered };
  },
);
