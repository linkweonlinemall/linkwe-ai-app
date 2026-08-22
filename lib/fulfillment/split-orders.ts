import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { loadStoreShippingConfigs } from "@/lib/shipping/load-store-shipping-configs";
import {
  computePerStoreShipping,
  type PerStoreShippingRow,
} from "@/lib/shipping/per-store-shipping";

async function generateSplitOrderRef(
  tx: Prisma.TransactionClient,
  mainOrderRef: string | null,
): Promise<string> {
  const count = await tx.splitOrder.count();
  const next = count + 1;
  const spRef = `SP-${String(next).padStart(4, "0")}`;
  if (mainOrderRef) {
    return `${spRef}-${mainOrderRef}`;
  }
  return spRef;
}

async function resolveListingIdForOrderItem(
  tx: Prisma.TransactionClient,
  storeId: string,
  item: {
    listingId: string | null;
    titleSnapshot: string;
    priceMinor: number;
    productId: string | null;
    product: {
      id: string;
      storeId: string;
      slug: string;
      name: string;
      shortDescription: string | null;
      images: string[];
    } | null;
  },
): Promise<string> {
  if (item.listingId) {
    return item.listingId;
  }

  const product = item.product;
  if (!product || !item.productId) {
    throw new Error(`Split order: order item has no listing or product (${item.titleSnapshot})`);
  }

  const bySlug = await tx.listing.findFirst({
    where: { storeId, slug: product.slug },
    select: { id: true },
  });
  if (bySlug) {
    return bySlug.id;
  }

  const byTitle = await tx.listing.findFirst({
    where: { storeId, title: product.name },
    select: { id: true },
  });
  if (byTitle) {
    return byTitle.id;
  }

  const store = await tx.store.findUnique({
    where: { id: storeId },
    select: { ownerId: true },
  });
  if (!store) {
    throw new Error(`Split order: store not found (${storeId})`);
  }

  try {
    const created = await tx.listing.create({
      data: {
        storeId,
        ownerId: store.ownerId,
        type: "PRODUCT",
        status: "PUBLISHED",
        slug: product.slug,
        title: item.titleSnapshot,
        imageUrl: product.images[0] ?? null,
        shortDescription: product.shortDescription?.slice(0, 500) ?? null,
        priceMinor: item.priceMinor,
        currency: "TTD",
        publishedAt: new Date(),
      },
      select: { id: true },
    });
    return created.id;
  } catch (e) {
    const taken = await tx.listing.findUnique({
      where: { slug: product.slug },
      select: { id: true, storeId: true },
    });
    if (taken && taken.storeId === storeId) {
      return taken.id;
    }
    throw e;
  }
}

function reconcileSplitShippingMinor(
  perStore: PerStoreShippingRow[],
  orderShippingMinor: number,
): Map<string, number> {
  const amounts = new Map<string, number>();
  for (const row of perStore) {
    amounts.set(row.storeId, row.deliversToZone ? row.shippingMinor : 0);
  }

  if (amounts.size === 0) return amounts;

  const sum = [...amounts.values()].reduce((acc, n) => acc + n, 0);
  const diff = orderShippingMinor - sum;
  if (diff !== 0) {
    const firstStoreId = perStore[0]!.storeId;
    amounts.set(firstStoreId, (amounts.get(firstStoreId) ?? 0) + diff);
  }

  return amounts;
}

