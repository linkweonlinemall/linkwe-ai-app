"use client";

import { ConciergeBell, FilterX } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import ServicesLaunchNotifyModal from "@/components/services/ServicesLaunchNotifyModal";
import {
  SERVICE_TYPE_BADGE_LABEL,
  SERVICE_TYPE_FILTER_LABEL,
  serviceTypeLucideIcon,
} from "@/components/icons/service-type-lucide";
import EmptyState from "@/components/ui/empty-state";
import { icn } from "@/lib/iconography";
import { SERVICE_CATEGORIES } from "@/lib/categories";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import WishlistButton from "@/components/ui/WishlistButton";

const ALL_CATEGORIES = [{ value: "all", label: "All Services" }, ...SERVICE_CATEGORIES];

const SERVICE_TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "BOOKABLE", label: SERVICE_TYPE_FILTER_LABEL.BOOKABLE },
  { value: "QUOTE", label: SERVICE_TYPE_FILTER_LABEL.QUOTE },
  { value: "SUBSCRIPTION", label: SERVICE_TYPE_FILTER_LABEL.SUBSCRIPTION },
  { value: "ON_DEMAND", label: SERVICE_TYPE_FILTER_LABEL.ON_DEMAND },
  { value: "VIRTUAL", label: SERVICE_TYPE_FILTER_LABEL.VIRTUAL },
];

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "rating", label: "Customer rating" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "duration", label: "Shortest duration" },
];

