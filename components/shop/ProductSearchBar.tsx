"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { getRegionLabel } from "@/lib/regions/tt-regions";
import { NotificationRowSkeleton } from "@/components/ui/content-skeletons";
import Skeleton from "@/components/ui/skeleton";

type ProductResult = {
  id: string
  name: string
  slug: string
  price: number
  compareAtPrice: number | null
  images: string[]
  category: string | null
  stock: number | null
  brand: string | null
  store: { name: string; slug: string; region: string | null }
}

type Props = {
  defaultValue?: string
  category?: string
}

export default function ProductSearchBar({ defaultValue = "", category = "" }: Props) {
  const [query, setQuery] = useState(defaultValue)
  const [results, setResults] = useState<ProductResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function focusShopSearch(): void {
      if (typeof window === "undefined") return;
      if (window.location.hash !== "#shop-search") return;
      window.setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        inputRef.current?.focus();
      }, 100);
    }

    focusShopSearch();
    window.addEventListener("hashchange", focusShopSearch);
    return () => window.removeEventListener("hashchange", focusShopSearch);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setShowDropdown(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setShowDropdown(true);
      try {
        const params = new URLSearchParams({ q: query })
        if (category && category !== "all") params.set("category", category)
        const res = await fetch(`/api/products/search?${params}`)
        const data = await res.json()
        setResults(data)
        setShowDropdown(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, category])

  function handleSearch() {
    if (query.trim()) {
      const params = new URLSearchParams({ q: query })
      if (category && category !== "all") params.set("category", category)
      window.location.href = `/shop?${params}`
    }
  }

  return (
    <div
      id="shop-search"
      ref={containerRef}
      className="relative w-full scroll-mt-[calc(3.5rem+env(safe-area-inset-top,0px))]"
    >
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search products..."
            className="min-h-[44px] w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 pr-10 text-base focus:border-[#D4450A] focus:outline-none md:min-h-0 md:text-sm"
          />
          {loading ? (
            <div className="absolute top-1/2 right-3 -translate-y-1/2">
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="min-h-[44px] shrink-0 rounded-xl bg-[#D4450A] px-5 py-2.5 text-base font-medium whitespace-nowrap text-white hover:opacity-90 md:min-h-0 md:text-sm"
        >
          Search
        </button>
      </div>

      {showDropdown && loading && query.trim() ? (
        <div
          className="absolute top-full right-0 left-0 z-[200] mt-2 overflow-hidden rounded-xl
            border border-zinc-200 bg-white shadow-2xl"
        >
          <div className="border-b border-zinc-100 bg-zinc-50 px-3 py-2">
            <p className="text-xs font-medium text-zinc-400">Searching…</p>
          </div>
          <div className="divide-y divide-zinc-50 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <NotificationRowSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : null}

      {showDropdown && !loading && results.length > 0 && (
        <div
          className="absolute top-full right-0 left-0 z-[200] mt-2 overflow-hidden rounded-xl
            border border-zinc-200 bg-white shadow-2xl"
        >
          <div className="border-b border-zinc-100 bg-zinc-50 px-3 py-2">
            <p className="text-xs font-medium text-zinc-400">{`${results.length} results for "${query}"`}</p>
          </div>

          {results.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              onClick={() => setShowDropdown(false)}
              className="flex items-start gap-3 border-b border-zinc-100 px-4 py-3 transition-colors last:border-0 hover:bg-zinc-50"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                {product.images[0] ? (
                  <Image
                    src={product.images[0]}
                    alt=""
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                    sizes="56px"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="text-xl text-zinc-300">📦</span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-900">{product.name}</p>
                <p className="mt-0.5 truncate text-xs text-zinc-400">
                  {product.store.name}
                  {product.store.region ? ` · ${getRegionLabel(product.store.region)}` : ""}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-[#D4450A]">
                    TTD {product.price.toFixed(2)}
                  </span>
                  {product.compareAtPrice != null ? (
                    <span className="text-xs text-zinc-400 line-through">
                      TTD {product.compareAtPrice.toFixed(2)}
                    </span>
                  ) : null}
                  {product.category ? (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] capitalize text-blue-600">
                      {product.category.replace(/_/g, " ")}
                    </span>
                  ) : null}
                  {product.brand ? (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500">
                      {product.brand}
                    </span>
                  ) : null}
                  {product.stock !== null && product.stock <= 5 && product.stock > 0 ? (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] text-red-500">
                      Only {product.stock} left
                    </span>
                  ) : null}
                  {product.stock === 0 ? (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-400">
                      Out of stock
                    </span>
                  ) : null}
                </div>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="mt-1 shrink-0 text-zinc-300"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ))}

          <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-2.5 text-center">
            <button
              type="button"
              onClick={() => {
                handleSearch()
                setShowDropdown(false)
              }}
              className="text-xs font-medium text-[#D4450A] hover:underline"
            >
              {`See all results for "${query}" →`}
            </button>
          </div>
        </div>
      )}

      {showDropdown && results.length === 0 && !loading && query.trim() && (
        <div className="absolute top-full right-0 left-0 z-[200] mt-2 rounded-xl border border-zinc-200 bg-white px-4 py-6 text-center shadow-xl">
          <p className="mb-2 text-sm text-zinc-500">{`No products found for "${query}"`}</p>
          <p className="text-xs text-zinc-400">Try different keywords or browse by category</p>
        </div>
      )}
    </div>
  )
}