export async function createSplitOrdersFromMainOrder(mainOrderId: string): Promise<void> {
  const mainOrder = await prisma.mainOrder.findUnique({
    where: { id: mainOrderId },
    select: {
      status: true,
      shippingMinor: true,
      shippingZone: true,
      region: true,
      items: {
        include: {
          store: { select: { name: true } },
          product: {
            select: {
              id: true,
              storeId: true,
              isDigital: true,
              price: true,
              weight: true,
              weightUnit: true,
              slug: true,
              name: true,
              shortDescription: true,
              images: true,
            },
          },
        },
      },
    },
  });

  if (!mainOrder || mainOrder.status !== "PAID") return;

  const itemsByStore = new Map<string, typeof mainOrder.items>();
  for (const item of mainOrder.items) {
    const storeId = item.storeId;
    if (!itemsByStore.has(storeId)) {
      itemsByStore.set(storeId, []);
    }
    itemsByStore.get(storeId)!.push(item);
  }

  const storeIds = [...itemsByStore.keys()];
  let shippingMinorByStore = new Map<string, number>();

  if (mainOrder.shippingMinor === 0) {
    for (const storeId of storeIds) {
      shippingMinorByStore.set(storeId, 0);
    }
  } else {
    const configs = await loadStoreShippingConfigs(storeIds);
    const configByStoreId = new Map(configs.map((c) => [c.storeId, c]));

    const shippingResult = computePerStoreShipping({
      region: mainOrder.region,
      stores: storeIds.map((storeId) => {
        const storeItems = itemsByStore.get(storeId) ?? [];
        const config = configByStoreId.get(storeId);
        const storeName = config?.storeName ?? storeItems[0]?.store.name ?? "Store";
        const totalWeightLbs = storeItems.reduce((sum, item) => {
          if (item.product?.isDigital) return sum;
          return sum + item.weightLbs * item.quantity;
        }, 0);
        const allItemsDigitalOrPickup = storeItems.every(
          (item) => item.product?.isDigital === true,
        );

        return {
          storeId,
          storeName,
          shippingMode: config?.shippingMode ?? "LINKWE",
          selfRates: config?.selfRates ?? [],
          totalWeightLbs,
          allItemsDigitalOrPickup,
          isDigitalOnly: allItemsDigitalOrPickup,
        };
      }),
    });

    shippingMinorByStore = reconcileSplitShippingMinor(
      shippingResult.perStore,
      mainOrder.shippingMinor,
    );
  }

  await prisma.$transaction(async (tx) => {
    const existingSplitOrders = await tx.splitOrder.count({
      where: { mainOrderId },
    });
    if (existingSplitOrders > 0) return;

    const mainOrderRow = await tx.mainOrder.findUnique({
      where: { id: mainOrderId },
      select: { referenceNumber: true },
    });

    for (const item of mainOrder.items) {
      if (!item.productId) continue;

      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stock: true },
      });
      if (product?.stock === null || product?.stock === undefined) continue;

      const decremented = await tx.product.updateMany({
        where: {
          id: item.productId,
          stock: { gte: item.quantity },
        },
        data: { stock: { decrement: item.quantity } },
      });

      if (decremented.count === 0) {
        throw new Error(`Split order: insufficient stock for product ${item.productId}`);
      }
    }

    for (const [storeId, items] of itemsByStore.entries()) {
      const subtotalMinor = items.reduce((sum, item) => sum + item.priceMinor * item.quantity, 0);

      const store = await tx.store.findUnique({
        where: { id: storeId },
        select: { region: true, address: true },
      });

      const itemCreates = await Promise.all(
        items.map(async (item) => {
          const listingId = await resolveListingIdForOrderItem(tx, storeId, item);
          return {
            listingId,
            titleSnapshot: item.titleSnapshot,
            unitPriceMinor: item.priceMinor,
            lineTotalMinor: item.priceMinor * item.quantity,
            currency: "TTD",
            quantity: item.quantity,
          };
        }),
      );

      await tx.splitOrder.create({
        data: {
          mainOrderId,
          referenceNumber: await generateSplitOrderRef(tx, mainOrderRow?.referenceNumber ?? null),
          storeId,
          status: "AWAITING_VENDOR_ACTION",
          subtotalMinor,
          vendorNetMinor: subtotalMinor,
          shippingMinor: shippingMinorByStore.get(storeId) ?? 0,
          currency: "TTD",
          pickupRegion: store?.region ?? null,
          pickupAddress: store?.address ?? null,
          items: {
            create: itemCreates,
          },
        },
      });
    }
  });
}
