"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

async function getOrCreateWishlist(userId: string) {
  let wishlist = await prisma.wishlist.findUnique({ where: { userId } });
  if (!wishlist) {
    wishlist = await prisma.wishlist.create({ data: { userId } });
  }
  return wishlist;
}

export async function toggleWishlistItem(productId: string): Promise<
  { ok: true; wishlisted: boolean } | { error: string }
> {
  const session = await getSession();
  if (!session) return { error: "not_logged_in" };

  const wishlist = await getOrCreateWishlist(session.userId);

  const existing = await prisma.wishlistItem.findUnique({
    where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    revalidatePath("/wishlist");
    return { ok: true, wishlisted: false };
  }
  await prisma.wishlistItem.create({
    data: { wishlistId: wishlist.id, productId },
  });
  revalidatePath("/wishlist");
  return { ok: true, wishlisted: true };
}

export async function getWishlistProductIds(): Promise<string[]> {
  const session = await getSession();
  if (!session) return [];

  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: session.userId },
    select: { items: { select: { productId: true } } },
  });

  return wishlist?.items.map((i) => i.productId) ?? [];
}

export async function getWishlistItems() {
  const session = await getSession();
  if (!session) return [];

  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: session.userId },
    select: {
      items: {
        select: {
          id: true,
          productId: true,
          createdAt: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              compareAtPrice: true,
              images: true,
              isDigital: true,
              hasVariants: true,
              isPublished: true,
              store: { select: { name: true, slug: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return wishlist?.items ?? [];
}

export async function toggleSavedStore(storeId: string): Promise<
  { ok: true; saved: boolean } | { error: string }
> {
  const session = await getSession();
  if (!session) return { error: "not_logged_in" };

  const existing = await prisma.savedStore.findUnique({
    where: { userId_storeId: { userId: session.userId, storeId } },
  });

  if (existing) {
    await prisma.savedStore.delete({ where: { id: existing.id } });
    revalidatePath("/saved-stores");
    return { ok: true, saved: false };
  }
  await prisma.savedStore.create({
    data: { userId: session.userId, storeId },
  });
  revalidatePath("/saved-stores");
  return { ok: true, saved: true };
}

export async function getSavedStoreIds(): Promise<string[]> {
  const session = await getSession();
  if (!session) return [];

  const saved = await prisma.savedStore.findMany({
    where: { userId: session.userId },
    select: { storeId: true },
  });

  return saved.map((s) => s.storeId);
}

export async function getSavedStores() {
  const session = await getSession();
  if (!session) return [];

  const saved = await prisma.savedStore.findMany({
    where: { userId: session.userId },
    select: {
      id: true,
      storeId: true,
      createdAt: true,
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          tagline: true,
          logoUrl: true,
          coverPhotoUrl: true,
          region: true,
          status: true,
          _count: { select: { products: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return saved;
}
