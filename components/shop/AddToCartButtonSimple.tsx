"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { addToCart, getCart } from "@/app/actions/cart";
import InlineSpinner from "@/components/ui/InlineSpinner";
import type { CartItem } from "@/lib/cart/cart-store";
import { useCartStore } from "@/lib/cart/cart-store";
import { toastAddedToCart } from "@/lib/feedback/toasts";

function mapRows(rows: Awaited<ReturnType<typeof getCart>>): CartItem[] {
  return rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    quantity: row.quantity,
    product: {
      id: row.product.id,
      name: row.product.name,
      slug: row.product.slug,
      price: row.product.price,
      images: row.product.images,
      stock: row.product.stock,
      store: row.product.store,
    },
    variant: row.variant
      ? {
          id: row.variant.id,
          name: row.variant.name,
          price: row.variant.price,
          attributes: row.variant.attributes as { name: string; value: string; hex?: string }[],
        }
      : null,
  }));
}

export default function AddToCartButtonSimple({ productId, productName }: { productId: string; productName: string }) {
  const router = useRouter();
  const setItems = useCartStore((s) => s.setItems);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const bumpCartIcon = useCartStore((s) => s.bumpCartIcon);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    const result = await addToCart(productId, 1);
    if (result.ok) {
      const rows = await getCart();
      setItems(mapRows(rows));
      setAdded(true);
      toastAddedToCart(productName);
      bumpCartIcon();
      openDrawer();
      setTimeout(() => setAdded(false), 2000);
    } else if (result.error === "not_logged_in") {
      router.push("/login");
    }
    setLoading(false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`mt-1.5 flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-lg px-1 py-1.5 text-[10px] font-semibold text-white transition-all duration-200 ease-in-out disabled:opacity-60 sm:mt-2 sm:min-h-[44px] sm:gap-2 sm:text-xs ${
        added ? "bg-emerald-600" : "bg-[#D4450A] hover:bg-[#B83A09]"
      }`}
    >
      {loading ? (
        <>
          <InlineSpinner className="h-3.5 w-3.5 text-white" />
          Adding…
        </>
      ) : added ? (
        "Added ✓"
      ) : (
        "Add to cart"
      )}
    </button>
  );
}
