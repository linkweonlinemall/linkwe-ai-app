import Link from "next/link";
import type { Metadata } from "next";

import {
  getPublicStorePopularTags,
  getPublicStoreMapPoints,
  getPublicStores,
  type PublicStoresFilters,
  type PublicStoreSort,
} from "@/app/actions/public-stores";
import PublicNav from "@/components/layout/PublicNav";
import PublicStoreCard from "@/components/storefront/PublicStoreCard";
import StoreFiltersDrawer from "@/components/storefront/StoreFiltersDrawer";
import StoreSearchBar from "@/components/storefront/StoreSearchBar";
import StoreDiscoveryMap from "@/components/storefront/StoreDiscoveryMap";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { prisma } from "@/lib/prisma";
import { tw } from "@/lib/design-system";
import { getSavedStoreIds } from "@/app/actions/wishlist";

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

  const unreadCount = await getNavUnreadCount();

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

  const [tags, result, mapStores, savedStoreIds] = await Promise.all([
    getPublicStorePopularTags(32),
    getPublicStores(qRaw.trim() || undefined, filters, page),
    getPublicStoreMapPoints(qRaw.trim() || undefined, filters),
    getSavedStoreIds(),
  ]);

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
    <div className={`min-h-screen pb-mobile-public lg:pb-0 ${tw.bgPage} ${tw.fontSans} antialiased`}>
      <PublicNav
        user={
          navUser ? { name: navUser.fullName ?? "Account", href: continueHref! } : null
        }
        dashboardHref={continueHref ?? undefined}
        unreadCount={unreadCount}
      />

      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8">
        <section className="relative overflow-visible rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(232,130,12,0.28),transparent_32%),linear-gradient(135deg,#30231d,#1C1C1A_55%,#111)] p-5 shadow-[0_24px_70px_rgba(28,28,26,0.18)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-200/90">
            Marketplaces
          </p>
          <h1 className="mt-3 text-balance text-3xl font-bold text-white sm:text-4xl">
            Discover stores
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/75">
            Discover vendors — live shop products, published listings, or shops that finished onboarding.
          </p>
          <div className="mt-6 sm:mt-8">
            <StoreSearchBar />
          </div>
        </section>

        <StoreDiscoveryMap stores={mapStores} />

        <div className="mt-10 flex flex-col gap-10 lg:flex-row">
          <StoreFiltersDrawer
            qRaw={qRaw}
            region={region}
            category={category}
            tag={tag}
            sort={sort}
            latRaw={latRaw}
            lngRaw={lngRaw}
            tags={tags}
            hasFilters={!!(
              region ||
              (category && category !== "all") ||
              tag ||
              (sort && sort !== "newest")
            )}
          />

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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((s) => (
                  <PublicStoreCard key={s.id} store={s} initialSaved={savedStoreIds.includes(s.id)} />
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
