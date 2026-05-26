"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PRODUCT_CATEGORIES } from "@/lib/categories";

const ALL_CATEGORIES = [{ value: "all", label: "All" }, ...PRODUCT_CATEGORIES];

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name A–Z" },
];

const CONDITIONS = [
  { value: "NEW", label: "New" },
  { value: "USED", label: "Used" },
  { value: "REFURBISHED", label: "Refurbished" },
];

type ColourOption = { value: string; hex: string };

type Props = {
  defaultCategory?: string;
  defaultSort?: string;
  productCount: number;
  availableBrands?: string[];
  availableCategories?: string[];
  availableColours?: ColourOption[];
  availableSizes?: string[];
};

export default function ShopFilters({
  defaultCategory = "all",
  defaultSort = "featured",
  productCount,
  availableBrands = [],
  availableCategories = [],
  availableColours = [],
  availableSizes = [],
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [category, setCategory] = useState(defaultCategory);
  const [sort, setSort] = useState(defaultSort);
  const [priceMin, setPriceMin] = useState(searchParams.get("minPrice") ?? "");
  const [priceMax, setPriceMax] = useState(searchParams.get("maxPrice") ?? "");
  const [inStock, setInStock] = useState(searchParams.get("inStock") === "true");
  const [condition, setCondition] = useState(searchParams.get("condition") ?? "");
  const [brand, setBrand] = useState(searchParams.get("brand") ?? "");
  const [colour, setColour] = useState(searchParams.get("colour") ?? "");
  const [size, setSize] = useState(searchParams.get("size") ?? "");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Only show categories that have products
  const activeCategories = ALL_CATEGORIES.filter(
    (c) => c.value === "all" || availableCategories.includes(c.value),
  );

  function applyFilters(overrides: Record<string, string> = {}) {
    const params = new URLSearchParams(searchParams.toString());
    const values = {
      category: overrides.category ?? category,
      sort: overrides.sort ?? sort,
      minPrice: overrides.minPrice !== undefined ? overrides.minPrice : priceMin,
      maxPrice: overrides.maxPrice !== undefined ? overrides.maxPrice : priceMax,
      inStock: overrides.inStock !== undefined ? overrides.inStock : (inStock ? "true" : ""),
      condition: overrides.condition !== undefined ? overrides.condition : condition,
      brand: overrides.brand !== undefined ? overrides.brand : brand,
      colour: overrides.colour !== undefined ? overrides.colour : colour,
      size: overrides.size !== undefined ? overrides.size : size,
    };

    if (values.category && values.category !== "all") params.set("category", values.category);
    else params.delete("category");
    if (values.sort && values.sort !== "featured") params.set("sort", values.sort);
    else params.delete("sort");
    if (values.minPrice) params.set("minPrice", values.minPrice);
    else params.delete("minPrice");
    if (values.maxPrice) params.set("maxPrice", values.maxPrice);
    else params.delete("maxPrice");
    if (values.inStock === "true") params.set("inStock", "true");
    else params.delete("inStock");
    if (values.condition) params.set("condition", values.condition);
    else params.delete("condition");
    if (values.brand) params.set("brand", values.brand);
    else params.delete("brand");
    if (values.colour) params.set("colour", values.colour);
    else params.delete("colour");
    if (values.size) params.set("size", values.size);
    else params.delete("size");

    const qs = params.toString();
    router.push(qs ? `/shop?${qs}` : "/shop");
  }

  function clearAll() {
    setCategory("all");
    setSort("featured");
    setPriceMin("");
    setPriceMax("");
    setInStock(false);
    setCondition("");
    setBrand("");
    setColour("");
    setSize("");
    router.push("/shop");
  }

  const activeFilterCount = [
    category !== "all",
    sort !== "featured",
    !!priceMin || !!priceMax,
    inStock,
    !!condition,
    !!brand,
    !!colour,
    !!size,
  ].filter(Boolean).length;

  const hasFilters = activeFilterCount > 0;

  const filterBody = (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-zinc-400"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            <p className="text-sm font-bold text-zinc-900">Filters</p>
            {hasFilters ? (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#D4450A] text-[9px] font-bold text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </div>
          {hasFilters ? (
            <button type="button" onClick={clearAll} className="text-xs font-semibold text-[#D4450A] hover:underline">
              Clear all
            </button>
          ) : null}
        </div>

        {/* Sort */}
        <div className="border-b border-zinc-100 px-4 py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Sort by</p>
          <div className="flex flex-col gap-0.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setSort(opt.value);
                  applyFilters({ sort: opt.value });
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors ${
                  sort === opt.value ? "bg-[#D4450A]/10 font-semibold text-[#D4450A]" : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                <span
                  className={`h-3 w-3 shrink-0 rounded-full border-2 transition-colors ${
                    sort === opt.value ? "border-[#D4450A] bg-[#D4450A]" : "border-zinc-300"
                  }`}
                />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Colour — only if variants exist */}
        {availableColours.length > 0 ? (
          <div className="border-b border-zinc-100 px-4 py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Colour</p>
            <div className="flex flex-wrap gap-2">
              {availableColours.map((c) => {
                const isSelected = colour === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    title={c.value}
                    onClick={() => {
                      const next = isSelected ? "" : c.value;
                      setColour(next);
                      applyFilters({ colour: next });
                    }}
                    className={`relative h-8 w-8 rounded-full transition-all ${
                      isSelected ? "scale-110 ring-2 ring-[#D4450A] ring-offset-2" : "ring-1 ring-zinc-200 hover:ring-zinc-400"
                    }`}
                    style={{ background: c.hex }}
                  >
                    {isSelected ? (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {colour ? (
              <button
                type="button"
                onClick={() => {
                  setColour("");
                  applyFilters({ colour: "" });
                }}
                className="mt-1.5 text-[10px] font-medium text-zinc-400 hover:text-[#D4450A]"
              >
                Clear colour
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Size — only if variants exist */}
        {availableSizes.length > 0 ? (
          <div className="border-b border-zinc-100 px-4 py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Size</p>
            <div className="flex flex-wrap gap-1.5">
              {availableSizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    const next = size === s ? "" : s;
                    setSize(next);
                    applyFilters({ size: next });
                  }}
                  className={`min-w-[2.5rem] rounded-lg border-2 px-2.5 py-1 text-xs font-bold transition-all ${
                    size === s
                      ? "border-[#D4450A] bg-[#D4450A] text-white"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Condition */}
        <div className="border-b border-zinc-100 px-4 py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Condition</p>
          <div className="flex flex-wrap gap-1.5">
            {CONDITIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  const next = condition === c.value ? "" : c.value;
                  setCondition(next);
                  applyFilters({ condition: next });
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  condition === c.value
                    ? "bg-[#D4450A] text-white shadow-sm"
                    : "border border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Brand — dropdown, only used brands */}
        {availableBrands.length > 0 ? (
          <div className="border-b border-zinc-100 px-4 py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Brand</p>
            <select
              value={brand}
              onChange={(e) => {
                setBrand(e.target.value);
                applyFilters({ brand: e.target.value });
              }}
              className="w-full max-lg:min-h-[44px] rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 focus:border-[#D4450A] focus:outline-none lg:min-h-0 max-lg:text-base max-lg:py-3"
            >
              <option value="">All brands</option>
              {availableBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {/* Price */}
        <div className="border-b border-zinc-100 px-4 py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Price (TTD)</p>
          <div className="mb-2 flex items-center gap-1.5">
            <input
              type="number"
              inputMode="decimal"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              placeholder="Min"
              className="w-full max-lg:min-h-[44px] rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs focus:border-[#D4450A] focus:outline-none lg:min-h-0 max-lg:text-base max-lg:py-3"
            />
            <span className="shrink-0 text-xs text-zinc-400">–</span>
            <input
              type="number"
              inputMode="decimal"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="Max"
              className="w-full max-lg:min-h-[44px] rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs focus:border-[#D4450A] focus:outline-none lg:min-h-0 max-lg:text-base max-lg:py-3"
            />
          </div>
          <button
            type="button"
            onClick={() => applyFilters()}
            className="w-full max-lg:min-h-[44px] rounded-lg bg-zinc-900 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-700 lg:min-h-0 max-lg:text-base max-lg:py-3"
          >
            Apply
          </button>
        </div>

        {/* In stock */}
        <div className="border-b border-zinc-100 px-4 py-3">
          <button
            type="button"
            onClick={() => {
              const next = !inStock;
              setInStock(next);
              applyFilters({ inStock: next ? "true" : "" });
            }}
            className="flex w-full items-center justify-between"
          >
            <span className="text-xs font-semibold text-zinc-700">In stock only</span>
            <div className={`relative h-5 w-9 rounded-full transition-colors ${inStock ? "bg-[#D4450A]" : "bg-zinc-200"}`}>
              <div
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  inStock ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>
        </div>

        {/* Category — only show categories that have products */}
        <div className="px-4 py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Category</p>
          <div className="flex flex-col gap-0.5">
            {activeCategories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => {
                  setCategory(cat.value);
                  applyFilters({ category: cat.value });
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                  category === cat.value ? "bg-[#D4450A]/10 font-semibold text-[#D4450A]" : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                <span className="truncate">{cat.label}</span>
                {category === cat.value ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        {hasFilters ? (
          <div className="border-t border-zinc-100 px-4 py-2.5">
            <p className="text-center text-xs text-zinc-400">
              {productCount} result{productCount !== 1 ? "s" : ""}
            </p>
          </div>
        ) : null}
    </div>
  );

  return (
    <>
      {/* Mobile filter trigger button — only shows on mobile */}
      <div className="mb-4 flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:border-[#D4450A] hover:text-[#D4450A]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
          Filters
          {hasFilters ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D4450A] text-[10px] font-black text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
        {hasFilters ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-semibold text-zinc-400 transition-colors hover:text-[#D4450A]"
          >
            Clear all
          </button>
        ) : null}
        <p className="ml-auto text-xs text-zinc-400">
          {productCount} product{productCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[min(92vh,calc(100dvh-env(safe-area-inset-bottom)))] flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex shrink-0 justify-center pt-3 pb-2" aria-hidden>
              <div className="h-1 w-10 rounded-full bg-zinc-200" />
            </div>
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-zinc-900">Filters</p>
                {hasFilters ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D4450A] text-[10px] font-black text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-11 min-w-[44px] items-center justify-center rounded-full bg-zinc-100 px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200"
              >
                Done
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="p-4 pb-6">{filterBody}</div>
            </div>

            <div className="flex shrink-0 gap-3 border-t border-zinc-100 p-4">
              <button
                type="button"
                onClick={() => {
                  clearAll();
                  setDrawerOpen(false);
                }}
                className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl border-2 border-zinc-200 text-sm font-bold text-zinc-700 transition-colors hover:border-zinc-300"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
              >
                Show results
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden w-full shrink-0 lg:block lg:w-56">
        <div className="sticky top-4">{filterBody}</div>
      </aside>
    </>
  );
}
