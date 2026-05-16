"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SERVICE_CATEGORIES } from "@/lib/categories";

const ALL_CATEGORIES = [{ value: "all", label: "All Services" }, ...SERVICE_CATEGORIES];

const SERVICE_TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "BOOKABLE", label: "📅 Bookable" },
  { value: "QUOTE", label: "💬 Quote" },
  { value: "SUBSCRIPTION", label: "🔄 Subscription" },
  { value: "ON_DEMAND", label: "⚡ On Demand" },
  { value: "VIRTUAL", label: "💻 Virtual" },
];

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name", label: "Name A–Z" },
];

function serviceTypeInfo(type: string | null) {
  switch (type) {
    case "BOOKABLE":
      return { label: "Bookable", color: "bg-blue-50 text-blue-700", icon: "📅" };
    case "QUOTE":
      return { label: "Get Quote", color: "bg-amber-50 text-amber-700", icon: "💬" };
    case "SUBSCRIPTION":
      return { label: "Subscribe", color: "bg-purple-50 text-purple-700", icon: "🔄" };
    case "ON_DEMAND":
      return { label: "On Demand", color: "bg-emerald-50 text-emerald-700", icon: "⚡" };
    case "VIRTUAL":
      return { label: "Virtual", color: "bg-zinc-100 text-zinc-700", icon: "💻" };
    default:
      return { label: "Service", color: "bg-zinc-100 text-zinc-700", icon: "🛎️" };
  }
}

type Service = {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  category: string | null;
  serviceType: string | null;
  serviceLocation: string | null;
  serviceDuration: number | null;
  isFeatured: boolean;
  requiresDeposit: boolean;
  depositAmount: number | null;
  store: { name: string; slug: string; region: string | null; logoUrl: string | null };
};

