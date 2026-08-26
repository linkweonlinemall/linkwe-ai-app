"use client";

type Props = {
  search: string;
  setSearch: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  categories: string[];
  priceMin: string;
  setPriceMin: (v: string) => void;
  priceMax: string;
  setPriceMax: (v: string) => void;
  inStockOnly: boolean;
  setInStockOnly: (v: boolean | ((prev: boolean) => boolean)) => void;
  onClear: () => void;
};

export default function StoreProductFiltersPanel({
  search,
  setSearch,
  sortBy,
  setSortBy,
  category,
  setCategory,
  categories,
  priceMin,
  setPriceMin,
  priceMax,
  setPriceMax,
  inStockOnly,
  setInStockOnly,
  onClear,
}: Props) {
  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_16px_45px_rgba(24,24,27,0.08)]">
      <div className="flex items-center justify-between bg-gradient-to-br from-zinc-950 to-[#3a1b0f] px-5 py-4">
        <div><p className="text-sm font-black text-white">Shop filters</p><p className="text-[10px] text-white/50">Refine this store</p></div>
        <button type="button" onClick={onClear} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20">
          Clear all
        </button>
      </div>

      <div className="border-b border-[var(--color-border-tertiary)] px-4 py-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Search</p>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="min-h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#D4450A] focus:ring-2 focus:ring-orange-100"
        />
      </div>

      <div className="border-b border-[var(--color-border-tertiary)] px-4 py-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Sort by</p>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "default", label: "Featured" },
            { value: "price_asc", label: "Price Low-High" },
            { value: "price_desc", label: "Price High-Low" },
            { value: "name", label: "Name A-Z" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSortBy(opt.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                sortBy === opt.value
                  ? "bg-[#D4450A] text-white"
                  : "bg-[var(--color-background-secondary)] text-[var(--text-secondary)] hover:bg-zinc-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-[var(--color-border-tertiary)] px-4 py-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Category</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                category === c
                  ? "bg-[#D4450A] text-white"
                  : "bg-[var(--color-background-secondary)] text-[var(--text-secondary)]"
              }`}
            >
              {c === "All" ? "All" : c.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-[var(--color-border-tertiary)] px-4 py-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Price (TTD)</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            placeholder="Min"
            className="w-full rounded-lg border border-[0.5px] border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] px-3 py-2 text-sm outline-none focus:border-[#D4450A]"
          />
          <span className="text-[var(--text-muted)]">–</span>
          <input
            type="number"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            placeholder="Max"
            className="w-full rounded-lg border border-[0.5px] border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] px-3 py-2 text-sm outline-none focus:border-[#D4450A]"
          />
        </div>
      </div>

      <div className="px-4 py-3">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={() => setInStockOnly((v) => !v)}
            className="size-4 rounded border-zinc-300 text-[#D4450A] focus:ring-[#D4450A]"
          />
          <span className="text-sm text-[var(--text-secondary)]">In stock only</span>
        </label>
      </div>
    </div>
  );
}
