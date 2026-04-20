import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

async function generateSplitOrderRef(tx: Prisma.TransactionClient): Promise<string> {
  const count = await tx.splitOrder.count();
  const next = count + 1;
  return `SP-${String(next).padStart(4, "0")}`;
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

export async function createSplitOrdersFromMainOrder(mainOrderId: string): Promise<void> {
  const mainOrder = await prisma.mainOrder.findUnique({
    where: { id: mainOrderId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              storeId: true,
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

  await prisma.$transaction(async (tx) => {
    const existingSplitOrders = await tx.splitOrder.count({
      where: { mainOrderId },
    });
    if (existingSplitOrders > 0) return;

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
          referenceNumber: await generateSplitOrderRef(tx),
          storeId,
          status: "AWAITING_VENDOR_ACTION",
          subtotalMinor,
          vendorNetMinor: subtotalMinor,
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
