"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { addToCart, getCart } from "@/app/actions/cart";
import InlineSpinner from "@/components/ui/InlineSpinner";
import type { CartItem } from "@/lib/cart/cart-store";
import { useCartStore } from "@/lib/cart/cart-store";
import { toastAddedToCart } from "@/lib/feedback/toasts";

type Props = {
  productId: string;
  productName: string;
  stock: number | null;
  /** Number of units to add in one action (default 1). */
  quantity?: number;
  variantId?: string;
  disabled?: boolean;
};

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
      isDigital: row.product.isDigital,
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

export default function AddToCartButton({
  productId,
  productName,
  stock,
  quantity = 1,
  variantId,
  disabled,
}: Props) {
  const router = useRouter();
  const setItems = useCartStore((s) => s.setItems);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const bumpCartIcon = useCartStore((s) => s.bumpCartIcon);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 2000);
    return () => clearTimeout(t);
  }, [added]);

  const handleClick = async () => {
    setError(null);
    setLoading(true);
    const result = await addToCart(productId, quantity, variantId);

    if (result.ok) {
      const rows = await getCart();
      setItems(mapRows(rows));
      setAdded(true);
      toastAddedToCart(productName);
      bumpCartIcon();
      openDrawer();
    } else if (result.error === "not_logged_in") {
      router.push("/login");
    } else if (result.error === "out_of_stock") {
      setError("This item is out of stock");
    } else if (result.error === "variant_required") {
      setError("Please select a variant");
    } else {
      setError("Could not add to cart");
    }
    setLoading(false);
  };

  const baseBtn =
    "font-sans flex h-14 w-full items-center justify-center whitespace-nowrap rounded-md text-base font-semibold transition-all duration-200 ease-in-out";

  if (disabled) {
    return (
      <button type="button" disabled className={`${baseBtn} cursor-not-allowed bg-gray-300 text-zinc-600`}>
        Select options
      </button>
    );
  }

  if (stock === 0) {
    return (
      <button type="button" disabled className={`${baseBtn} cursor-not-allowed bg-gray-300 text-white`}>
        Out of stock
      </button>
    );
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading || Boolean(disabled)}
        className={`${baseBtn} text-white ${
          added ? "bg-emerald-600" : "bg-[#D4450A] hover:opacity-[0.97]"
        } ${loading && !added ? "opacity-90" : ""}`}
      >
        {loading ? (
          <>
            <InlineSpinner className="mr-2 h-4 w-4 text-white" />
            Adding…
          </>
        ) : added ? (
          "Added to cart ✓"
        ) : (
          "Add to cart"
        )}
      </button>
      {error ? <p className="mt-2 text-center font-sans text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
