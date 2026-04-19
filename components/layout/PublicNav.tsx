"use client";

import Link from "next/link";

import { useCartStore } from "@/lib/cart/cart-store";

export default function PublicNav() {
  const toggleDrawer = useCartStore((s) => s.toggleDrawer);
  const itemCount = useCartStore((s) => s.itemCount());

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight" style={{ color: "#D4450A" }}>
          LinkWe
        </Link>

        <button
          type="button"
          onClick={toggleDrawer}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white transition-colors hover:bg-zinc-50"
          aria-label="Open cart"
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
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>

          {itemCount > 0 ? (
            <span
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: "#D4450A" }}
            >
              {itemCount > 9 ? "9+" : itemCount}
            </span>
          ) : null}
        </button>
      </div>
    </header>
  );
}
