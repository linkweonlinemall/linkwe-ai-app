"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import type { VariantAttribute, VariantInput } from "@/lib/variant-options";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export type ProductVariantSaveInput = VariantInput & { images?: string[] };

export async function saveProductVariants(productId: string, variants: ProductVariantSaveInput[]) {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") redirect("/login");

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) redirect("/dashboard/vendor");

  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id },
    select: { id: true, price: true },
  });
  if (!product) return { ok: false as const, error: "Product not found" };

  // Delete existing variants and recreate
  await prisma.productVariant.deleteMany({
    where: { productId },
  });

  if (variants.length === 0) {
    await prisma.product.update({
      where: { id: productId },
      data: { hasVariants: false },
    });
    revalidatePath(`/dashboard/vendor/products/${productId}/edit`);
    return { ok: true as const };
  }

  await prisma.product.update({
    where: { id: productId },
    data: { hasVariants: true },
  });

  for (const variant of variants) {
    await prisma.productVariant.create({
      data: {
        productId,
        name: variant.attributes.map((a) => a.value).join(" / "),
        attributes: variant.attributes as unknown as Prisma.InputJsonValue,
        price: variant.price ?? null,
        stock: variant.stock ?? null,
        sku: variant.sku ?? null,
        images: variant.images ?? [],
      },
    });
  }

  revalidatePath(`/dashboard/vendor/products/${productId}/edit`);
  revalidatePath(`/products/${productId}`);
  return { ok: true as const };
}

export async function getProductVariants(productId: string) {
  const variants = await prisma.productVariant.findMany({
    where: { productId },
    orderBy: { createdAt: "asc" },
  });
  return variants;
}

export async function updateVariantStock(variantId: string, stock: number) {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") redirect("/login");

  await prisma.productVariant.update({
    where: { id: variantId },
    data: { stock },
  });
  return { ok: true };
}
