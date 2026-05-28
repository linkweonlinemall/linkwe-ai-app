"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconAdjustments,
  IconCalendarEvent,
  IconClock,
  IconMapPin,
  IconPackage,
  IconSearch,
  IconSearchOff,
  IconStar,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getPopularSearches } from "@/app/actions/search";
import StarRating from "@/components/ui/StarRating";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import {
  canonicalRegionValue,
  getFlatRegionOptions,
  getRegionLabel,
} from "@/lib/regions/tt-regions";
import {
  isServiceCatalogItem,
  productResultAsService,
} from "@/lib/search/resolve-catalog-item";
import type {
  SearchProductResult,
  SearchServiceResult,
  SearchStoreResult,
  UniversalSearchResponse,
} from "@/lib/search/types";

const SCARLET = "#D4450A";

const CARD_LINK =
  "flex h-full flex-col overflow-hidden rounded-[12px] border-[0.5px] border-[var(--color-border-tertiary)] bg-white transition-[border-color] duration-200 hover:border-[rgba(28,28,26,0.2)]";

const RESULT_GRID =
  "grid grid-cols-2 items-stretch gap-2 md:grid-cols-2 md:gap-3 lg:grid-cols-3";

type TabType = "all" | "services" | "stores" | "products";

function AmberStars({ value, count }: { value: number; count: number }) {
  const rounded = Math.round(value);
  return (
    <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
      <div className="flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((star) => (
          <IconStar
            key={star}
            className={`size-3 ${star <= rounded ? "fill-amber-400 text-amber-400" : "fill-zinc-200 text-zinc-200"}`}
            stroke={1.5}
          />
        ))}
      </div>
      <span>
        {value.toFixed(1)} ({count})
      </span>
    </div>
  );
}

