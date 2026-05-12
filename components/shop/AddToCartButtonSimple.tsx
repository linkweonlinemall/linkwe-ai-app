"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addToCart, getCart } from "@/app/actions/cart";
import { useCartStore } from "@/lib/cart/cart-store";
import type { CartItem } from "@/lib/cart/cart-store";

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

export default function AddToCartButtonSimple({ productId }: { productId: string }) {
  const router = useRouter();
  const setItems = useCartStore((s) => s.setItems);
  const openDrawer = useCartStore((s) => s.openDrawer);
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
      className={`mt-2 w-full rounded-lg py-1.5 text-xs font-semibold text-white transition-all disabled:opacity-60 ${
        added ? "bg-emerald-600" : "bg-[#D4450A] hover:opacity-90"
      }`}
    >
      {loading ? "Adding..." : added ? "Added ✓" : "Add to cart"}
    </button>
  );
}
