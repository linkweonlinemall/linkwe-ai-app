import { prisma } from "@/lib/prisma";

export type VendorDailySalePoint = { date: string; amountTtd: number };

export type VendorDashboardAnalytics = {
  salesThisMonthTtd: number;
  salesPrevMonthTtd: number;
  salesChangePct: number | null;
  ordersThisMonth: number;
  ordersPrevMonth: number;
  ordersChangePct: number | null;
  profileViewsTotal: number;
  /**
   * Baseline storefront interest month-over-month: new Saves (SavedStore creations).
   * The headline number stays cumulative listing views (`profileViewsTotal`).
   */
  profileViewsChangePct: number | null;
  conversionRatePct: number;
  conversionChangePct: number | null;
  salesLast30Days: VendorDailySalePoint[];
};

function startOfMonthUtc(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addMonthsUtc(base: Date, delta: number) {
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth() + delta;
  const dt = new Date(Date.UTC(y, m, 1));
  return dt;
}

/** Signed percent delta; returns null when the prior-period baseline is zero and current is positive (show as “new”). */
export function pctChangeVsPrior(current: number, prior: number): number | null {
  if (prior === 0) return current === 0 ? 0 : null;
  return ((current - prior) / prior) * 100;
}

export async function getVendorDashboardAnalytics(storeId: string): Promise<VendorDashboardAnalytics> {
  const now = new Date();
  const thisMonthStart = startOfMonthUtc(now);
  const nextMonthStart = addMonthsUtc(thisMonthStart, 1);
  const prevMonthStart = addMonthsUtc(thisMonthStart, -1);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);
  thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

  const ledgerFetchSince = new Date(Math.min(thirtyDaysAgo.getTime(), prevMonthStart.getTime()));

  const [creditEntries, splitDates, sums, savesThisMonth, savesPrevMonth] = await Promise.all([
    prisma.vendorLedgerEntry.findMany({
      where: {
        storeId,
        entryType: "CREDIT_ORDER_SETTLEMENT",
        createdAt: { gte: ledgerFetchSince },
      },
      select: { amountMinor: true, createdAt: true },
    }),
    prisma.splitOrder.findMany({
      where: { storeId, createdAt: { gte: prevMonthStart } },
      select: { createdAt: true },
    }),
    Promise.all([
      prisma.product.aggregate({
        where: { storeId, isService: false },
        _sum: { viewCount: true },
      }),
      prisma.product.aggregate({
        where: { storeId, isService: true },
        _sum: { viewCount: true },
      }),
    ]),
    prisma.savedStore.count({
      where: { storeId, createdAt: { gte: thisMonthStart, lt: nextMonthStart } },
    }),
    prisma.savedStore.count({
      where: { storeId, createdAt: { gte: prevMonthStart, lt: thisMonthStart } },
    }),
  ]);

  function creditsSum(start: Date, end: Date) {
    return creditEntries.reduce((acc, row) => {
      if (row.createdAt >= start && row.createdAt < end) return acc + row.amountMinor;
      return acc;
    }, 0);
  }

  const salesThisMinor = creditsSum(thisMonthStart, nextMonthStart);
  const salesPrevMinor = creditsSum(prevMonthStart, thisMonthStart);

  function splitsCount(start: Date, end: Date) {
    return splitDates.reduce((acc, row) => {
      if (row.createdAt >= start && row.createdAt < end) return acc + 1;
      return acc;
    }, 0);
  }

  const salesChangePct = pctChangeVsPrior(salesThisMinor, salesPrevMinor);

  const ordersThisMonth = splitsCount(thisMonthStart, nextMonthStart);
  const ordersPrevMonth = splitsCount(prevMonthStart, thisMonthStart);
  const ordersChangePct = pctChangeVsPrior(ordersThisMonth, ordersPrevMonth);

  const profileViewsTotal = (sums[0]._sum.viewCount ?? 0) + (sums[1]._sum.viewCount ?? 0);
  const profileViewsChangePct = pctChangeVsPrior(savesThisMonth, savesPrevMonth);

  const conversionRatePct =
    profileViewsTotal > 0 ? (ordersThisMonth / profileViewsTotal) * 100 : ordersThisMonth > 0 ? 100 : 0;
  const conversionPrevPct =
    profileViewsTotal > 0 ? (ordersPrevMonth / profileViewsTotal) * 100 : ordersPrevMonth > 0 ? 100 : 0;
  const conversionChangePct = pctChangeVsPrior(conversionRatePct, conversionPrevPct);

  const dailyMap = new Map<string, number>();
  creditEntries.forEach((row) => {
    if (row.createdAt < thirtyDaysAgo) return;
    const key = row.createdAt.toISOString().slice(0, 10);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + row.amountMinor);
  });

  const salesLast30Days: VendorDailySalePoint[] = [];
  const cursor = new Date(thirtyDaysAgo);
  while (cursor <= now) {
    const key = cursor.toISOString().slice(0, 10);
    const minor = dailyMap.get(key) ?? 0;
    salesLast30Days.push({ date: key, amountTtd: minor / 100 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return {
    salesThisMonthTtd: salesThisMinor / 100,
    salesPrevMonthTtd: salesPrevMinor / 100,
    salesChangePct,
    ordersThisMonth,
    ordersPrevMonth,
    ordersChangePct,
    profileViewsTotal,
    profileViewsChangePct,
    conversionRatePct,
    conversionChangePct,
    salesLast30Days,
  };
}
