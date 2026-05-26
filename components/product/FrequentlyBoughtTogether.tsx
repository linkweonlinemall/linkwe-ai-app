"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { addToCart, getCart } from "@/app/actions/cart";
import type { CartItem } from "@/lib/cart/cart-store";
import { useCartStore } from "@/lib/cart/cart-store";

type Item = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
};

function mapCartRows(rows: Awaited<ReturnType<typeof getCart>>): CartItem[] {
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

export default function FrequentlyBoughtTogether({ items }: { items: Item[] }) {
  const router = useRouter();
  const setItems = useCartStore((s) => s.setItems);
  const openDrawer = useCartStore((s) => s.openDrawer);

  const [picked, setPicked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((p) => [p.id, true])),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickedList = useMemo(() => items.filter((p) => picked[p.id]), [items, picked]);

  const total = pickedList.reduce((s, p) => s + p.price, 0);
  const pickedCount = pickedList.length;

  async function handleAddTogether() {
    if (pickedCount === 0) return;
    setError(null);
    setLoading(true);
    try {
      for (const p of pickedList) {
        const r = await addToCart(p.id, 1, null);
        if (!r.ok) {
          if (r.error === "not_logged_in") {
            router.push("/login");
            return;
          }
          setError(r.error === "out_of_stock" ? `${p.name} is out of stock` : `Could not add ${p.name}`);
          return;
        }
      }
      const rows = await getCart();
      setItems(mapCartRows(rows));
      openDrawer();
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 font-sans shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-900">Frequently bought together</h2>
      <ul className="mt-5 space-y-4">
        {items.map((p) => {
          const inputId = `fbt-${p.id}`;
          return (
            <li key={p.id} className="flex gap-3">
              <input
                id={inputId}
                type="checkbox"
                checked={picked[p.id] ?? false}
                onChange={(e) => setPicked((prev) => ({ ...prev, [p.id]: e.target.checked }))}
                className="mt-5 size-[18px] shrink-0 rounded border-zinc-300 text-[#D4450A] focus:ring-[#D4450A]"
              />
              <Link
                href={`/products/${p.slug}`}
                className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-zinc-100"
              >
                {p.images[0] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-300">—</div>
                )}
              </Link>
              <div className="min-w-0 flex-1 py-1">
                <label htmlFor={inputId} className="block cursor-pointer">
                  <span className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900">
                    {p.name}
                  </span>
                </label>
                <Link href={`/products/${p.slug}`} className="mt-1 inline-block text-xs font-medium text-[#D4450A] hover:underline">
                  View product
                </Link>
                <div className="mt-2 flex flex-wrap items-baseline gap-2">
                  <span className="text-base font-black text-[#D4450A]">TTD {p.price.toFixed(2)}</span>
                  {p.compareAtPrice && p.compareAtPrice > p.price ? (
                    <span className="text-xs text-zinc-400 line-through">TTD {p.compareAtPrice.toFixed(2)}</span>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 border-t border-zinc-100 pt-5">
        <button
          type="button"
          disabled={loading || pickedCount === 0}
          onClick={() => void handleAddTogether()}
          className="h-11 w-full rounded-xl bg-[#D4450A] text-sm font-bold text-white transition-opacity hover:opacity-92 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:opacity-70"
        >
          {loading
            ? "Adding…"
            : `Add ${pickedCount || "—"} to cart — TTD ${total.toFixed(2)}`}
        </button>
        {error ? <p className="mt-2 text-center text-xs text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
