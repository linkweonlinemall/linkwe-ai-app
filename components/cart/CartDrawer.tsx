"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { getCart, removeFromCart, updateCartQuantity } from "@/app/actions/cart";
import type { CartItem } from "@/lib/cart/cart-store";
import { useCartStore } from "@/lib/cart/cart-store";

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

export default function CartDrawer() {
  const items = useCartStore((s) => s.items);
  const isOpen = useCartStore((s) => s.isOpen);
  const closeDrawer = useCartStore((s) => s.closeDrawer);
  const setItems = useCartStore((s) => s.setItems);

  const [busyProductId, setBusyProductId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const rows = await getCart();
    setItems(mapRows(rows));
  }, [setItems]);

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const subtotalVal = useMemo(
    () => items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    [items],
  );

  const onQty = async (productId: string, nextQty: number) => {
    setBusyProductId(productId);
    await updateCartQuantity(productId, nextQty);
    await refresh();
    setBusyProductId(null);
  };

  const onRemove = async (productId: string) => {
    setBusyProductId(productId);
    await removeFromCart(productId);
    await refresh();
    setBusyProductId(null);
  };

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          aria-label="Close cart"
          className="fixed inset-0 z-40 bg-black/40"
          onClick={closeDrawer}
        />
      ) : null}

      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none"
        }`}
      >
        <header className="flex items-center justify-between border-b border-zinc-100 px-4 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Your cart</h2>
            <p className="text-xs font-medium" style={{ color: "#D4450A" }}>
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-zinc-300"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <p className="mt-4 text-sm text-zinc-500">Your cart is empty</p>
              <p className="mt-1 text-xs text-zinc-400">Browse stores to find products</p>
              <Link
                href="/"
                className="mt-4 text-sm font-medium"
                style={{ color: "#D4450A" }}
                onClick={closeDrawer}
              >
                Start shopping →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 px-4 py-2">
              {items.map((item) => {
                const busy = busyProductId === item.productId;
                const img = item.product.images[0];

                return (
                  <li key={item.id} className={`flex gap-3 py-4 ${busy ? "opacity-60" : ""}`}>
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900">{item.product.name}</p>
                      <p className="text-xs text-zinc-400">{item.product.store.name}</p>
                      <p className="mt-1 text-sm text-zinc-900">
                        TTD {item.product.price.toFixed(2)}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onQty(item.productId, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                        >
                          −
                        </button>
                        <span className="min-w-[1.5rem] text-center text-sm">{item.quantity}</span>
                        <button
                          type="button"
                          disabled={
                            busy ||
                            (item.product.stock !== null && item.quantity >= item.product.stock)
                          }
                          onClick={() => void onQty(item.productId, item.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onRemove(item.productId)}
                        className="mt-1 text-xs text-zinc-400 hover:text-red-500 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="border-t border-zinc-200 p-4">
          <div className="flex justify-between text-sm font-medium text-zinc-900">
            <span>Subtotal</span>
            <span>TTD {subtotalVal.toFixed(2)}</span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">Shipping calculated at checkout</p>

          <Link
            href="/cart"
            onClick={closeDrawer}
            className="mt-3 flex w-full items-center justify-center rounded-xl border-2 border-[#D4450A] py-3 text-sm font-medium text-[#D4450A] transition-colors hover:bg-[#fff5f0]"
          >
            View cart
          </Link>

          <Link
            href="/checkout"
            onClick={closeDrawer}
            className="mt-2 flex w-full items-center justify-center rounded-xl py-3 text-sm font-medium text-white"
            style={{ backgroundColor: "#D4450A" }}
          >
            Checkout
          </Link>
        </footer>
      </aside>
    </>
  );
}
