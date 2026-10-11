import { MAX_ADJUSTMENT_LINES, reviewStockLines, stockLineKey, type StockLine, type StockProduct } from "./model";

export type StockDraft = Omit<StockLine, "quantity"> & {
  quantity: string;
  stagedQuantity: number | null;
  editedAfterStaging: boolean;
};
export type StockSelection = Record<string, StockDraft>;

export function newStockDraft(productId: string, variantId: string | null): StockDraft {
  return { productId, variantId, quantity: "1", stagedQuantity: null, editedAfterStaging: false };
}

/** Editing a confirmed amount always removes it from the batch until explicitly added again. */
export function editStockDraft(draft: StockDraft, quantity: string): StockDraft {
  if (quantity === draft.quantity) return draft;
  return { ...draft, quantity, stagedQuantity: null, editedAfterStaging: draft.stagedQuantity !== null || draft.editedAfterStaging };
}

export function isStockDraftStaged(draft: StockDraft): boolean {
  return draft.stagedQuantity !== null && draft.stagedQuantity === Number(draft.quantity);
}

export function stagedStockLines(selection: StockSelection): StockLine[] {
  return Object.values(selection).filter(isStockDraftStaged).map(draft => ({
    productId: draft.productId, variantId: draft.variantId, quantity: draft.stagedQuantity!,
  }));
}

/** Validates the proposed amount together with the other confirmed options, without touching stock. */
export function stockStageError(products: StockProduct[], selection: StockSelection, key: string): string | null {
  const draft = selection[key];
  if (!draft) return "Select this stock item first.";
  if (Object.keys(selection).length > MAX_ADJUSTMENT_LINES) return `Choose no more than ${MAX_ADJUSTMENT_LINES} stock items.`;
  const others = stagedStockLines(selection).filter(line => stockLineKey(line.productId, line.variantId) !== key);
  return reviewStockLines(products, [...others, { productId: draft.productId, variantId: draft.variantId, quantity: Number(draft.quantity) }]);
}

export function stageStockDraft(products: StockProduct[], selection: StockSelection, key: string): { selection: StockSelection; error: string | null } {
  const error = stockStageError(products, selection, key);
  if (error) return { selection, error };
  return { selection: { ...selection, [key]: { ...selection[key], stagedQuantity: Number(selection[key].quantity), editedAfterStaging: false } }, error: null };
}

/** Block review until every checked option is explicitly confirmed or deselected. */
export function stockSelectionError(products: StockProduct[], selection: StockSelection): string | null {
  const drafts = Object.values(selection);
  if (!drafts.length) return "Select at least one stock item.";
  const waiting = drafts.filter(draft => !isStockDraftStaged(draft)).length;
  if (waiting) return `Add ${waiting === 1 ? "the remaining item" : `the remaining ${waiting} items`} to the update, or deselect ${waiting === 1 ? "it" : "them"}, before reviewing.`;
  return reviewStockLines(products, stagedStockLines(selection));
}

/** A previously submitted request is already confirmed and must retain its original retry payload. */
export function restoreStockSelection(lines: StockLine[]): StockSelection {
  return Object.fromEntries(lines.map(line => [stockLineKey(line.productId, line.variantId), {
    ...line, quantity: String(line.quantity), stagedQuantity: line.quantity, editedAfterStaging: false,
  }]));
}
