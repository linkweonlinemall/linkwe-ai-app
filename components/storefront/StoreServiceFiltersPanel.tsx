"use client";

const SERVICE_TYPE_FILTERS = [
  { value: "All", label: "All types" },
  { value: "BOOKABLE", label: "Bookable" },
  { value: "QUOTE", label: "Quote" },
  { value: "ON_DEMAND", label: "On Demand" },
  { value: "SUBSCRIPTION", label: "Subscription" },
  { value: "VIRTUAL", label: "Virtual" },
] as const;

type Props = {
  serviceSearch: string;
  setServiceSearch: (v: string) => void;
  serviceSort: string;
  setServiceSort: (v: string) => void;
  serviceType: string;
  setServiceType: (v: string) => void;
  servicePriceMin: string;
  setServicePriceMin: (v: string) => void;
  servicePriceMax: string;
  setServicePriceMax: (v: string) => void;
  serviceLocation: string;
  setServiceLocation: (v: string) => void;
  serviceCategory: string;
  setServiceCategory: (v: string) => void;
  categories: string[];
  onClear: () => void;
};

export default function StoreServiceFiltersPanel({
  serviceSearch,
  setServiceSearch,
  serviceSort,
  setServiceSort,
  serviceType,
  setServiceType,
  servicePriceMin,
  setServicePriceMin,
  servicePriceMax,
  setServicePriceMax,
  serviceLocation,
  setServiceLocation,
  serviceCategory,
  setServiceCategory,
  categories,
  onClear,
}: Props) {
  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_16px_45px_rgba(24,24,27,0.08)]">
      <div className="flex items-center justify-between bg-gradient-to-br from-zinc-950 to-[#3a1b0f] px-5 py-4">
        <div><p className="text-sm font-black text-white">Service filters</p><p className="text-[10px] text-white/50">Find the right service</p></div>
        <button type="button" onClick={onClear} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20">
          Clear all
        </button>
      </div>

      <div className="border-b border-[var(--color-border-tertiary)] px-4 py-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Category</p>
        <select value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)} className="min-h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none focus:border-[#D4450A]">
          <option value="All">All categories</option>
          {categories.map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      <div className="border-b border-[var(--color-border-tertiary)] px-4 py-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Where it happens</p>
        <select value={serviceLocation} onChange={(e) => setServiceLocation(e.target.value)} className="min-h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none focus:border-[#D4450A]">
          <option value="All">Any location</option><option value="AT_VENDOR">At provider</option><option value="AT_CUSTOMER">At customer</option><option value="FLEXIBLE">Flexible</option><option value="VIRTUAL">Online</option>
        </select>
      </div>

      <div className="border-b border-[var(--color-border-tertiary)] px-4 py-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Search</p>
        <input
          type="search"
          value={serviceSearch}
          onChange={(e) => setServiceSearch(e.target.value)}
          placeholder="Search services…"
          className="min-h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#D4450A] focus:ring-2 focus:ring-orange-100"
        />
      </div>

      <div className="border-b border-[var(--color-border-tertiary)] px-4 py-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Service type</p>
        <div className="flex flex-wrap gap-2">
          {SERVICE_TYPE_FILTERS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setServiceType(t.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                serviceType === t.value
                  ? "bg-[#D4450A] text-white"
                  : "bg-[var(--color-background-secondary)] text-[var(--text-secondary)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
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
              onClick={() => setServiceSort(opt.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                serviceSort === opt.value
                  ? "bg-[#D4450A] text-white"
                  : "bg-[var(--color-background-secondary)] text-[var(--text-secondary)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Price (TTD)</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={servicePriceMin}
            onChange={(e) => setServicePriceMin(e.target.value)}
            placeholder="Min"
            className="w-full rounded-lg border border-[0.5px] border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] px-3 py-2 text-sm outline-none focus:border-[#D4450A]"
          />
          <span className="text-[var(--text-muted)]">–</span>
          <input
            type="number"
            value={servicePriceMax}
            onChange={(e) => setServicePriceMax(e.target.value)}
            placeholder="Max"
            className="w-full rounded-lg border border-[0.5px] border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] px-3 py-2 text-sm outline-none focus:border-[#D4450A]"
          />
        </div>
      </div>
    </div>
  );
}
