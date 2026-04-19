"use client";

import { useEffect } from "react";

import { getCart } from "@/app/actions/cart";
import type { CartItem } from "@/lib/cart/cart-store";
import { useCartStore } from "@/lib/cart/cart-store";

import CartDrawer from "./CartDrawer";

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const setItems = useCartStore((s) => s.setItems);

  useEffect(() => {
    void getCart().then((rows) => {
      const items: CartItem[] = rows.map((row) => ({
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
      setItems(items);
    });
  }, [setItems]);

  return (
    <>
      {children}
      <CartDrawer />
    </>
  );
}
