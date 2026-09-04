import { prisma } from "@/lib/prisma";

export type StoreShippingConfig = {
  storeId: string;
  storeName: string;
  shippingMode: "LINKWE";
  latitude: number | null;
  longitude: number | null;
  region: string;
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
      latitude: true,
      longitude: true,
      region: true,
    },
  });

  const byId = new Map(
    stores.map((store) => [
      store.id,
      {
        storeId: store.id,
        storeName: store.name,
        shippingMode: "LINKWE" as const,
        latitude: store.latitude,
        longitude: store.longitude,
        region: store.region,
      } satisfies StoreShippingConfig,
    ]),
  );

  return uniqueIds
    .map((id) => byId.get(id))
    .filter((row): row is StoreShippingConfig => row != null);
}
