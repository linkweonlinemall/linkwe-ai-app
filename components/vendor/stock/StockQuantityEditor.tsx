import { useId } from "react";
import { Check, Plus } from "lucide-react";
import { MAX_ADJUSTMENT_QUANTITY } from "@/lib/vendor/stock/model";
import { isStockDraftStaged, type StockDraft } from "@/lib/vendor/stock/staging";
import s from "./stock-workspace.module.css";

type Props = {
  draft: StockDraft;
  productName: string;
  optionLabel: string;
  available: number | null;
  error: string | null;
  disabled: boolean;
  onQuantityChange: (quantity: string) => void;
  onAdd: () => void;
};

export default function StockQuantityEditor({ draft, productName, optionLabel, available, error, disabled, onQuantityChange, onAdd }: Props) {
  const id = useId();
  const confirmed = isStockDraftStaged(draft);
  const descriptionId = `${id}-status`;
  const errorId = `${id}-error`;
  return <div className={s.quantityEditor}>
    <div className={s.quantityControls}>
      <label className={s.quantity}>Deduct
        <input type="number" inputMode="numeric" min={1} max={Math.min(available ?? MAX_ADJUSTMENT_QUANTITY, MAX_ADJUSTMENT_QUANTITY)} step={1}
          aria-label={`Quantity to deduct from ${productName}, ${optionLabel}`} aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ""}`}
          aria-invalid={!!error} value={draft.quantity} disabled={disabled} onChange={event => onQuantityChange(event.target.value)} />
      </label>
      <button type="button" className={s.addButton} data-confirmed={confirmed} disabled={disabled || confirmed || !!error}
        aria-label={confirmed ? `Added ${productName}, ${optionLabel} to update` : `Add to update: ${productName}, ${optionLabel}`} onClick={onAdd}>
        {confirmed ? <><Check size={16} aria-hidden="true" /> Added</> : <><Plus size={16} aria-hidden="true" /> Add to update</>}
      </button>
    </div>
    <p id={descriptionId} className={confirmed ? s.stagedStatus : draft.editedAfterStaging ? s.changedStatus : s.draftStatus} role="status">
      {confirmed ? <><Check size={14} aria-hidden="true" /><span>{draft.stagedQuantity} selected for deduction</span></>
        : draft.editedAfterStaging ? "Quantity changed. Add it again to confirm." : "Add this quantity to your update."}
    </p>
    {error && <p id={errorId} className={s.quantityError}>{error}</p>}
  </div>;
}
