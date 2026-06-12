import { prisma } from "@/lib/prisma";

export type StoreShippingConfig = {
  storeId: string;
  storeName: string;
  shippingMode: "SELF" | "LINKWE";
  selfRates: Array<{ zone: string; rateMinor: number; active: boolean }>;
};

/**
 * Loads shipping mode + vendor zone rates for the given stores. Server-only (Prisma).
 */
export async function loadStoreShippingConfigs(
  storeIds: string[],
): Promise<StoreShippingConfig[]> {
  if (storeIds.length === 0) return [];

  const uniqueIds = [...new Set(storeIds)];

  const stores = await prisma.store.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      name: true,
      shippingMode: true,
      shippingRates: {
        select: {
          zone: true,
          rateMinor: true,
          active: true,
        },
      },
    },
  });

  const byId = new Map(
    stores.map((store) => [
      store.id,
      {
        storeId: store.id,
        storeName: store.name,
        shippingMode: store.shippingMode as "SELF" | "LINKWE",
        selfRates: store.shippingRates.map((r) => ({
          zone: r.zone,
          rateMinor: r.rateMinor,
          active: r.active,
        })),
      } satisfies StoreShippingConfig,
    ]),
  );

  return uniqueIds
    .map((id) => byId.get(id))
    .filter((row): row is StoreShippingConfig => row != null);
}
