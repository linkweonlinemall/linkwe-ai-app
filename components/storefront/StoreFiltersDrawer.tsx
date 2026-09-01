"use client";

import Link from "next/link";
import { useState } from "react";
import { LocateFixed } from "lucide-react";

import type { PublicStoreSort } from "@/app/actions/public-stores";
import { STORE_CATEGORIES } from "@/lib/categories";
import RegionSelect from "@/components/ui/RegionSelect";

const CATEGORIES = [{ value: "all", label: "All categories" }, ...STORE_CATEGORIES];
const SORTS: { value: PublicStoreSort; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most products" },
  { value: "rating", label: "Highest rated" },
  { value: "nearest", label: "Nearest to you" },
];

type Props = {
  qRaw: string;
  region: string;
  category: string;
  tag: string;
  sort: string;
  latRaw: string;
  lngRaw: string;
  tags: string[];
  hasFilters: boolean;
  showMobile?: boolean;
  showDesktop?: boolean;
};

export default function StoreFiltersDrawer({
  qRaw,
  region,
  category,
  tag,
  sort,
  latRaw,
  lngRaw,
  tags,
  hasFilters,
  showMobile = true,
  showDesktop = true,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [latitude, setLatitude] = useState(latRaw);
  const [longitude, setLongitude] = useState(lngRaw);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("Location is not available in this browser.");
      return;
    }
    setLocating(true);
    setLocationMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLocationMessage("Location ready. Choose Nearest to you and apply filters.");
        setLocating(false);
      },
      () => {
        setLocationMessage("We could not access your location. Check your browser permission.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }

  const filterForm = (
    <form method="GET" action="/stores" className="space-y-5">
      <input type="hidden" name="q" value={qRaw} />
      <div>
        <RegionSelect name="region" defaultValue={region} label="Region" />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Category</label>
        <select
          name="category"
          defaultValue={category}
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Tag</label>
        <select
          name="tag"
          defaultValue={tag}
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
        >
          <option value="">Any tag</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Sort by</label>
        <select
          name="sort"
          defaultValue={sort}
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-950">
        <input type="hidden" name="lat" value={latitude} />
        <input type="hidden" name="lng" value={longitude} />
        <p className="font-bold">Distance and nearby stores</p>
        <p className="mt-1 text-[11px] leading-relaxed text-blue-800/75">Use your current position to sort stores by proximity and display approximate distance.</p>
        <button type="button" onClick={useMyLocation} disabled={locating} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 font-bold text-white shadow-sm disabled:opacity-60"><LocateFixed className="size-4" />{locating ? "Finding you…" : latitude && longitude ? "Update my location" : "Use my location"}</button>
        {locationMessage ? <p className="mt-2 text-[11px] leading-4">{locationMessage}</p> : null}
      </div>
      <button
        type="submit"
        className="w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
      >
        Apply filters
      </button>
      <Link
        href="/stores"
        className="block w-full rounded-xl border-2 border-zinc-200 py-3 text-center text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
      >
        Clear filters
      </Link>
    </form>
  );

  return (
    <>
      {/* Mobile filter trigger */}
      {showMobile ? <div className="flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/95 px-4 py-3 text-sm font-bold text-zinc-800 shadow-lg transition-all hover:-translate-y-0.5 hover:bg-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
          Filters
          {hasFilters ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D4450A] text-[10px] font-black text-white">
              !
            </span>
          ) : null}
        </button>
        {hasFilters ? (
          <a href="/stores" className="text-xs font-semibold text-zinc-400 transition-colors hover:text-[#D4450A]">
            Clear all
          </a>
        ) : null}
      </div> : null}

      {/* Mobile drawer */}
      {showMobile && drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <p className="text-sm font-bold text-zinc-900">Filters</p>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{filterForm}</div>
          </div>
        </div>
      ) : null}

      {/* Desktop sidebar */}
      {showDesktop ? <aside className="hidden w-full shrink-0 lg:block lg:w-64">
        <div className="sticky top-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="mb-5 text-xs font-bold uppercase tracking-widest text-zinc-400">Filters</p>
          {filterForm}
        </div>
      </aside> : null}
    </>
  );
}
