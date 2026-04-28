import Link from "next/link";
import type { Metadata } from "next";

import {
  getPublicStorePopularTags,
  getPublicStores,
  getPublicStoreRegions,
  type PublicStoresFilters,
  type PublicStoreSort,
} from "@/app/actions/public-stores";
import PublicNav from "@/components/layout/PublicNav";
import PublicStoreCard from "@/components/storefront/PublicStoreCard";
import StoreSearchBar from "@/components/storefront/StoreSearchBar";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const CATEGORIES = [
  { value: "all", label: "All categories" },
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
] as const;

const SORTS: { value: PublicStoreSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most products" },
  { value: "rating", label: "Highest rated" },
  { value: "nearest", label: "Nearest to you" },
];

export const metadata: Metadata = {
  title: "Discover stores · LinkWe",
  description:
    "Browse active vendors on LinkWe — shop local across Trinidad & Tobago.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function pickString(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

function clampSort(v: string | undefined): PublicStoreSort {
  if (v === "newest" || v === "popular" || v === "rating" || v === "nearest") return v;
  return "newest";
}

function buildStoreListUrl(
  query: {
    q: string;
    category: string;
    region: string;
    tag: string;
    sort: PublicStoreSort;
    lat: string;
    lng: string;
    page: number;
  },
  updates: Partial<typeof query>
): string {
  const next = { ...query, ...updates };
  const p = new URLSearchParams();
  const qv = next.q.trim();
  if (qv) p.set("q", qv);
  if (next.category && next.category !== "all") p.set("category", next.category);
  if (next.region.trim()) p.set("region", next.region.trim());
  if (next.tag.trim()) p.set("tag", next.tag.trim());
  if (next.sort && next.sort !== "newest") p.set("sort", next.sort);
  const lat = next.lat.trim();
  const lng = next.lng.trim();
  if (lat) p.set("lat", lat);
  if (lng) p.set("lng", lng);
  if (next.page > 1) p.set("page", String(next.page));
  const s = p.toString();
  return `/stores${s ? `?${s}` : ""}`;
}

export default async function StoresDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  const navUser = session
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;
  const continueHref = navUser ? getRoleDashboardPath(navUser.role) : null;

  const sp = await searchParams;

  const qRaw = (pickString(sp, "q") ?? "").trim();
  const categoryRaw = (pickString(sp, "category") ?? "").trim();
  const category = !categoryRaw || categoryRaw === "all" ? "all" : categoryRaw;
  const region = (pickString(sp, "region") ?? "").trim();
  const tag = (pickString(sp, "tag") ?? "").trim();
  const sort = clampSort(pickString(sp, "sort"));
  const latRaw = pickString(sp, "lat") ?? "";
  const lngRaw = pickString(sp, "lng") ?? "";
  const pageRaw = parseInt(pickString(sp, "page") ?? "1", 10);
  const page = Number.isFinite(pageRaw) ? pageRaw : 1;

  const latParsed = parseFloat(latRaw);
  const lngParsed = parseFloat(lngRaw);
  const userLat = Number.isFinite(latParsed) ? latParsed : null;
  const userLng = Number.isFinite(lngParsed) ? lngParsed : null;

  const filters: PublicStoresFilters = {
    categoryId: category === "all" ? undefined : category,
    region: region.trim() || undefined,
    tag: tag.trim() || undefined,
    sort,
    userLat,
    userLng,
  };

  const [regionsFromDb, tags, result] = await Promise.all([
    getPublicStoreRegions(),
    getPublicStorePopularTags(32),
    getPublicStores(qRaw.trim() || undefined, filters, page),
  ]);

  const mergedRegions = Array.from(new Set([...regionsFromDb].filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );

  const queryState = {
    q: qRaw,
    category,
    region,
    tag,
    sort,
    lat: latRaw,
    lng: lngRaw,
    page: result.page,
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20 sm:pb-8">
      <PublicNav
        user={
          navUser ? { name: navUser.fullName ?? "Account", href: continueHref! } : null
        }
        dashboardHref={continueHref ?? undefined}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="overflow-visible rounded-2xl border border-zinc-200 bg-gradient-to-br from-[#2E2D2A] via-[#1C1C1A] to-[#2E2D2A] p-6 shadow-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-200/90">
            Marketplaces
          </p>
          <h1 className="mt-3 text-balance text-3xl font-bold text-white sm:text-4xl">
            Discover stores
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/75">
            Discover vendors — live shop products, published listings, or shops that finished onboarding.
          </p>
          <div className="mt-8">
            <StoreSearchBar />
          </div>
        </section>

        <div className="mt-10 flex flex-col gap-10 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-64">
            <form method="GET" className="space-y-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <input type="hidden" name="q" value={qRaw} />
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Filters</p>

              <div>
                <label className="block text-xs font-medium text-zinc-600">Region</label>
                <select
                  name="region"
                  defaultValue={region}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">All regions</option>
                  {mergedRegions.map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600">Category</label>
                <select
                  name="category"
                  defaultValue={category}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600">Tag</label>
                <select
                  name="tag"
                  defaultValue={tag}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
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
                <label className="block text-xs font-medium text-zinc-600">Sort</label>
                <select
                  name="sort"
                  defaultValue={sort}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <details className="rounded-lg bg-zinc-50 p-2 text-xs text-zinc-600">
                <summary className="cursor-pointer select-none font-medium">
                  Location for “nearest”
                </summary>
                <p className="mt-2 text-[11px] leading-relaxed">
                  Optional decimals (WGS-84). Example: latitude <code>10.65</code>, longitude{" "}
                  <code>-61.52</code> for Trinidad.
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="sr-only" htmlFor="lat">
                      Latitude
                    </label>
                    <input
                      id="lat"
                      name="lat"
                      defaultValue={latRaw}
                      inputMode="decimal"
                      placeholder="Latitude"
                      className="w-full rounded border border-zinc-200 px-2 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="sr-only" htmlFor="lng">
                      Longitude
                    </label>
                    <input
                      id="lng"
                      name="lng"
                      defaultValue={lngRaw}
                      inputMode="decimal"
                      placeholder="Longitude"
                      className="w-full rounded border border-zinc-200 px-2 py-1.5"
                    />
                  </div>
                </div>
              </details>

              <button
                type="submit"
                className="w-full rounded-lg bg-[#1C1C1A] py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Apply filters
              </button>
              <Link
                href="/stores"
                className="block w-full rounded-lg border border-zinc-200 bg-white py-2 text-center text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Clear filters
              </Link>
            </form>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-zinc-500">
                {result.total > 0 ? (
                  <>
                    Showing {(result.page - 1) * result.pageSize + 1}–
                    {Math.min(result.page * result.pageSize, result.total)} of {result.total} stores
                  </>
                ) : (
                  "No matching stores"
                )}
              </p>
            </div>

            {sort === "nearest" && (latRaw.trim() === "" || lngRaw.trim() === "") ? (
              <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                Enter both latitude and longitude to sort stores by distance.
              </p>
            ) : null}

            {result.items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center">
                <p className="mb-3 text-lg text-zinc-900">No stores matched</p>
                <p className="mb-6 text-sm text-zinc-500">
                  Try widening your filters or shortening your search.
                </p>
                <Link href="/stores" className="text-sm font-medium text-[#D4450A] hover:underline">
                  Reset discovery
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((s) => (
                  <PublicStoreCard key={s.id} store={s} />
                ))}
              </div>
            )}

            {result.totalPages > 1 ? (
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                {result.page > 1 ? (
                  <Link
                    href={buildStoreListUrl(queryState, { page: result.page - 1 })}
                    className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm hover:bg-zinc-50"
                  >
                    Previous
                  </Link>
                ) : (
                  <span className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-400">
                    Previous
                  </span>
                )}
                <span className="text-sm text-zinc-500">
                  Page {result.page} / {result.totalPages}
                </span>
                {result.page < result.totalPages ? (
                  <Link
                    href={buildStoreListUrl(queryState, { page: result.page + 1 })}
                    className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm hover:bg-zinc-50"
                  >
                    Next
                  </Link>
                ) : (
                  <span className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-400">
                    Next
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