function SearchProductCard({ product: p }: { product: SearchProductResult }) {
  return (
    <Link href={`/products/${p.slug}`} prefetch className={CARD_LINK}>
      <div className="relative h-[140px] w-full shrink-0 bg-[#F7F5F2]">
        {p.images[0] ? (
          <Image
            src={p.images[0]}
            alt={p.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 50vw, 33vw"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <IconPackage className="size-10 text-[var(--text-muted)]" stroke={1.25} aria-hidden />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-[20px] bg-[#EAF3DE] px-2 py-[3px] text-[9px] font-bold uppercase text-[#3B6D11]">
          Product
        </span>
      </div>
      <div className="flex flex-1 flex-col px-3 py-[10px]">
        <p className="text-[10px] text-[var(--text-secondary)]">
          {p.store.name} · {getRegionLabel(p.store.region)}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[12px] font-medium leading-snug text-[var(--text-primary)]">
          {p.name}
        </p>
        <p className="mt-1 text-[14px] font-medium" style={{ color: SCARLET }}>
          TTD {p.price.toFixed(2)}
        </p>
        {p.reviewCount > 0 ? (
          <div className="mt-auto pt-1">
            <AmberStars value={p.averageRating ?? 0} count={p.reviewCount} />
          </div>
        ) : (
          <span className="mt-auto block min-h-[1px]" aria-hidden />
        )}
      </div>
    </Link>
  );
}

function SearchServiceCard({ service: s }: { service: SearchServiceResult }) {
  return (
    <Link
      href={`/service/${s.slug}`}
      prefetch
      className={`${CARD_LINK} border-l-[3px] border-l-[#1A7FB5]`}
    >
      <div className="relative h-[140px] w-full shrink-0 bg-[#E6F1FB]">
        {s.images[0] ? (
          <Image
            src={s.images[0]}
            alt={s.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 50vw, 33vw"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <IconCalendarEvent className="size-10 text-[#1A7FB5]" stroke={1.25} aria-hidden />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-[20px] bg-[#E6F1FB] px-2 py-[3px] text-[9px] font-bold uppercase text-[#185FA5]">
          Service
        </span>
      </div>
      <div className="flex flex-1 flex-col px-3 py-[10px]">
        <p className="text-[10px] text-[var(--text-muted)]">
          {s.store.name} · {getRegionLabel(s.store.region)}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[12px] font-medium leading-snug text-[var(--text-primary)]">
          {s.title}
        </p>
        <p className="mt-1 text-[14px] font-medium text-[#1A7FB5]">TTD {s.price.toFixed(2)}</p>
        <p className="mt-1 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
          <IconClock className="size-3 shrink-0" stroke={1.75} aria-hidden />
          {s.durationMinutes} min
        </p>
        <span className="mt-auto flex h-7 w-full items-center justify-center rounded-[6px] bg-[#E6F1FB] text-[11px] font-semibold text-[#185FA5]">
          Book now
        </span>
      </div>
    </Link>
  );
}

function SearchStoreCard({ store: s }: { store: SearchStoreResult }) {
  const tagPreview = s.tags.slice(0, 2);

  return (
    <Link href={`/store/${s.slug}`} prefetch className={CARD_LINK}>
      <div className="relative h-[70px] w-full shrink-0 bg-[#1C1C1A]">
        {s.coverPhotoUrl ? (
          <Image
            src={s.coverPhotoUrl}
            alt=""
            fill
            className="object-cover object-center"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 50vw, 33vw"
            loading="lazy"
          />
        ) : null}
        <span className="absolute right-2 top-2 rounded-[20px] bg-[#FAEEDA] px-2 py-[3px] text-[9px] font-bold uppercase text-[#854F0B]">
          Store
        </span>
      </div>
      <div className="relative flex flex-1 flex-col px-3 pb-3 pt-7">
        <div
          className="absolute -top-[22px] left-3 z-[1] flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-[2.5px] border-white text-xs font-bold text-white"
          style={{ backgroundColor: SCARLET }}
        >
          {s.logoUrl ? (
            <Image src={s.logoUrl} alt="" width={44} height={44} className="h-full w-full object-cover" />
          ) : (
            s.name.slice(0, 2).toUpperCase()
          )}
        </div>
        <p className="text-[13px] font-medium text-[var(--text-primary)]">{s.name}</p>
        <p className="text-[10px] text-[var(--text-muted)]">
          {categoryLabel(s.category)} · {getRegionLabel(s.region)}
        </p>
        {tagPreview.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {tagPreview.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-[var(--text-muted)]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <div className="min-h-0 flex-1" aria-hidden />
        <div className="mt-2 flex items-center justify-between border-t border-[var(--color-border-tertiary)] pt-2 text-[10px]">
          {s.reviewCount > 0 ? (
            <StarRating value={Math.round(s.averageRating ?? 0)} readonly size="sm" />
          ) : (
            <span className="text-[var(--text-muted)]">No reviews</span>
          )}
          <span className="text-[var(--text-muted)]">
            {s.productCount} {s.productCount === 1 ? "product" : "products"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function categoryLabel(slug: string | null | undefined): string {
  if (!slug) return "General";
  const hit = PRODUCT_CATEGORIES.find((c) => c.value === slug);
  return hit?.label ?? slug.replace(/_/g, " ");
}

function buildSearchUrl(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") sp.set(k, v);
  }
  return `/search?${sp.toString()}`;
}

export default function SearchPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q")?.trim() ?? "";
  const [data, setData] = useState<UniversalSearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [headerQuery, setHeaderQuery] = useState(q);
  const [filterOpen, setFilterOpen] = useState(false);
  const [popular, setPopular] = useState<string[]>([]);
  const type = (searchParams.get("type") as TabType) || "all";
  const region = searchParams.get("region") ?? "";
  const category = searchParams.get("category") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const rating = searchParams.get("rating") ?? "";
  const page = searchParams.get("page") ?? "1";

  const detectedRegion = data?.detectedRegion ?? null;
  const effectiveRegion = region || detectedRegion || "";

  useEffect(() => {
    setHeaderQuery(q);
  }, [q]);

  useEffect(() => {
    void getPopularSearches().then(setPopular);
  }, []);

  const fetchResults = useCallback(async () => {
    if (q.length < 2) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams({ q, page, type });
      if (effectiveRegion) sp.set("region", canonicalRegionValue(effectiveRegion));
      if (category) sp.set("category", category);
      if (minPrice) sp.set("minPrice", minPrice);
      if (maxPrice) sp.set("maxPrice", maxPrice);
      if (rating) sp.set("rating", rating);
      const res = await fetch(`/api/search?${sp}`);
      if (!res.ok) throw new Error("Search failed");
      setData((await res.json()) as UniversalSearchResponse);
    } catch {
      setError("Could not load search results");
    } finally {
      setLoading(false);
    }
  }, [q, type, effectiveRegion, category, minPrice, maxPrice, rating, page]);

  useEffect(() => {
    void fetchResults();
  }, [fetchResults]);

  function updateParams(updates: Record<string, string | undefined>) {
    router.push(
      buildSearchUrl({
        q,
        type,
        region: effectiveRegion || undefined,
        category: category || undefined,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
        rating: rating || undefined,
        page: "1",
        ...updates,
      }),
    );
  }

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: "all", label: "All", count: data?.results.total ?? 0 },
    { id: "services", label: "Services", count: data?.counts.services ?? 0 },
    { id: "stores", label: "Stores", count: data?.counts.stores ?? 0 },
    { id: "products", label: "Products", count: data?.counts.products ?? 0 },
  ];

  const showProducts = type === "all" || type === "products";
  const showServices = type === "all" || type === "services";
  const showStores = type === "all" || type === "stores";

  const categoriesInResults = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const p of data.results.products) if (p.category) set.add(p.category);
    for (const s of data.results.services) if (s.category) set.add(s.category);
    for (const s of data.results.stores) if (s.category) set.add(s.category);
    return [...set].sort();
  }, [data]);

  const filterSidebar = (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">Region</p>
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {getFlatRegionOptions().map((r) => (
            <label key={r.value} className="flex min-h-[36px] cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={canonicalRegionValue(effectiveRegion) === r.value}
                onChange={() =>
                  updateParams({
                    region:
                      canonicalRegionValue(effectiveRegion) === r.value ? undefined : r.value,
                  })
                }
              />
              {r.label}
            </label>
          ))}
        </div>
      </div>
      {categoriesInResults.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">Category</p>
          <div className="space-y-1">
            {categoriesInResults.map((c) => (
              <label key={c} className="flex min-h-[36px] cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={category === c}
                  onChange={() => updateParams({ category: category === c ? undefined : c })}
                />
                {categoryLabel(c)}
              </label>
            ))}
          </div>
        </div>
      ) : null}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">Price (TTD)</p>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            defaultValue={minPrice}
            className="w-full rounded-lg border border-zinc-200 px-2 py-2 text-xs"
            onBlur={(e) => updateParams({ minPrice: e.target.value || undefined })}
          />
          <input
            type="number"
            placeholder="Max"
            defaultValue={maxPrice}
            className="w-full rounded-lg border border-zinc-200 px-2 py-2 text-xs"
            onBlur={(e) => updateParams({ maxPrice: e.target.value || undefined })}
          />
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">Rating</p>
        {[
          { v: "4", label: "4★ & above" },
          { v: "3", label: "3★ & above" },
          { v: "", label: "Any" },
        ].map((opt) => (
          <label key={opt.label} className="mb-1 flex min-h-[36px] cursor-pointer items-center gap-2 text-xs">
            <input
              type="radio"
              name="rating"
              checked={rating === opt.v}
              onChange={() => updateParams({ rating: opt.v || undefined })}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-[80px] lg:pb-8">
      <header className="bg-[#1C1C1A] px-4 py-4 md:px-8">
        <form
          className="mx-auto flex max-w-2xl items-center gap-2 rounded-[10px] border-[0.5px] border-white/[0.15] bg-white/[0.10] px-4 py-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (headerQuery.trim()) {
              router.push(buildSearchUrl({ q: headerQuery.trim(), type, page: "1" }));
            }
          }}
        >
          <IconSearch className="size-5 shrink-0 text-white/50" stroke={1.75} aria-hidden />
          <input
            type="search"
            value={headerQuery}
            onChange={(e) => setHeaderQuery(e.target.value)}
            className="min-h-[44px] flex-1 border-0 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            placeholder="Search products, stores, services..."
            suppressHydrationWarning
          />
        </form>

        <div className="mx-auto mt-4 flex max-w-4xl flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => updateParams({ type: tab.id === "all" ? undefined : tab.id })}
              className={`flex min-h-[36px] items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                type === tab.id
                  ? "bg-white/[0.15] text-white"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {tab.label}
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]" suppressHydrationWarning>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </header>

      {(detectedRegion || effectiveRegion) && !region ? (
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 bg-[#E6F1FB] px-4 py-2.5 text-sm text-[#185FA5] md:px-8">
          <span className="flex items-center gap-1.5">
            <IconMapPin className="size-4" aria-hidden />
            Showing results near {getRegionLabel(detectedRegion ?? effectiveRegion)}
          </span>
          <button
            type="button"
            className="text-xs font-semibold underline"
            onClick={() => updateParams({ region: undefined })}
          >
            Clear
          </button>
        </div>
      ) : null}

      <div className="mx-auto max-w-6xl px-4 py-4 md:px-8">
        <div className="mb-3 flex gap-2 overflow-x-auto lg:hidden">
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="flex min-h-[36px] shrink-0 items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold"
          >
            <IconAdjustments className="size-3.5" aria-hidden /> Filters
          </button>
          {effectiveRegion ? (
            <span className="flex min-h-[36px] shrink-0 items-center rounded-full bg-[#D4450A] px-3 text-xs font-semibold text-white">
              {getRegionLabel(effectiveRegion)}
            </span>
          ) : null}
          {rating === "4" ? (
            <span className="flex min-h-[36px] shrink-0 items-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold">
              4★+
            </span>
          ) : null}
        </div>

        <div className="flex gap-6">
          <aside className="hidden w-[200px] shrink-0 lg:block">
            <div className="rounded-[12px] border-[0.5px] border-[rgba(28,28,26,0.12)] bg-white p-4">
              {filterSidebar}
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {loading ? (
              <div className={RESULT_GRID}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-64 animate-pulse rounded-[12px] border border-zinc-100 bg-white"
                  />
                ))}
              </div>
            ) : error ? (
              <p className="text-center text-sm text-red-600">{error}</p>
            ) : data && data.results.total === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <IconSearchOff className="mb-3 size-12 text-zinc-300" stroke={1.25} aria-hidden />
                <p className="text-lg font-bold text-zinc-900">No results for &ldquo;{q}&rdquo;</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Try a different search term or browse by category
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {popular.map((term) => (
                    <Link
                      key={term}
                      href={buildSearchUrl({ q: term })}
                      className="min-h-[36px] rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium hover:border-[#D4450A]"
                    >
                      {term}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className={RESULT_GRID}>
                {showServices
                  ? data!.results.services.map((s) => <SearchServiceCard key={s.id} service={s} />)
                  : null}
                {showStores
                  ? data!.results.stores.map((s) => <SearchStoreCard key={s.id} store={s} />)
                  : null}
                {showProducts
                  ? data!.results.products.map((p) =>
                      isServiceCatalogItem(p) ? (
                        <SearchServiceCard key={p.id} service={productResultAsService(p)} />
                      ) : (
                        <SearchProductCard key={p.id} product={p} />
                      ),
                    )
                  : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {filterOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[190] bg-black/50 lg:hidden"
            aria-label="Close filters"
            onClick={() => setFilterOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-[200] max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white px-4 pb-6 pt-3 lg:hidden">
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-zinc-300" />
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Filters</p>
              <button
                type="button"
                className="text-xs font-semibold text-[#D4450A]"
                onClick={() =>
                  router.push(buildSearchUrl({ q, type: type === "all" ? undefined : type }))
                }
              >
                Reset all
              </button>
            </div>
            {filterSidebar}
            <button
              type="button"
              className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: SCARLET }}
              onClick={() => setFilterOpen(false)}
            >
              Show {data?.results.total ?? 0} results
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
