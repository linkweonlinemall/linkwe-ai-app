export const MAX_ADJUSTMENT_LINES = 100;
export const MAX_ADJUSTMENT_QUANTITY = 100_000;

export type StockLine = { productId: string; variantId: string | null; quantity: number };
export type StockAdjustmentInput = { storeId: string; requestId: string; lines: StockLine[] };
export type StockAuditLine = StockLine & {
  productName: string;
  variantName: string | null;
  productStockBefore: number | null;
  productStockAfter: number | null;
  variantStockBefore: number | null;
  variantStockAfter: number | null;
};
export type StockReceipt = { id: string; createdAt: string; totalQuantity: number; lines: StockAuditLine[] };
export type StockVariant = { id: string; name: string; sku: string | null; stock: number | null; attributes: string };
export type StockProduct = {
  id: string; name: string; sku: string | null; category: string | null; image: string | null;
  stock: number | null; hasVariants: boolean; published: boolean; variants: StockVariant[];
};
export type StockCatalog = { storeId: string; storeName: string; products: StockProduct[]; recent: StockReceipt[] };
export type StockAdjustmentResult =
  | { ok: true; receipt: StockReceipt; replayed: boolean }
  | { ok: false; error: string; uncertain: boolean; upgradeRequired?: boolean };

export class StockAdjustmentError extends Error {}
export class StockAdjustmentAccessError extends StockAdjustmentError {}

export function parseStockAdjustment(value: unknown): StockAdjustmentInput {
  if (!value || typeof value !== "object") throw new StockAdjustmentError("Choose products and quantities first.");
  const input = value as Partial<StockAdjustmentInput>;
  if (typeof input.storeId !== "string" || !input.storeId.trim() || input.storeId.length > 100) {
    throw new StockAdjustmentError("Refresh your vendor catalog before making an adjustment.");
  }
  if (typeof input.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) {
    throw new StockAdjustmentError("This adjustment needs a valid request reference. Refresh and try again.");
  }
  if (!Array.isArray(input.lines) || !input.lines.length || input.lines.length > MAX_ADJUSTMENT_LINES) {
    throw new StockAdjustmentError(`Choose between 1 and ${MAX_ADJUSTMENT_LINES} stock items.`);
  }
  const keys = new Set<string>();
  const lines = input.lines.map((line): StockLine => {
    if (!line || typeof line !== "object" || typeof line.productId !== "string" || !line.productId.trim() || line.productId.length > 100 ||
      !(line.variantId === null || typeof line.variantId === "string" && line.variantId.trim() && line.variantId.length <= 100)) {
      throw new StockAdjustmentError("Choose a valid product and its exact option.");
    }
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_ADJUSTMENT_QUANTITY) {
      throw new StockAdjustmentError(`Quantities must be whole numbers from 1 to ${MAX_ADJUSTMENT_QUANTITY.toLocaleString()}.`);
    }
    const key = stockLineKey(line.productId, line.variantId);
    if (keys.has(key)) throw new StockAdjustmentError("Each product option can only appear once. Combine its quantity into one line.");
    keys.add(key);
    return { productId: line.productId, variantId: line.variantId, quantity: line.quantity };
  });
  lines.sort((a, b) => a.productId.localeCompare(b.productId) || (a.variantId ?? "").localeCompare(b.variantId ?? ""));
  return { storeId: input.storeId, requestId: input.requestId.toLowerCase(), lines };
}

export const stockLineKey = (productId: string, variantId: string | null) => JSON.stringify([productId, variantId]);
export const requiresVariant = (product: StockProduct) => product.hasVariants || product.variants.length > 0;
export function availableStock(product: StockProduct, variant?: StockVariant): number | null {
  const limits = [product.stock, variant?.stock].filter((value): value is number => value !== null && value !== undefined);
  return limits.length ? Math.min(...limits) : null;
}
export function variantLabel(variant: StockVariant) {
  return variant.attributes || variant.name;
}
export function stockOptions(product: StockProduct) {
  return requiresVariant(product)
    ? product.variants.map(variant => ({ variantId: variant.id, label: variantLabel(variant), stock: availableStock(product, variant) }))
    : [{ variantId: null, label: "Standard item", stock: product.stock }];
}
export function filterStockProducts(products: StockProduct[], query: string, category: string, stock: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return products.filter(product => {
    const text = [product.name, product.sku, product.category, ...product.variants.flatMap(v => [v.name, v.sku, v.attributes])].join(" ").toLowerCase();
    const options = stockOptions(product);
    return words.every(word => text.includes(word)) && (!category || product.category === category) &&
      (stock === "all" || stock === "available" && options.some(option => option.stock !== null && option.stock > 0) ||
        stock === "out" && options.some(option => option.stock === 0) || stock === "untracked" && options.some(option => option.stock === null));
  });
}
export function reviewStockLines(products: StockProduct[], lines: StockLine[]): string | null {
  const totals = new Map<string, number>();
  for (const line of lines) {
    const product = products.find(p => p.id === line.productId);
    if (!product) return "A selected product is no longer available. Refresh the catalog.";
    const option = stockOptions(product).find(option => option.variantId === line.variantId);
    if (!option || option.stock === null) return `Choose a tracked stock option for ${product.name}.`;
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_ADJUSTMENT_QUANTITY) return `Enter a positive whole quantity for ${product.name}.`;
    if (line.quantity > option.stock) return `${product.name}: the quantity exceeds available stock.`;
    totals.set(product.id, (totals.get(product.id) ?? 0) + line.quantity);
  }
  for (const [id, quantity] of totals) {
    const product = products.find(p => p.id === id)!;
    if (product.stock !== null && quantity > product.stock) return `${product.name}: selected options exceed the shared product stock of ${product.stock}.`;
  }
  return null;
}
