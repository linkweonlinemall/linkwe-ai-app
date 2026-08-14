"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconShoppingCartPlus } from "@tabler/icons-react";

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

type Props = {
  productId: string;
  productName: string;
  hasVariants?: boolean;
  slug: string;
};

export default function StoreCompactCartButton({
  productId,
  productName,
  hasVariants,
  slug,
}: Props) {
  const router = useRouter();
  const setItems = useCartStore((s) => s.setItems);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const bumpCartIcon = useCartStore((s) => s.bumpCartIcon);
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasVariants) {
      router.push(`/products/${slug}`);
      return;
    }
    setLoading(true);
    const result = await addToCart(productId, 1);
    if (result.ok) {
      const rows = await getCart();
      setItems(mapRows(rows));
      toastAddedToCart(productName);
      bumpCartIcon();
      openDrawer();
    } else if (result.error === "not_logged_in") {
      router.push("/login");
    }
    setLoading(false);
  };

  return (
    <button
      type="button"
      onClick={(e) => void handleClick(e)}
      disabled={loading}
      aria-label={hasVariants ? "Choose options" : "Add to cart"}
      className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#FEF0EB] text-[#D4450A] transition hover:bg-[#FDE4D8] disabled:opacity-60"
    >
      {loading ? (
        <InlineSpinner className="h-3.5 w-3.5 text-[#D4450A]" />
      ) : (
        <IconShoppingCartPlus className="size-4" stroke={1.75} aria-hidden />
      )}
    </button>
  );
}
