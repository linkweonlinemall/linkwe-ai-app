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

export async function addToCart(
  productId: string,
  addQuantity: number = 1,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "not_logged_in" };

  if (!Number.isFinite(addQuantity) || addQuantity < 1) {
    return { ok: false, error: "invalid_quantity" };
  }

  const addQty = Math.floor(addQuantity);

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
    const newQty = existing.quantity + addQty;
    if (product.stock !== null && newQty > product.stock) {
      return { ok: false, error: "out_of_stock" };
    }
    await prisma.productCartItem.update({
      where: { userId_productId: { userId: session.userId, productId } },
      data: { quantity: newQty },
    });
  } else {
    if (product.stock !== null && product.stock < 1) {
      return { ok: false, error: "out_of_stock" };
    }
    const createQty = product.stock !== null ? Math.min(addQty, product.stock) : addQty;
    await prisma.productCartItem.create({
      data: { userId: session.userId, productId, quantity: createQty },
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
