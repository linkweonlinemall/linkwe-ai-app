"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "clothing_apparel", label: "Clothing" },
  { value: "shoes_footwear", label: "Shoes" },
  { value: "jewellery_watches", label: "Jewellery" },
  { value: "health_beauty", label: "Health & Beauty" },
  { value: "food_beverages", label: "Food & Drinks" },
  { value: "home_furniture", label: "Home" },
  { value: "electronics", label: "Electronics" },
  { value: "sports_fitness", label: "Sports" },
  { value: "toys_games", label: "Toys" },
  { value: "books_stationery", label: "Books" },
  { value: "art_crafts", label: "Art & Crafts" },
  { value: "automotive_parts", label: "Automotive" },
];

type Props = {
  defaultCategory?: string;
  defaultSort?: string;
  productCount: number;
};

export default function ShopFilters({
  defaultCategory = "all",
  defaultSort = "featured",
  productCount,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [category, setCategory] = useState(defaultCategory);
  const [sort, setSort] = useState(defaultSort);
  const [priceMin, setPriceMin] = useState(searchParams.get("minPrice") ?? "");
  const [priceMax, setPriceMax] = useState(searchParams.get("maxPrice") ?? "");
  const [inStock, setInStock] = useState(searchParams.get("inStock") === "true");

  function applyFilters(overrides: Record<string, string> = {}) {
    const params = new URLSearchParams(searchParams.toString());
    const values = {
      category: overrides.category ?? category,
      sort: overrides.sort ?? sort,
      minPrice: overrides.minPrice ?? priceMin,
      maxPrice: overrides.maxPrice ?? priceMax,
      inStock: overrides.inStock ?? (inStock ? "true" : ""),
    };
    if (values.category && values.category !== "all") {
      params.set("category", values.category);
    } else {
      params.delete("category");
    }
    if (values.sort && values.sort !== "featured") {
      params.set("sort", values.sort);
    } else {
      params.delete("sort");
    }
    if (values.minPrice) params.set("minPrice", values.minPrice);
    else params.delete("minPrice");
    if (values.maxPrice) params.set("maxPrice", values.maxPrice);
    else params.delete("maxPrice");
    if (values.inStock === "true") params.set("inStock", "true");
    else params.delete("inStock");
    const qs = params.toString();
    router.push(qs ? `/shop?${qs}` : "/shop");
  }

  function clearAll() {
    setCategory("all");
    setSort("featured");
    setPriceMin("");
    setPriceMax("");
    setInStock(false);
    router.push("/shop");
  }

  const hasFilters =
    category !== "all" || sort !== "featured" || priceMin || priceMax || inStock;

  return (
    <aside className="w-full shrink-0 lg:w-64">
      <div className="sticky top-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <p className="text-sm font-bold text-zinc-900">Filters</p>
          {hasFilters ? (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-medium text-[#D4450A] hover:underline"
            >
              Clear all
            </button>
          ) : null}
        </div>

        <div className="border-b border-zinc-100 px-5 py-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">Sort by</p>
          <div className="flex flex-col gap-2">
            {[
              { value: "featured", label: "Featured" },
              { value: "price_asc", label: "Price: Low to High" },
              { value: "price_desc", label: "Price: High to Low" },
              { value: "newest", label: "Newest" },
              { value: "name", label: "Name A–Z" },
            ].map((opt) => (
              <label key={opt.value} className="group flex cursor-pointer items-center gap-2.5">
                <div
                  onClick={() => {
                    setSort(opt.value);
                    applyFilters({ sort: opt.value });
                  }}
                  className={`flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border-2 transition-colors ${
                    sort === opt.value
                      ? "border-[#D4450A] bg-[#D4450A]"
                      : "border-zinc-300 group-hover:border-[#D4450A]"
                  }`}
                >
                  {sort === opt.value ? <div className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                </div>
                <span className="text-sm text-zinc-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="border-b border-zinc-100 px-5 py-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">Category</p>
          <div className="flex flex-col gap-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => {
                  setCategory(cat.value);
                  applyFilters({ category: cat.value });
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  category === cat.value
                    ? "bg-[#D4450A]/10 font-semibold text-[#D4450A]"
                    : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                <span>{cat.label}</span>
                {category === cat.value ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="border-b border-zinc-100 px-5 py-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">Price range (TTD)</p>
          <div className="mb-3 flex items-center gap-2">
            <input
              type="number"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              placeholder="Min"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
            />
            <span className="shrink-0 text-zinc-400">–</span>
            <input
              type="number"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="Max"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => applyFilters()}
            className="w-full rounded-xl bg-zinc-900 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Apply price
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">Availability</p>
          <label className="flex cursor-pointer items-center gap-2.5">
            <div
              onClick={() => {
                setInStock((v) => !v);
                applyFilters({ inStock: !inStock ? "true" : "" });
              }}
              className={`relative h-5 w-10 cursor-pointer rounded-full transition-colors ${
                inStock ? "bg-[#D4450A]" : "bg-zinc-200"
              }`}
            >
              <div
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  inStock ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
            <span className="text-sm text-zinc-700">In stock only</span>
          </label>
        </div>

        {hasFilters ? (
          <div className="px-5 pb-4">
            <p className="text-center text-xs text-zinc-400">
              {productCount} product{productCount !== 1 ? "s" : ""} found
            </p>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
