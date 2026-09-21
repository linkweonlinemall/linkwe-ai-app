"use client";

import { Heart, Minus, Plus, ArrowUpRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
import AddToCartButton from "./AddToCartButton";
import VariantSelector from "./VariantSelector";
import WishlistButton from "@/components/ui/WishlistButton";
import { formatTTDPrice } from "@/lib/format/price";
import { productPurchaseState, type ProductOption } from "@/lib/product/display";
import styles from "./product.module.css";

type Props = {
  productId: string; productName: string; basePrice: number; compareAtPrice: number | null;
  baseStock: number | null; sku?: string | null; hasVariants: boolean; variants: ProductOption[];
  initialWishlisted: boolean; mobileStickyBar?: boolean; preview?: boolean;
  onVariantChange?: (variant: ProductOption | null) => void;
};

export default function ProductBuyBox({ productId, productName, basePrice, compareAtPrice, baseStock, sku, hasVariants, variants, initialWishlisted, mobileStickyBar = false, preview = false, onVariantChange }: Props) {
  const [activeVariant, setActiveVariant] = useState<ProductOption | null>(null);
  const [qty, setQty] = useState(1);
  const purchase = productPurchaseState(basePrice, baseStock, hasVariants, variants, activeVariant);
  const { minPrice, maxPrice, stock, canPurchase } = purchase;
  const needsOptions = hasVariants && !activeVariant;
  const cap = stock == null ? 999 : Math.max(0, stock);
  const quantity = cap === 0 ? 1 : Math.min(Math.max(1, qty), cap);
  const discount = compareAtPrice != null && compareAtPrice > maxPrice ? Math.round((1 - maxPrice / compareAtPrice) * 100) : null;
  const priceLabel = minPrice === maxPrice ? formatTTDPrice(minPrice) : `${formatTTDPrice(minPrice)} – ${formatTTDPrice(maxPrice)}`;
  const stockLabel = needsOptions ? "Choose options to see availability" : stock === 0 ? "Out of stock" : stock != null ? stock <= 10 ? `Only ${stock} left` : `${stock} available` : "Available to order";

  const cartButton = preview ? <button className={styles.previewCart} disabled title="Purchasing is disabled in this local design preview">{needsOptions ? "Select options" : stock === 0 ? "Out of stock" : "Add to cart"}</button> : <AddToCartButton productId={productId} productName={productName} variantId={activeVariant?.id} stock={stock} quantity={quantity} disabled={needsOptions} />;

  return <div id="product-options" className={styles.buyBox}>
    <div className={styles.priceRow} aria-live="polite">
      <strong>{priceLabel}</strong>
      {discount != null && <><del>{formatTTDPrice(compareAtPrice!)}</del><span>Save {discount}%</span></>}
    </div>
    <p className={styles.stock} data-unavailable={!canPurchase} aria-live="polite"><span />{stockLabel}</p>
    {hasVariants && variants.length > 0 && <VariantSelector variants={variants} onVariantChange={variant => { setActiveVariant(variant); setQty(1); onVariantChange?.(variant); }} />}
    {activeVariant?.name && <p className={styles.productCode}>Selected option <strong>{activeVariant.name}</strong></p>}
    {(activeVariant?.sku || sku) && <p className={styles.productCode}>Product code <strong>{activeVariant?.sku || sku}</strong></p>}
    <div className={styles.purchaseRow}>
      <div className={styles.quantity}><label htmlFor="product-quantity">Quantity</label><div>
        <button type="button" aria-label="Decrease quantity" disabled={!canPurchase || quantity <= 1} onClick={() => setQty(quantity - 1)}><Minus size={16} aria-hidden /></button>
        <input id="product-quantity" type="number" inputMode="numeric" min={1} max={Math.max(1, cap)} value={quantity} disabled={!canPurchase} onChange={event => setQty(Math.min(Math.max(1, Number.parseInt(event.target.value, 10) || 1), Math.max(1, cap)))} />
        <button type="button" aria-label="Increase quantity" disabled={!canPurchase || quantity >= cap} onClick={() => setQty(quantity + 1)}><Plus size={16} aria-hidden /></button>
      </div></div>
      <div className={styles.cartAction}>{cartButton}</div>
    </div>
    <div className={styles.saveRow}>{preview ? <button disabled><Heart size={17} aria-hidden />Save for later</button> : <WishlistButton productId={productId} initialWishlisted={initialWishlisted} variant="outline" />}<span><ShieldCheck size={15} aria-hidden />Secure checkout</span></div>
    {mobileStickyBar && <div className={styles.mobilePurchase}><div><small>{needsOptions ? "Choose your options" : quantity > 1 ? `${quantity} selected · price each` : "Your selection"}</small><strong>{minPrice !== maxPrice ? `From ${formatTTDPrice(minPrice)}` : formatTTDPrice(minPrice)}</strong></div>{needsOptions ? <a href="#product-options">Choose options<ArrowUpRight size={17} aria-hidden /></a> : <div className={`${styles.cartAction} ${styles.mobileCart}`}>{cartButton}</div>}</div>}
  </div>;
}
