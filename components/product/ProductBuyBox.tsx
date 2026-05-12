"use client";

import { useState } from "react";

import AddToCartButton from "@/components/product/AddToCartButton";
import VariantSelector from "@/components/product/VariantSelector";

type Variant = {
  id: string;
  name: string;
  attributes: any[];
  price: number | null;
  stock: number | null;
  images: string[];
};

type Props = {
  productId: string;
  basePrice: number;
  compareAtPrice: number | null;
  baseStock: number | null;
  hasVariants: boolean;
  variants: Variant[];
  onImageChange?: (url: string) => void;
};

export default function ProductBuyBox({
  productId,
  basePrice,
  compareAtPrice,
  baseStock,
  hasVariants,
  variants,
}: Props) {
  const [activeVariant, setActiveVariant] = useState<Variant | null>(null);
  const [allSelected, setAllSelected] = useState(!hasVariants);

  const price = activeVariant?.price ?? basePrice;
  const stock = hasVariants ? (activeVariant?.stock ?? null) : baseStock;
  const discount =
    compareAtPrice && compareAtPrice > price ? Math.round((1 - price / compareAtPrice) * 100) : null;

  const stockStatus =
    stock === null || stock > 10
      ? { text: "In stock", color: "text-emerald-600", dot: "bg-emerald-500" }
      : stock >= 1
        ? { text: `Only ${stock} left`, color: "text-amber-600", dot: "bg-amber-500" }
        : { text: "Out of stock", color: "text-red-600", dot: "bg-red-500" };

  return (
    <div className="flex flex-col gap-5">
      {/* Price block */}
      <div>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-4xl font-black tracking-tight" style={{ color: "#D4450A" }}>
            TTD {price.toFixed(2)}
          </span>
          {compareAtPrice && compareAtPrice > price ? (
            <span className="text-base text-zinc-400 line-through">TTD {compareAtPrice.toFixed(2)}</span>
          ) : null}
        </div>
        {discount != null ? (
          <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-emerald-700">{discount}% off</span>
          </div>
        ) : null}
      </div>

      {/* Stock badge */}
      <div
        className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold
    ${
      stockStatus.text === "In stock"
        ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
        : stockStatus.text === "Out of stock"
          ? "border border-red-100 bg-red-50 text-red-700"
          : "border border-amber-100 bg-amber-50 text-amber-700"
    }`}
      >
        <span className={`h-2 w-2 rounded-full ${stockStatus.dot}`} />
        {stockStatus.text}
      </div>

      {/* Divider */}
      <div className="h-px bg-zinc-100" />

      {/* Variant selector */}
      {hasVariants && variants.length > 0 ? (
        <VariantSelector
          variants={variants}
          onVariantChange={(variant, allSel) => {
            setActiveVariant(variant);
            setAllSelected(allSel);
          }}
        />
      ) : null}

      {/* Add to cart */}
      <AddToCartButton
        productId={productId}
        variantId={activeVariant?.id}
        stock={stock}
        disabled={hasVariants && !allSelected}
      />
    </div>
  );
}
