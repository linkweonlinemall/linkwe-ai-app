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

  const rows = await prisma.review.findMany({
    where: { OR: [{listing:{storeId:{in:storeIds}}},{storeId:{in:storeIds},productId:null}] },
    select: {rating:true,storeId:true,listing:{select:{storeId:true}}},
  });
  for (const row of rows) {
    const id=row.listing?.storeId??row.storeId;
    if (!id) continue;
    const current=map.get(id)??{sum:0,count:0};
    map.set(id,{sum:current.sum+row.rating,count:current.count+1});
  }

  return new Map(
    [...map.entries()].map(([id, { sum, count }]) => [
      id,
      { average: count ? sum / count : 0, count },
    ]),
  );
}
