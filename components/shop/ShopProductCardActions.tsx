"use client";

import Link from "next/link";

import AddToCartButtonSimple from "@/components/shop/AddToCartButtonSimple";

export default function ShopProductCardActions({
  hasVariants,
  isDigital,
  slug,
  productId,
  productName,
}: {
  hasVariants: boolean;
  isDigital: boolean;
  slug: string;
  productId: string;
  productName: string;
}) {
  return hasVariants ? (
    <Link
      href={`/products/${slug}`}
      onClick={(e) => e.stopPropagation()}
      className="mt-2 flex min-h-[44px] w-full items-center justify-center rounded-lg border-2 border-[#1A7FB5] py-1.5 text-xs font-semibold text-[#1A7FB5] transition-colors duration-200 ease-in-out hover:bg-[#1A7FB5] hover:text-white"
    >
      Choose options
    </Link>
  ) : isDigital ? (
    <Link
      href={`/products/${slug}`}
      onClick={(e) => e.stopPropagation()}
      className="mt-2 flex min-h-[44px] w-full items-center justify-center rounded-lg border-2 border-[#1A7FB5] py-1.5 text-xs font-semibold text-[#1A7FB5] transition-colors duration-200 ease-in-out hover:bg-[#1A7FB5] hover:text-white"
    >
      ⬇️ Buy & Download
    </Link>
  ) : (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <AddToCartButtonSimple productId={productId} productName={productName} />
    </form>
  );
}
