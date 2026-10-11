import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stockReceipt } from "./adjust";
import type { StockCatalog, StockProduct } from "./model";
import { assertLiveStockAccess, stockPlanSelect } from "./access";

export const stockProductSelect = {
  id: true, name: true, sku: true, category: true, images: true, stock: true, hasVariants: true, isPublished: true,
  variants: { orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, sku: true, stock: true, attributes: true } },
} satisfies Prisma.ProductSelect;

function attributeLabel(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value.flatMap(attribute => attribute && typeof attribute === "object" && typeof attribute.name === "string" && typeof attribute.value === "string"
    ? [`${attribute.name}: ${attribute.value}`] : []).join(" · ");
}
export function toStockProduct({ images, isPublished, variants, ...product }: Prisma.ProductGetPayload<{ select: typeof stockProductSelect }>): StockProduct {
  return { ...product, image: images[0] ?? null, published: isPublished,
    variants: variants.map(variant => ({ ...variant, attributes: attributeLabel(variant.attributes) })) };
}
export async function getStockCatalog(actorId: string): Promise<StockCatalog | null> {
  const store = await prisma.store.findUnique({ where: { ownerId: actorId }, select: { id: true, name: true, ...stockPlanSelect } });
  if (!store) return null;
  assertLiveStockAccess(store);
  const [products, recent] = await Promise.all([
    prisma.product.findMany({ where: { storeId: store.id, isService: false, isDigital: false, isArchived: false }, orderBy: [{ name: "asc" }, { id: "asc" }],
      select: stockProductSelect }),
    prisma.stockAdjustment.findMany({ where: { storeId: store.id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 10 }),
  ]);
  return { storeId: store.id, storeName: store.name,
    products: products.map(toStockProduct), recent: recent.map(stockReceipt) };
}
