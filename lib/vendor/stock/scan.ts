import { MAX_ADJUSTMENT_LINES, requiresVariant, stockLineKey, stockOptions, type StockProduct } from "./model";
import { newStockDraft, type StockSelection } from "./staging";

export type StockQrResult = { ok: true; product: StockProduct } | { ok: false; error: string; upgradeRequired?: boolean };
export class StockQrError extends Error {}

/** Read an identifier, never navigate to or fetch a scanned address. Matches existing QR Studio product labels. */
export function parseStockQr(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048) throw new StockQrError("Scan a product label from QR Studio, or search your catalog below.");
  // Match the original string before URL normalization can hide credentials, dot segments, escapes or backslashes.
  const match = /^https?:\/\/(?:www\.)?linkweonlinemall\.com\/products\/([a-z0-9][a-z0-9-]*)\/?$/i.exec(value.trim());
  if (!match) throw new StockQrError("Use a LinkWe product QR without extra parameters. Store, event and service codes cannot update product stock. You can also search below.");
  return match[1].toLowerCase();
}

/** Scanning can prepare one simple-product draft, but never stage, increment, or choose a variant. */
export function selectScannedStockProduct(selection: StockSelection, product: StockProduct): StockSelection {
  if (requiresVariant(product)) return selection;
  const option = stockOptions(product)[0];
  const key = stockLineKey(product.id, null);
  if (!option || option.stock === null || option.stock <= 0 || selection[key] || Object.keys(selection).length >= MAX_ADJUSTMENT_LINES) return selection;
  return { ...selection, [key]: newStockDraft(product.id, null) };
}
