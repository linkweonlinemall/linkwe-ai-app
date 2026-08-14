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
      const items: CartItem[] = (rows ?? []).map((row) => ({
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
              attributes: row.variant.attributes as {
                name: string;
                value: string;
                hex?: string;
              }[],
            }
          : null,
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