export default function ServicesClient({ initialServices }: { initialServices: Service[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [serviceType, setServiceType] = useState("all");
  const [sort, setSort] = useState("featured");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  const hasFilters =
    category !== "all" ||
    serviceType !== "all" ||
    sort !== "featured" ||
    !!search ||
    !!priceMin ||
    !!priceMax;

  const filtered = useMemo(() => {
    return initialServices
      .filter((s) => {
        if (
          search &&
          !s.name.toLowerCase().includes(search.toLowerCase()) &&
          !s.store.name.toLowerCase().includes(search.toLowerCase())
        ) {
          return false;
        }
        if (category !== "all" && s.category !== category) return false;
        if (serviceType !== "all" && s.serviceType !== serviceType) return false;
        const min = priceMin ? parseFloat(priceMin) : null;
        const max = priceMax ? parseFloat(priceMax) : null;
        if (min !== null && !Number.isNaN(min) && s.price < min) return false;
        if (max !== null && !Number.isNaN(max) && s.price > max) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "price_asc") return a.price - b.price;
        if (sort === "price_desc") return b.price - a.price;
        if (sort === "name") return a.name.localeCompare(b.name);
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      });
  }, [initialServices, search, category, serviceType, sort, priceMin, priceMax]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16 sm:pb-0">
      {/* Hero search bar */}
      <div className="bg-[#1C1C1A] py-5">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services — hairdresser, plumber, tutor..."
              className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:bg-white/15 focus:outline-none"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="shrink-0 rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white/70 transition-colors hover:text-white"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Category strip */}
      <div className="border-b border-zinc-200 bg-white shadow-sm">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="flex gap-1.5 overflow-x-auto py-2.5 scrollbar-hide">
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  category === cat.value
                    ? "bg-[#D4450A] text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">
        <div className="flex gap-6">
          {/* Sidebar filter */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-zinc-900">Filters</p>
                  {hasFilters ? (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#D4450A] text-[9px] font-bold text-white">
                      {
                        [
                          category !== "all",
                          serviceType !== "all",
                          sort !== "featured",
                          !!search,
                          !!priceMin || !!priceMax,
                        ].filter(Boolean).length
                      }
                    </span>
                  ) : null}
                </div>
                {hasFilters ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCategory("all");
                      setServiceType("all");
                      setSort("featured");
                      setSearch("");
                      setPriceMin("");
                      setPriceMax("");
                    }}
                    className="text-xs font-semibold text-[#D4450A] hover:underline"
                  >
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
                      onClick={() => setSort(opt.value)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors ${
                        sort === opt.value
                          ? "bg-[#D4450A]/10 font-semibold text-[#D4450A]"
                          : "text-zinc-600 hover:bg-zinc-50"
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

              {/* Service type */}
              <div className="border-b border-zinc-100 px-4 py-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Service type</p>
                <div className="flex flex-col gap-0.5">
                  {SERVICE_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setServiceType(opt.value)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors ${
                        serviceType === opt.value
                          ? "bg-[#D4450A]/10 font-semibold text-[#D4450A]"
                          : "text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      <span
                        className={`h-3 w-3 shrink-0 rounded-full border-2 transition-colors ${
                          serviceType === opt.value ? "border-[#D4450A] bg-[#D4450A]" : "border-zinc-300"
                        }`}
                      />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div className="border-b border-zinc-100 px-4 py-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Price (TTD)</p>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder="Min"
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs focus:border-[#D4450A] focus:outline-none"
                  />
                  <span className="shrink-0 text-xs text-zinc-400">–</span>
                  <input
                    type="number"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="Max"
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs focus:border-[#D4450A] focus:outline-none"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="px-4 py-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Category</p>
                <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
                  {ALL_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                        category === cat.value
                          ? "bg-[#D4450A]/10 font-semibold text-[#D4450A]"
                          : "text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      <span className="truncate">{cat.label}</span>
                      {category === cat.value ? (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              {hasFilters ? (
                <div className="border-t border-zinc-100 px-4 py-2.5">
                  <p className="text-center text-xs text-zinc-400">
                    {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                  </p>
                </div>
              ) : null}
            </div>
          </aside>

          {/* Services grid */}
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-zinc-900">
                  {search
                    ? `Results for "${search}"`
                    : category !== "all"
                      ? (ALL_CATEGORIES.find((c) => c.value === category)?.label ?? "Services")
                      : "All Services"}
                </h1>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {filtered.length} service{filtered.length !== 1 ? "s" : ""} from local providers
                </p>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-24 text-center">
                <span className="mb-4 text-6xl">🛎️</span>
                <h2 className="mb-2 text-lg font-bold text-zinc-900">No services found</h2>
                <p className="mb-6 text-sm text-zinc-500">Try a different category or search term</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCategory("all");
                    setServiceType("all");
                  }}
                  className="rounded-full bg-[#D4450A] px-5 py-2 text-sm font-semibold text-white"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((service) => {
                  const typeInfo = serviceTypeInfo(service.serviceType);
                  return (
                    <Link
                      key={service.id}
                      href={`/service/${service.slug}`}
                      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-200">
                        {service.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={service.images[0]}
                            alt={service.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-4xl">🛎️</div>
                        )}
                        <div className="absolute left-2.5 top-2.5">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${typeInfo.color}`}>
                            {typeInfo.icon} {typeInfo.label}
                          </span>
                        </div>
                        {service.isFeatured ? (
                          <div className="absolute right-2.5 top-2.5">
                            <span className="rounded-full bg-[#D4450A] px-2.5 py-1 text-[10px] font-bold text-white">
                              Featured
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-4">
                        <div>
                          <p className="text-xs font-medium text-zinc-400">{service.store.name}</p>
                          <p className="mt-0.5 text-sm font-bold leading-snug text-zinc-900 transition-colors group-hover:text-[#D4450A]">
                            {service.name}
                          </p>
                        </div>
                        <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-2">
                          <div>
                            <p className="text-sm font-black text-[#D4450A]">
                              TTD {service.price.toFixed(2)}
                            </p>
                            {service.serviceDuration ? (
                              <p className="text-[10px] text-zinc-400">
                                {service.serviceDuration >= 60
                                  ? `${Math.floor(service.serviceDuration / 60)}h${
                                      service.serviceDuration % 60 > 0
                                        ? ` ${service.serviceDuration % 60}m`
                                        : ""
                                    }`
                                  : `${service.serviceDuration} min`}
                              </p>
                            ) : null}
                          </div>
                          {service.requiresDeposit && service.depositAmount ? (
                            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold text-zinc-600">
                              TTD {service.depositAmount.toFixed(0)} deposit
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
