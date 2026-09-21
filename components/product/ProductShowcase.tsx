"use client";
import { useState, type ReactNode } from "react";
import { ProductGallery } from "./ProductGallery";
import ProductBuyBox from "./ProductBuyBox";
import type { ProductOption } from "@/lib/product/display";
import styles from "./product.module.css";

type Props = {
  productId: string; name: string; images: string[]; price: number; compareAtPrice: number | null;
  stock: number | null; sku: string | null; hasVariants: boolean; variants: ProductOption[];
  heading: ReactNode; afterPurchase: ReactNode; wishlisted: boolean; preview?: boolean;
};
export default function ProductShowcase({ productId, name, images, price, compareAtPrice, stock, sku, hasVariants, variants, heading, afterPurchase, wishlisted, preview = false }: Props) {
  const [activeVariant, setActiveVariant] = useState<ProductOption | null>(null);
  const galleryImages = activeVariant?.images.length ? [...activeVariant.images, ...images] : images;
  return <div className={styles.showcase}>
    <div className={styles.galleryColumn}><ProductGallery key={activeVariant?.id ?? productId} images={galleryImages} name={name} /></div>
    <div className={styles.summary}>
      {heading}
      <ProductBuyBox productId={productId} productName={name} basePrice={price} compareAtPrice={compareAtPrice} baseStock={stock} sku={sku} hasVariants={hasVariants} variants={variants} initialWishlisted={wishlisted} onVariantChange={setActiveVariant} preview={preview} mobileStickyBar />
      {afterPurchase}
    </div>
  </div>;
}
