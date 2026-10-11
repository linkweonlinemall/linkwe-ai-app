import "server-only";
import { createHash } from "node:crypto";
import { Prisma, type PrismaClient, type StockAdjustment } from "@prisma/client";
import { parseStockAdjustment, StockAdjustmentError, StockAdjustmentAccessError, type StockAuditLine, type StockReceipt } from "./model";
import { assertLiveStockAccess, stockPlanSelect } from "./access";

export function stockReceipt(row: StockAdjustment): StockReceipt {
  return { id: row.id, createdAt: row.createdAt.toISOString(), totalQuantity: row.totalQuantity, lines: row.lines as unknown as StockAuditLine[] };
}

/** All inventory changes and the receipt commit together. Never writes financial records. */
export async function adjustVendorStock(db: PrismaClient, actorId: string, value: unknown) {
  const input = parseStockAdjustment(value);
  const requestHash = createHash("sha256").update(JSON.stringify(input.lines)).digest("hex");
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await db.$transaction(async tx => {
        const store = await tx.store.findUnique({ where: { ownerId: actorId }, select: { id: true, ...stockPlanSelect } });
        // The supplied store is only a stale-account guard, never an authority to select a store.
        if (!store || store.id !== input.storeId) throw new StockAdjustmentAccessError("Sign in to the vendor account that started this stock update, then retry it.");
        // Recheck inside the serializable transaction, including saved-request replays after a downgrade.
        assertLiveStockAccess(store);
        const existing = await tx.stockAdjustment.findUnique({ where: { storeId_requestId: { storeId: store.id, requestId: input.requestId } } });
        if (existing) {
          if (existing.requestHash !== requestHash || existing.actorId !== actorId) throw new StockAdjustmentError("This request reference was already used for a different adjustment.");
          return { receipt: stockReceipt(existing), replayed: true };
        }
        const ids = [...new Set(input.lines.map(line => line.productId))];
        const products = await tx.product.findMany({
          where: { id: { in: ids }, storeId: store.id, isService: false, isDigital: false, isArchived: false },
          include: { variants: true },
        });
        // Do not disclose a foreign product's name or inventory.
        if (products.length !== ids.length) throw new StockAdjustmentError("One or more products are unavailable in your catalog. Refresh and review your selection.");
        const audit: StockAuditLine[] = [];
        // Deterministic update order reduces deadlocks between overlapping batches.
        for (const productId of ids) {
          const product = products.find(p => p.id === productId)!;
          const lines = input.lines.filter(line => line.productId === productId);
          const total = lines.reduce((sum, line) => sum + line.quantity, 0);
          if (product.stock !== null && product.stock < total) throw new StockAdjustmentError(`${product.name}: not enough shared stock. Refresh and review quantities.`);
          for (const line of lines) {
            const variant = line.variantId === null ? null : product.variants.find(v => v.id === line.variantId);
            if ((product.hasVariants || product.variants.length > 0) ? !variant : line.variantId !== null) {
              throw new StockAdjustmentError(`${product.name}: select its exact size, colour or other option.`);
            }
            if (variant?.stock === null && product.stock === null || !variant && product.stock === null) {
              throw new StockAdjustmentError(`${product.name}: set a stock quantity in the product editor before making deductions.`);
            }
            if (variant?.stock !== null && variant?.stock !== undefined && variant.stock < line.quantity) {
              throw new StockAdjustmentError(`${product.name} · ${variant.name}: not enough stock. Refresh and review quantities.`);
            }
            audit.push({ ...line, productName: product.name, variantName: variant?.name ?? null,
              productStockBefore: product.stock, productStockAfter: product.stock === null ? null : product.stock - total,
              variantStockBefore: variant?.stock ?? null, variantStockAfter: variant?.stock == null ? null : variant.stock - line.quantity });
          }
          if (product.stock !== null) {
            const changed = await tx.product.updateMany({ where: { id: product.id, storeId: store.id, stock: { gte: total }, isService: false, isDigital: false, isArchived: false }, data: { stock: { decrement: total } } });
            if (changed.count !== 1) throw new StockAdjustmentError(`${product.name}: stock changed. Refresh and review quantities.`);
          }
          for (const line of lines) {
            const variant = product.variants.find(v => v.id === line.variantId);
            if (!variant || variant.stock === null) continue;
            const changed = await tx.productVariant.updateMany({ where: { id: variant.id, productId: product.id, stock: { gte: line.quantity } }, data: { stock: { decrement: line.quantity } } });
            if (changed.count !== 1) throw new StockAdjustmentError(`${product.name}: option stock changed. Refresh and review quantities.`);
          }
        }
        const row = await tx.stockAdjustment.create({ data: { storeId: store.id, actorId, requestId: input.requestId, requestHash,
          totalQuantity: input.lines.reduce((sum, line) => sum + line.quantity, 0), lines: audit as unknown as Prisma.InputJsonValue } });
        return { receipt: stockReceipt(row), replayed: false };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });
    } catch (error) {
      // A losing serializable transaction or simultaneous request-key insert rolls back completely.
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code) && attempt < 4) continue;
      throw error;
    }
  }
  throw new Error("Stock adjustment retry limit reached.");
}
