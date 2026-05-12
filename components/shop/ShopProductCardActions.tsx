"use client";

import Link from "next/link";

import AddToCartButtonSimple from "@/components/shop/AddToCartButtonSimple";

export default function ShopProductCardActions({
  hasVariants,
  slug,
  productId,
}: {
  hasVariants: boolean;
  slug: string;
  productId: string;
}) {
  return hasVariants ? (
    <Link
      href={`/products/${slug}`}
      onClick={(e) => e.stopPropagation()}
      className="mt-2 flex w-full items-center justify-center rounded-lg border-2 border-[#1A7FB5] py-1.5 text-xs font-semibold text-[#1A7FB5] hover:bg-[#1A7FB5] hover:text-white transition-all"
    >
      Choose options
    </Link>
  ) : (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <AddToCartButtonSimple productId={productId} />
    </form>
  );
}
