"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { addToCart } from "@/app/actions/cart";
import { icn } from "@/lib/iconography";
import { Package } from "lucide-react";
import { formatTTDPrice } from "@/lib/format/price";

export type CartRecommendation = {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  store: { name: string; slug: string };
};

type Props = {
  products: CartRecommendation[];
};

export default function CartRecommendationsRow({ products }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (products.length === 0) return null;

  function handleAdd(productId: string) {
    setError(null);
    setPendingId(productId);
    startTransition(async () => {
      const res = await addToCart(productId, 1);
      setPendingId(null);
      if (!res.ok) {
        if (res.error === "not_logged_in") {
          setError("Sign in to add items.");
          return;
        }
        setError("Could not add — try again or open the product page.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="mt-10 font-sans">
      <h2 className="mb-4 text-lg font-bold text-[#1C1C1A]">You might also like</h2>
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="flex flex-col overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm transition hover:shadow-md"
          >
            <Link href={`/products/${p.slug}`} className="relative aspect-square bg-zinc-100">
              {p.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Package className={`${icn.ui} text-zinc-300`} aria-hidden strokeWidth={2} />
                </div>
              )}
            </Link>
            <div className="flex min-h-0 flex-1 flex-col p-3">
              <Link
                href={`/products/${p.slug}`}
                className="line-clamp-2 text-sm font-semibold text-[#1C1C1A] hover:text-[#D4450A]"
              >
                {p.name}
              </Link>
              <Link href={`/store/${p.store.slug}`} className="mt-1 line-clamp-1 text-xs text-zinc-500 hover:text-[#D4450A]">
                {p.store.name}
              </Link>
              <p className="mt-auto pt-2 text-sm font-bold text-[#D4450A]">{formatTTDPrice(p.price)}</p>
              <button
                type="button"
                onClick={() => handleAdd(p.id)}
                disabled={isPending && pendingId === p.id}
                className="mt-2 w-full rounded-lg border border-[#D4450A] bg-[#D4450A] py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isPending && pendingId === p.id ? "Adding…" : "Add to cart"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
