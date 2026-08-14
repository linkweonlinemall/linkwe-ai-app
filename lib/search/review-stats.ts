import { prisma } from "@/lib/prisma";

export async function reviewStatsForProducts(
  productIds: string[],
): Promise<Map<string, { average: number; count: number }>> {
  if (productIds.length === 0) return new Map();

  const rows = await prisma.review.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds } },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return new Map(
    rows
      .filter((r) => r.productId)
      .map((r) => [
        r.productId!,
        {
          average: r._avg.rating ?? 0,
          count: r._count.rating,
        },
      ]),
  );
}

export async function reviewStatsForStores(
  storeIds: string[],
): Promise<Map<string, { average: number; count: number }>> {
  const map = new Map<string, { sum: number; count: number }>();
  if (storeIds.length === 0) return new Map();

  const [listingRows, directRows] = await Promise.all([
    prisma.review.findMany({
      where: { listing: { storeId: { in: storeIds } } },
      select: { rating: true, listing: { select: { storeId: true } } },
    }),
    prisma.review.findMany({
      where: { storeId: { in: storeIds }, productId: null },
      select: { rating: true, storeId: true },
    }),
  ]);

  for (const r of listingRows) {
    const sid = r.listing?.storeId;
    if (!sid) continue;
    const cur = map.get(sid) ?? { sum: 0, count: 0 };
    cur.sum += r.rating;
    cur.count += 1;
    map.set(sid, cur);
  }

  for (const r of directRows) {
    const sid = r.storeId;
    if (!sid) continue;
    const cur = map.get(sid) ?? { sum: 0, count: 0 };
    cur.sum += r.rating;
    cur.count += 1;
    map.set(sid, cur);
  }

  return new Map(
    [...map.entries()].map(([id, { sum, count }]) => [
      id,
      { average: count ? sum / count : 0, count },
    ]),
  );
}
