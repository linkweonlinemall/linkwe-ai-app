"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, Minus, Plus } from "lucide-react";
import { useState } from "react";

import AddToCartButton from "@/components/product/AddToCartButton";
import ProductTrustSignals from "@/components/product/ProductTrustSignals";
import VariantSelector, { type VariantAttribute } from "@/components/product/VariantSelector";
import WishlistButton from "@/components/ui/WishlistButton";

type Variant = {
  id: string;
  name: string;
  attributes: VariantAttribute[];
  price: number | null;
  stock: number | null;
  images: string[];
};

export type PurchaseStoreSummary = {
  name: string;
  slug: string;
  logoUrl: string | null;
  region: string;
};

type DigitalMeta = {
  fileType: string | null;
  fileSizeKb: number | null;
  downloadLimit: number | null;
  licenceType: string | null;
};

type Props = {
  productId: string;
  productName: string;
  basePrice: number;
  compareAtPrice: number | null;
  baseStock: number | null;
  hasVariants: boolean;
  variants: Variant[];
  store: PurchaseStoreSummary;
  storeRegionLabel: string;
  allowDelivery: boolean;
  allowPickup: boolean;
  deliveryFeeSuffix?: string | null;
  isDigital: boolean;
  digitalMeta: DigitalMeta | null;
  initialWishlisted: boolean;
  /** Fixed bottom bar on small screens with price + add to cart */
  mobileStickyBar?: boolean;
};

