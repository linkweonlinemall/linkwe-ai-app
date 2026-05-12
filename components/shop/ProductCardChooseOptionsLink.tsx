"use client";

import Link from "next/link";

/** Client-only: stopPropagation avoids bubbling when the card has other click handlers. */
export default function ProductCardChooseOptionsLink({ slug }: { slug: string }) {
  return (
    <Link
      href={`/products/${slug}`}
      onClick={(e) => e.stopPropagation()}
      className="mt-2 flex w-full items-center justify-center rounded-lg border border-zinc-200 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
    >
      Choose options
    </Link>
  );
}
