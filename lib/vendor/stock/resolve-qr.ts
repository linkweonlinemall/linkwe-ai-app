import "server-only";
import type { PrismaClient } from "@prisma/client";
import { stockProductSelect, toStockProduct } from "./query";
import { parseStockQr, StockQrError } from "./scan";
import { assertLiveStockAccess, stockPlanSelect } from "./access";

export async function resolveStockQr(db: PrismaClient, actorId: string, expectedStoreId: unknown, value: unknown) {
  const slug = parseStockQr(value);
  if (typeof expectedStoreId !== "string" || !expectedStoreId || expectedStoreId.length > 100) {
    throw new StockQrError("Refresh your vendor catalog before scanning a label.");
  }
  const store = await db.store.findUnique({ where: { ownerId: actorId }, select: { id: true, ...stockPlanSelect } });
  if (!store || store.id !== expectedStoreId) throw new StockQrError("Sign in to the vendor account that opened this catalog, then try again.");
  assertLiveStockAccess(store);
  const product = await db.product.findFirst({
    where: { slug, storeId: store.id, isService: false, isDigital: false, isArchived: false },
    select: stockProductSelect,
  });
  // Missing, removed, ineligible and foreign products are deliberately indistinguishable.
  if (!product) throw new StockQrError("This product is unavailable in your stock catalog. Search below or check its label in QR Studio.");
  return toStockProduct(product);
}