export default function ProductBuyBox({
  productId,
  productName,
  basePrice,
  compareAtPrice,
  baseStock,
  hasVariants,
  variants,
  store,
  storeRegionLabel,
  allowDelivery,
  allowPickup,
  deliveryFeeSuffix,
  isDigital,
  digitalMeta,
  initialWishlisted,
  mobileStickyBar = false,
}: Props) {
  const [activeVariant, setActiveVariant] = useState<Variant | null>(null);
  const [allSelected, setAllSelected] = useState(!hasVariants);
  const [qty, setQty] = useState(1);

  const price = activeVariant?.price ?? basePrice;
  const stock = hasVariants ? (activeVariant?.stock ?? null) : baseStock;
  const cap = stock === null ? 999 : Math.max(0, stock);
  const effectiveQty = cap === 0 ? 1 : Math.min(Math.max(1, qty), cap);

  const discount =
    compareAtPrice && compareAtPrice > price ? Math.round((1 - price / compareAtPrice) * 100) : null;

  const stockStatus =
    stock === null || stock > 10
      ? { text: "In stock", dot: "bg-emerald-500" }
      : stock >= 1
        ? { text: `Only ${stock} left`, dot: "bg-amber-500" }
        : { text: "Out of stock", dot: "bg-red-500" };

  function setQuantity(next: number) {
    if (cap === 0) {
      setQty(1);
      return;
    }
    const v = Math.floor(next);
    setQty(Math.min(Math.max(1, Number.isNaN(v) ? 1 : v), cap));
  }

  return (
    <div id="product-options" className="flex w-full scroll-mt-24 flex-col font-sans">
      {/* 1 Price — duplicated in mobile sticky bar when enabled */}
      <div className={`mb-3 ${mobileStickyBar ? "max-md:hidden" : ""}`}>
        <p className="text-[36px] font-semibold leading-none tracking-tight text-[#D4450A]">
          TTD {price.toFixed(2)}
        </p>
        {compareAtPrice && compareAtPrice > price ? (
          <p className="mt-2 font-sans text-sm text-zinc-400 line-through">TTD {compareAtPrice.toFixed(2)}</p>
        ) : null}
        {discount != null ? (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 font-sans text-xs font-bold text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
            {discount}% off
          </p>
        ) : null}
      </div>

      {/* 2 Stock */}
      <div className="mb-6 flex items-center gap-2 font-sans text-sm text-zinc-700">
        <span className={`size-2 shrink-0 rounded-full ${stockStatus.dot}`} aria-hidden />
        {stockStatus.text}
      </div>

      {/* 3–4 Variants */}
      {hasVariants && variants.length > 0 ? (
        <VariantSelector
          variants={variants}
          onVariantChange={(variant, allSel) => {
            setActiveVariant(variant);
            setAllSelected(allSel);
          }}
        />
      ) : null}

      {/* 5 Quantity */}
      <div className="mb-4 w-full min-w-0">
        <label
          htmlFor="product-qty-pdp"
          className="mb-2 block font-sans text-xs font-semibold uppercase tracking-wide text-zinc-500"
        >
          Quantity
        </label>
        <div className="flex h-12 w-full min-w-0 overflow-hidden rounded-md border border-gray-300 bg-white">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={cap === 0 || effectiveQty <= 1}
            className="flex h-12 w-12 shrink-0 items-center justify-center text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setQuantity(effectiveQty - 1)}
          >
            <Minus className="size-4" strokeWidth={2} aria-hidden />
          </button>
          <input
            id="product-qty-pdp"
            type="number"
            inputMode="numeric"
            min={1}
            max={cap === 0 ? 1 : cap}
            value={effectiveQty}
            disabled={cap === 0}
            onChange={(e) => {
              const raw = Number.parseInt(e.target.value, 10);
              if (Number.isNaN(raw)) {
                setQty(1);
                return;
              }
              setQuantity(raw);
            }}
            className="min-w-0 flex-1 border-0 bg-transparent text-center font-sans text-base font-semibold tabular-nums text-zinc-900 outline-none [appearance:textfield] focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={cap === 0 || effectiveQty >= cap}
            className="flex h-12 w-12 shrink-0 items-center justify-center text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setQuantity(effectiveQty + 1)}
          >
            <Plus className="size-4" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>

      {/* 6 Add to cart */}
      <div className={`mb-3 w-full min-w-0 ${mobileStickyBar ? "max-md:hidden" : ""}`}>
        <AddToCartButton
          productId={productId}
          productName={productName}
          variantId={activeVariant?.id}
          stock={stock}
          quantity={effectiveQty}
          disabled={hasVariants && !allSelected}
        />
      </div>

      {mobileStickyBar ? (
        <div className="fixed bottom-[calc(60px+env(safe-area-inset-bottom,0px))] left-0 right-0 z-50 border-t border-zinc-200 bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:hidden">
          <div className="mx-auto flex w-full items-center gap-4 px-8">
            <p className="shrink-0 text-base font-medium text-[#D4450A]">TTD {price.toFixed(2)}</p>
            <div className="min-w-0 flex-1">
              <AddToCartButton
                productId={productId}
                productName={productName}
                variantId={activeVariant?.id}
                stock={stock}
                quantity={effectiveQty}
                disabled={hasVariants && !allSelected}
              />
            </div>
          </div>
        </div>
      ) : null}

      {mobileStickyBar && hasVariants && variants.length > 0 && !allSelected ? (
        <a
          href="#product-options"
          className="fixed bottom-[calc(132px+env(safe-area-inset-bottom,0px))] right-4 z-50 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1C1C1A] px-4 text-xs font-semibold text-white shadow-lg md:hidden"
        >
          Choose options
          <ChevronDown className="size-4" strokeWidth={2} aria-hidden />
        </a>
      ) : null}

      {isDigital && digitalMeta ? (
        <div className="mb-6 space-y-2 border-t border-gray-200 pt-4 font-sans text-sm text-zinc-600">
          <p>Instant digital download</p>
          {digitalMeta.fileType ? (
            <p>
              {digitalMeta.fileType.toUpperCase()} file
              {digitalMeta.fileSizeKb != null
                ? ` · ${
                    digitalMeta.fileSizeKb >= 1024
                      ? `${(digitalMeta.fileSizeKb / 1024).toFixed(1)} MB`
                      : `${digitalMeta.fileSizeKb} KB`
                  }`
                : ""}
            </p>
          ) : null}
          {digitalMeta.downloadLimit != null ? (
            <p>
              {digitalMeta.downloadLimit} download{digitalMeta.downloadLimit > 1 ? "s" : ""} included
            </p>
          ) : null}
          {digitalMeta.licenceType ? (
            <p>
              {digitalMeta.licenceType === "PERSONAL"
                ? "Personal use licence"
                : digitalMeta.licenceType === "COMMERCIAL"
                  ? "Commercial use licence"
                  : "Extended commercial licence"}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* 7 Save */}
      <div className="mb-6 w-full">
        <WishlistButton productId={productId} initialWishlisted={initialWishlisted} variant="outline" />
      </div>

      {/* 8 Trust */}
      <div className="mb-6 border-t border-gray-200 pt-6">
        <ProductTrustSignals
          allowPickup={Boolean(allowPickup) && !isDigital}
          allowDelivery={Boolean(allowDelivery) && !isDigital}
          deliveryFeeSuffix={allowDelivery && !isDigital ? deliveryFeeSuffix ?? null : null}
        />
      </div>

      {/* 9 Sold by */}
      <div className="mb-4 border-t border-gray-200 pt-6">
        <p className="mb-3 font-sans text-xs font-semibold uppercase tracking-wide text-zinc-500">Sold by</p>
        <div className="mb-4 flex gap-3">
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.logoUrl}
              alt=""
              className="size-10 shrink-0 rounded-full border border-gray-100 object-cover"
            />
          ) : (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gray-100 bg-orange-50 text-sm font-bold text-[#D4450A]">
              {store.name[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-sans text-base font-semibold text-zinc-900">{store.name}</p>
            <p className="mt-0.5 font-sans text-[13px] text-zinc-500">{storeRegionLabel}</p>
          </div>
        </div>
      </div>

      <Link
        href={`/store/${store.slug}`}
        className="flex h-11 w-full min-w-0 items-center justify-between rounded-md border border-gray-300 bg-white px-4 font-sans text-sm font-semibold text-zinc-900 transition-colors hover:border-gray-400"
      >
        Visit store
        <ChevronRight className="size-4 shrink-0 text-zinc-500" strokeWidth={2} aria-hidden />
      </Link>
    </div>
  );
}
