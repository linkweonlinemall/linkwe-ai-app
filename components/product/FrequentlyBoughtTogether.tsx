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

function PlusDivider() {
  return (
    <span
      className="flex shrink-0 items-center justify-center self-center px-1 text-2xl font-light text-[var(--text-muted)] md:px-2"
      aria-hidden
    >
      +
    </span>
  );
}

function EqualsDivider() {
  return (
    <span
      className="flex shrink-0 items-center justify-center self-center px-1 text-2xl font-light text-[var(--text-muted)] md:px-2"
      aria-hidden
    >
      =
    </span>
  );
}

function FbtProductCard({
  item,
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  item: Item;
  label?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  const inputId = `fbt-${item.id}`;

  return (
    <div className="relative flex w-full min-w-0 flex-col items-center text-center md:w-[140px] md:shrink-0">
      <div className="absolute left-0 top-0 z-10 md:left-1 md:top-1">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="size-[18px] rounded border-zinc-300 text-[#D4450A] focus:ring-[#D4450A] disabled:cursor-default"
          aria-label={label ? `${label}: ${item.name}` : item.name}
        />
      </div>
      {label ? (
        <p className="mb-1.5 w-full text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </p>
      ) : (
        <div className="mb-1.5 h-[14px] w-full" aria-hidden />
      )}
      <Link
        href={`/products/${item.slug}`}
        className="block h-[120px] w-[120px] shrink-0 overflow-hidden rounded-lg bg-zinc-100"
      >
        {item.images[0] ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={item.images[0]} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-300">—</div>
        )}
      </Link>
      <Link href={`/products/${item.slug}`} className="mt-2 block w-full min-w-0 px-1">
        <span className="line-clamp-2 text-[12px] leading-snug text-[var(--text-primary)]">{item.name}</span>
      </Link>
      <p className="mt-1.5 text-[13px] font-medium text-[#D4450A]">TTD {item.price.toFixed(2)}</p>
    </div>
  );
}

export default function FrequentlyBoughtTogether({
  currentProduct,
  items,
}: {
  currentProduct: Item;
  items: Item[];
}) {
  const router = useRouter();
  const setItems = useCartStore((s) => s.setItems);
  const openDrawer = useCartStore((s) => s.openDrawer);

  const [picked, setPicked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((p) => [p.id, true])),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickedList = useMemo(() => items.filter((p) => picked[p.id]), [items, picked]);

  const total = currentProduct.price + pickedList.reduce((s, p) => s + p.price, 0);
  const selectedCount = 1 + pickedList.length;

  async function handleAddTogether() {
    setError(null);
    setLoading(true);
    try {
      const toAdd = [currentProduct, ...pickedList];
      for (const p of toAdd) {
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
    <div className="rounded-[12px] border-[0.5px] border-[var(--color-border-tertiary)] bg-white p-5 font-sans">
      <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-900">Frequently bought together</h2>

      <div className="mt-5 flex flex-col items-stretch gap-3 md:flex-row md:flex-wrap md:items-center md:justify-start md:gap-2">
        <FbtProductCard item={currentProduct} label="This item" checked disabled />

        {items.map((p) => (
          <div key={p.id} className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
            <PlusDivider />
            <FbtProductCard
              item={p}
              checked={picked[p.id] ?? false}
              onCheckedChange={(next) => setPicked((prev) => ({ ...prev, [p.id]: next }))}
            />
          </div>
        ))}

        <div className="hidden md:flex md:items-center">
          <EqualsDivider />
        </div>
      </div>

      <div className="mt-5 border-t border-[var(--color-border-tertiary)] pt-5">
        <p className="text-[12px] text-[var(--text-muted)]">
          {selectedCount} item{selectedCount === 1 ? "" : "s"} selected
        </p>
        <p className="mt-1 text-base font-medium text-[var(--text-primary)]">TTD {total.toFixed(2)}</p>
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleAddTogether()}
          className="mt-4 flex h-11 w-full items-center justify-center rounded-lg bg-[#D4450A] text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:opacity-70"
        >
          {loading ? "Adding…" : "Add all to cart"}
        </button>
        {error ? <p className="mt-2 text-center text-xs text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
