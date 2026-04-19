"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function getCart() {
  const session = await getSession();
  if (!session) return [];

  const items = await prisma.productCartItem.findMany({
    where: { userId: session.userId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          images: true,
          stock: true,
          store: {
            select: { name: true, slug: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return items;
}

export async function addToCart(productId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "not_logged_in" };

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, stock: true, isPublished: true },
  });

  if (!product || !product.isPublished) {
    return { ok: false, error: "product_not_found" };
  }

  const existing = await prisma.productCartItem.findUnique({
    where: { userId_productId: { userId: session.userId, productId } },
  });

  if (existing) {
    if (product.stock !== null && existing.quantity >= product.stock) {
      return { ok: false, error: "out_of_stock" };
    }
    await prisma.productCartItem.update({
      where: { userId_productId: { userId: session.userId, productId } },
      data: { quantity: { increment: 1 } },
    });
  } else {
    await prisma.productCartItem.create({
      data: { userId: session.userId, productId, quantity: 1 },
    });
  }

  revalidatePath("/cart");
  return { ok: true };
}

export async function removeFromCart(productId: string): Promise<void> {
  const session = await getSession();
  if (!session) return;

  await prisma.productCartItem.deleteMany({
    where: { userId: session.userId, productId },
  });

  revalidatePath("/cart");
}

export async function updateCartQuantity(productId: string, quantity: number): Promise<void> {
  const session = await getSession();
  if (!session) return;

  if (quantity <= 0) {
    await prisma.productCartItem.deleteMany({
      where: { userId: session.userId, productId },
    });
  } else {
    await prisma.productCartItem.update({
      where: { userId_productId: { userId: session.userId, productId } },
      data: { quantity },
    });
  }

  revalidatePath("/cart");
}