function serviceTypeInfo(type: string | null) {
  switch (type) {
    case "BOOKABLE":
      return { label: SERVICE_TYPE_BADGE_LABEL.BOOKABLE, color: "bg-blue-50 text-blue-700" };
    case "QUOTE":
      return { label: SERVICE_TYPE_BADGE_LABEL.QUOTE, color: "bg-amber-50 text-amber-700" };
    case "SUBSCRIPTION":
      return {
        label: SERVICE_TYPE_BADGE_LABEL.SUBSCRIPTION,
        color: "bg-purple-50 text-purple-700",
      };
    case "ON_DEMAND":
      return {
        label: SERVICE_TYPE_BADGE_LABEL.ON_DEMAND,
        color: "bg-emerald-50 text-emerald-700",
      };
    case "VIRTUAL":
      return { label: SERVICE_TYPE_BADGE_LABEL.VIRTUAL, color: "bg-zinc-100 text-zinc-700" };
    default:
      return { label: "Service", color: "bg-zinc-100 text-zinc-700" };
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
  quotePriceType: string | null;
  serviceLocation: string | null;
  serviceDuration: number | null;
  isFeatured: boolean;
  requiresDeposit: boolean;
  depositAmount: number | null;
  store: { name: string; slug: string; region: string | null; logoUrl: string | null };
  reviewAvg: number;
  reviewCount: number;
};

export default function ServicesClient({ initialServices, wishlistProductIds = [] }: { initialServices: Service[]; wishlistProductIds?: string[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [serviceType, setServiceType] = useState("all");
  const [sort, setSort] = useState("featured");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [region, setRegion] = useState("all");
  const [location, setLocation] = useState("all");
  const [minimumRating, setMinimumRating] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);

  const hasFilters =
    category !== "all" ||
    serviceType !== "all" ||
    sort !== "featured" ||
    !!search ||
    !!priceMin ||
    !!priceMax ||
    region !== "all" ||
    location !== "all" ||
    minimumRating > 0;

  const availableRegions = useMemo(
    () => Array.from(new Set(initialServices.map((service) => service.store.region).filter(Boolean) as string[])).sort(),
    [initialServices],
  );

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
        if (region !== "all" && s.store.region !== region) return false;
        if (location !== "all" && s.serviceLocation !== location) return false;
        if (minimumRating > 0 && s.reviewAvg < minimumRating) return false;
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
        if (sort === "name_desc") return b.name.localeCompare(a.name);
        if (sort === "duration") return (a.serviceDuration ?? Number.MAX_SAFE_INTEGER) - (b.serviceDuration ?? Number.MAX_SAFE_INTEGER);
        if (sort === "rating") return b.reviewAvg - a.reviewAvg || b.reviewCount - a.reviewCount;
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      });
  }, [initialServices, search, category, serviceType, sort, priceMin, priceMax, region, location, minimumRating]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-mobile-public lg:pb-0">
      {/* Hero search bar */}
      <div className="bg-[#1C1C1A] py-5">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services — hairdresser, plumber, tutor..."
              className="min-h-[44px] w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-base text-white placeholder:text-white/40 focus:bg-white/15 focus:outline-none md:min-h-0 md:text-sm"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="min-h-[44px] shrink-0 rounded-xl border border-white/20 px-4 py-3 text-base font-semibold text-white/70 transition-colors hover:text-white md:min-h-0 md:text-sm"
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

      <div className="mx-auto max-w-screen-xl px-4 pb-2 pt-4 sm:px-6 lg:hidden">
        <div className="flex items-center gap-2">
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
                {
                  [
                    category !== "all",
                    serviceType !== "all",
                    sort !== "featured",
                    !!search,
                    !!priceMin || !!priceMax,
                    region !== "all",
                    location !== "all",
                    minimumRating > 0,
                  ].filter(Boolean).length
                }
              </span>
            ) : null}
          </button>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory("all");
                setServiceType("all");
                setSort("featured");
                setPriceMin("");
                setPriceMax("");
                setRegion("all");
                setLocation("all");
                setMinimumRating(0);
              }}
              className="text-xs font-semibold text-zinc-400 transition-colors hover:text-[#D4450A]"
            >
              Clear all
            </button>
          ) : null}
          <p className="ml-auto text-xs text-zinc-400">
            {filtered.length} service{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

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
              <p className="text-sm font-bold text-zinc-900">Filters</p>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-11 min-w-[44px] items-center justify-center rounded-full bg-zinc-100 px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200"
              >
                Done
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-4 pb-8">
              {/* Search */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Search</label>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search services..."
                  className="min-h-[44px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-base focus:border-[#D4450A] focus:outline-none"
                />
              </div>

              {/* Sort */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Sort by</label>
                <div className="flex flex-col gap-1">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSort(opt.value)}
                      className={`flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        sort === opt.value ? "bg-[#D4450A]/10 font-semibold text-[#D4450A]" : "text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      <span
                        className={`h-3 w-3 shrink-0 rounded-full border-2 ${sort === opt.value ? "border-[#D4450A] bg-[#D4450A]" : "border-zinc-300"}`}
                      />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service type */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Service type</label>
                <div className="flex flex-col gap-1">
                  {SERVICE_TYPE_OPTIONS.map((opt) => {
                    const FilterIcon = opt.value === "all" ? null : serviceTypeLucideIcon(opt.value);
                    return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setServiceType(opt.value)}
                      className={`flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        serviceType === opt.value
                          ? "bg-[#D4450A]/10 font-semibold text-[#D4450A]"
                          : "text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      <span
                        className={`h-3 w-3 shrink-0 rounded-full border-2 ${serviceType === opt.value ? "border-[#D4450A] bg-[#D4450A]" : "border-zinc-300"}`}
                      />
                      {FilterIcon ? (
                        <FilterIcon
                          className={
                            serviceType === opt.value
                              ? "size-4 shrink-0 stroke-[2] text-[#D4450A]"
                              : icn.inline
                          }
                          aria-hidden
                          strokeWidth={2}
                        />
                      ) : null}
                      {opt.label}
                    </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Location & quality</label>
                <select value={region} onChange={(e) => setRegion(e.target.value)} className="mb-2 min-h-[44px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-base">
                  <option value="all">All regions</option>
                  {availableRegions.map((value) => <option key={value} value={value}>{getRegionLabel(value)}</option>)}
                </select>
                <select value={location} onChange={(e) => setLocation(e.target.value)} className="mb-2 min-h-[44px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-base">
                  <option value="all">Any service location</option>
                  <option value="AT_CUSTOMER">At my location</option>
                  <option value="AT_VENDOR">At provider</option>
                  <option value="FLEXIBLE">Flexible location</option>
                  <option value="VIRTUAL">Online / virtual</option>
                </select>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0, 3, 4, 4.5].map((rating) => <button key={rating} type="button" onClick={() => setMinimumRating(rating)} className={`min-h-11 rounded-lg text-xs font-bold ${minimumRating === rating ? "bg-[#D4450A] text-white" : "border border-zinc-200 bg-white text-zinc-600"}`}>{rating === 0 ? "Any" : `${rating}+ ★`}</button>)}
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Price range (TTD)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder="Min"
                    className="min-h-[44px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-base focus:border-[#D4450A] focus:outline-none"
                  />
                  <span className="text-xs text-zinc-400">–</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="Max"
                    className="min-h-[44px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-base focus:border-[#D4450A] focus:outline-none"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Category</label>
                <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                  {ALL_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`flex min-h-[44px] items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        category === cat.value ? "bg-[#D4450A]/10 font-semibold text-[#D4450A]" : "text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      <span className="truncate">{cat.label}</span>
                      {category === cat.value ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 gap-3 border-t border-zinc-100 p-4">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("all");
                  setServiceType("all");
                  setSort("featured");
                  setPriceMin("");
                  setPriceMax("");
                  setRegion("all");
                  setLocation("all");
                  setMinimumRating(0);
                  setDrawerOpen(false);
                }}
                className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl border-2 border-zinc-200 text-sm font-bold text-zinc-700 hover:border-zinc-300"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
              >
                Show {filtered.length} results
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
                          region !== "all",
                          location !== "all",
                          minimumRating > 0,
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
                      setRegion("all");
                      setLocation("all");
                      setMinimumRating(0);
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
                  {SERVICE_TYPE_OPTIONS.map((opt) => {
                    const FilterIcon = opt.value === "all" ? null : serviceTypeLucideIcon(opt.value);
                    return (
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
                      {FilterIcon ? (
                        <FilterIcon
                          className={
                            serviceType === opt.value
                              ? "size-4 shrink-0 stroke-[2] text-[#D4450A]"
                              : icn.inline
                          }
                          aria-hidden
                          strokeWidth={2}
                        />
                      ) : null}
                      {opt.label}
                    </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-b border-zinc-100 px-4 py-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Location & quality</p>
                <select value={region} onChange={(e) => setRegion(e.target.value)} className="mb-2 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs">
                  <option value="all">All regions</option>
                  {availableRegions.map((value) => <option key={value} value={value}>{getRegionLabel(value)}</option>)}
                </select>
                <select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs">
                  <option value="all">Any service location</option>
                  <option value="AT_CUSTOMER">At my location</option>
                  <option value="AT_VENDOR">At provider</option>
                  <option value="FLEXIBLE">Flexible location</option>
                  <option value="VIRTUAL">Online / virtual</option>
                </select>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {[0, 3, 4, 4.5].map((rating) => <button key={rating} type="button" onClick={() => setMinimumRating(rating)} className={`rounded-lg px-2 py-1.5 text-xs font-semibold ${minimumRating === rating ? "bg-[#D4450A] text-white" : "bg-zinc-50 text-zinc-600"}`}>{rating === 0 ? "Any rating" : `${rating}+ ★`}</button>)}
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
              <div className="overflow-hidden rounded-2xl border border-dashed border-zinc-300 bg-white">
                {initialServices.length === 0 ? (
                  <EmptyState
                    icon={<ConciergeBell strokeWidth={1.25} className="text-current" />}
                    title="Services launching soon"
                    description="Local service providers are joining LinkWe. Be the first to know when they go live."
                    actionLabel="Notify me"
                    actionOnClick={() => setNotifyOpen(true)}
                  />
                ) : (
                  <EmptyState
                    icon={<FilterX strokeWidth={1.25} className="text-current" />}
                    title="No services match your filters"
                    description="Try adjusting your search or browse all services."
                    actionLabel="Clear filters"
                    actionOnClick={() => {
                      setSearch("");
                      setCategory("all");
                      setServiceType("all");
                      setSort("featured");
                      setPriceMin("");
                      setPriceMax("");
                    }}
                  />
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((service) => {
                  const typeInfo = serviceTypeInfo(service.serviceType);
                  const TypeBadgeIcon = serviceTypeLucideIcon(service.serviceType);
                  return (
                    <Link
                      key={service.id}
                      href={`/service/${service.slug}`}
                      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-200">
                        <div className="absolute right-2.5 top-2.5 z-20"><WishlistButton productId={service.id} initialWishlisted={wishlistProductIds.includes(service.id)} /></div>
                        {service.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={service.images[0]}
                            alt={service.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ConciergeBell
                              className={`${icn.ui} text-zinc-400`}
                              aria-hidden
                              strokeWidth={2}
                            />
                          </div>
                        )}
                        <div className="absolute left-2.5 top-2.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${typeInfo.color}`}
                          >
                            <TypeBadgeIcon className="size-3.5 shrink-0" aria-hidden strokeWidth={2.5} />
                            {typeInfo.label}
                          </span>
                        </div>
                        {service.isFeatured ? (
                          <div className="absolute bottom-2.5 right-2.5">
                            <span className="rounded-full bg-[#D4450A] px-2.5 py-1 text-[10px] font-bold text-white">
                              Featured
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-4">
                        <div>
                          <p className="text-xs font-medium text-zinc-400">{service.store.name}</p>
                          {service.store.region ? (
                            <p className="text-[10px] text-zinc-400">{getRegionLabel(service.store.region)}</p>
                          ) : null}
                          <p className="mt-0.5 text-sm font-bold leading-snug text-zinc-900 transition-colors group-hover:text-[#D4450A]">
                            {service.name}
                          </p>
                        </div>
                        <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-2">
                          <div>
                            {service.serviceType === "QUOTE" && service.quotePriceType === "FREE_QUOTE" ? (
                              <p className="text-sm font-black text-[#D4450A]">Free quote</p>
                            ) : (
                              <p className="text-sm font-black text-[#D4450A]">
                                {service.serviceType === "QUOTE" && service.quotePriceType === "STARTING_FROM" ? "From " : ""}
                                TTD {service.price.toFixed(2)}
                              </p>
                            )}
                            {service.reviewCount > 0 ? (
                              <div className="mt-1 flex items-center gap-1">
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <svg
                                      key={star}
                                      viewBox="0 0 24 24"
                                      className={`h-2.5 w-2.5 ${star <= Math.round(service.reviewAvg) ? "fill-[#E8820C]" : "fill-zinc-200"}`}
                                    >
                                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                  ))}
                                </div>
                                <span className="text-[10px] text-zinc-400">({service.reviewCount})</span>
                              </div>
                            ) : null}
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

      <ServicesLaunchNotifyModal open={notifyOpen} onClose={() => setNotifyOpen(false)} />
    </div>
  );
}
