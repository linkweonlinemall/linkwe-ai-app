"use client";

const SERVICE_TYPE_FILTERS = [
  { value: "All", label: "All types" },
  { value: "BOOKABLE", label: "Bookable" },
  { value: "QUOTE", label: "Quote" },
  { value: "ON_DEMAND", label: "On Demand" },
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
  onClear,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-[0.5px] border-[var(--color-border-tertiary)] bg-white">
      <div className="flex items-center justify-between border-b border-[var(--color-border-tertiary)] px-4 py-3">
        <p className="text-sm font-bold text-[var(--text-primary)]">Filters</p>
        <button type="button" onClick={onClear} className="text-xs font-medium text-[#D4450A] hover:underline">
          Clear all
        </button>
      </div>

      <div className="border-b border-[var(--color-border-tertiary)] px-4 py-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Search</p>
        <input
          type="search"
          value={serviceSearch}
          onChange={(e) => setServiceSearch(e.target.value)}
          placeholder="Search services…"
          className="w-full rounded-lg border border-[0.5px] border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] px-3 py-2 text-sm outline-none focus:border-[#D4450A]"
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
