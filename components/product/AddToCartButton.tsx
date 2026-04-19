"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { addToCart, getCart } from "@/app/actions/cart";
import type { CartItem } from "@/lib/cart/cart-store";
import { useCartStore } from "@/lib/cart/cart-store";

type Props = {
  productId: string;
  stock: number | null;
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
      store: row.product.store,
    },
  }));
}

export default function AddToCartButton({ productId, stock }: Props) {
  const router = useRouter();
  const setItems = useCartStore((s) => s.setItems);
  const openDrawer = useCartStore((s) => s.openDrawer);

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
    const result = await addToCart(productId);

    if (result.ok) {
      const rows = await getCart();
      setItems(mapRows(rows));
      setAdded(true);
      openDrawer();
    } else if (result.error === "not_logged_in") {
      router.push("/login");
    } else if (result.error === "out_of_stock") {
      setError("This item is out of stock");
    } else {
      setError("Could not add to cart");
    }
    setLoading(false);
  };

  if (stock === 0) {
    return (
      <button
        type="button"
        disabled
        className="h-12 w-full cursor-not-allowed rounded-xl bg-zinc-300 text-sm font-medium text-white"
      >
        Out of stock
      </button>
    );
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading}
        className={`h-12 w-full rounded-xl text-sm font-medium text-white transition-opacity ${
          added ? "bg-emerald-600" : "opacity-100"
        } ${loading && !added ? "opacity-75" : ""}`}
        style={added ? undefined : { backgroundColor: "#D4450A" }}
      >
        {loading ? "Adding..." : added ? "Added to cart ✓" : "Add to cart"}
      </button>
      {error ? <p className="mt-2 text-center text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
