import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getStoreBySlug,
  getStoreProducts,
  getStoreReviews,
} from "@/app/actions/public-stores";
import PublicNav from "@/components/layout/PublicNav";
import ProductCardChooseOptionsLink from "@/components/shop/ProductCardChooseOptionsLink";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";

type WeekSchedule = Record<
  string,
  { closed: boolean; allDay: boolean; slots: { from: string; to: string }[] }
>;

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

function formatCategoryLabel(categoryId: string): string {
  return categoryId.replace(/_/g, " ");
}

function formatDayLabel(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function OpeningHoursBlock({ hours }: { hours: unknown }) {
  if (hours == null || typeof hours !== "object" || Array.isArray(hours)) {
    return null;
  }
  const week = hours as WeekSchedule;
  const rows: { day: string; text: string }[] = [];
  for (const day of DAY_ORDER) {
    const row = week[day];
    if (!row) continue;
    let text: string;
    if (row.closed) {
      text = "Closed";
    } else if (row.allDay) {
      text = "Open (all day)";
    } else if (row.slots?.length) {
      text = row.slots.map((s) => `${s.from}–${s.to}`).join(", ");
    } else {
      text = "Hours vary";
    }
    rows.push({ day, text });
  }
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-900">Opening hours</h2>
      <ul className="mt-3 space-y-2 text-sm text-zinc-600">
        {rows.map(({ day, text }) => (
          <li key={day} className="flex justify-between gap-4">
            <span className="font-medium text-zinc-800">{formatDayLabel(day)}</span>
            <span className="text-right text-zinc-600">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialRow({ links }: { links: Record<string, string> }) {
  const entries = Object.entries(links).filter(([, url]) => typeof url === "string" && url);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {entries.map(([label, url]) => (
        <a
          key={label}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:border-[#D4450A]/40 hover:text-[#D4450A]"
        >
          {label}
        </a>
      ))}
    </div>
  );
}

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ productPage?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    return { title: "Store · LinkWe" };
  }
  const store = await getStoreBySlug(normalized);
  if (!store) {
    return { title: "Store · LinkWe" };
  }
  return {
    title: `${store.name} · LinkWe`,
    description: store.tagline ?? store.description ?? "Shop on LinkWe",
  };
}

export default async function PublicStoreSlugPage({ params, searchParams }: Props) {
  const session = await getSession();
  const dashboardHref = session ? getRoleDashboardPath(session.role) : null;

  const { slug } = await params;
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    notFound();
  }

  const sp = await searchParams;
  const productPageRaw = parseInt(sp.productPage ?? "1", 10);
  const productPage = Number.isFinite(productPageRaw) ? productPageRaw : 1;

  const store = await getStoreBySlug(normalized);
  if (!store) {
    notFound();
  }

  const [catalog, reviews] = await Promise.all([
    getStoreProducts(store.id, productPage, 24),
    getStoreReviews(store.id, 30),
  ]);

  const initials =
    store.name
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .map((w) => w[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || store.name.charAt(0).toUpperCase();

  const reviewAverage =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  const paginationBase = `/stores/${store.slug}`;
  const qs = (page: number) => {
    const p = new URLSearchParams();
    if (page > 1) p.set("productPage", String(page));
    const s = p.toString();
    return s ? `${paginationBase}?${s}` : paginationBase;
  };

  return (
    <div className="min-h-screen pb-20 sm:pb-8" style={{ backgroundColor: "var(--surface)" }}>
      <PublicNav
        transparent
        user={session ? { name: session.fullName ?? "Account", href: dashboardHref! } : null}
        dashboardHref={dashboardHref ?? undefined}
      />

      <section className="relative w-full" style={{ height: "clamp(180px, 28vw, 320px)" }}>
        {store.coverPhotoUrl ? (
          <img
            src={store.coverPhotoUrl}
            alt={`${store.name} cover`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-[#2E2D2A] via-[#1C1C1A] to-[#45443F]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
        <div
          className="absolute bottom-0 left-0 right-0 h-24"
          style={{ background: "linear-gradient(to top, var(--surface), transparent)" }}
        />
      </section>

      <section className="relative px-4 pb-2 sm:px-6" style={{ maxWidth: 1024, margin: "0 auto", marginTop: -48 }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4 sm:gap-5">
            <div
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl sm:h-24 sm:w-24"
              style={{
                border: "4px solid var(--surface)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              }}
            >
              {store.logoUrl ? (
                <img src={store.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-2xl font-bold text-white sm:text-3xl"
                  style={{ backgroundColor: "var(--scarlet)" }}
                >
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0 pb-1">
              <h1
                className="truncate text-xl font-bold sm:text-2xl"
                style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
              >
                {store.name}
              </h1>
              {store.tagline ? (
                <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
                  {store.tagline}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                <span>{store.region.replace(/_/g, " ")}</span>
                <span
                  className="rounded-full px-2 py-0.5"
                  style={{
                    backgroundColor: "#F7F7F6",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--card-border-subtle)",
                  }}
                >
                  {formatCategoryLabel(store.categoryId)}
                </span>
                {reviewAverage != null ? (
                  <span className="tabular-nums text-amber-700">
                    ★ {reviewAverage.toFixed(1)}
                    <span className="font-normal text-zinc-500">
                      {" "}
                      ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
                    </span>
                  </span>
                ) : (
                  <span className="text-zinc-400">No reviews yet</span>
                )}
              </div>
            </div>
          </div>

          <Link
            href={`/shop?region=${encodeURIComponent(store.region)}`}
            className="shrink-0 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20 sm:mb-2"
          >
            More in this region
          </Link>
        </div>
      </section>

      <main className="mx-auto max-w-[1024px] space-y-8 px-4 py-6 sm:px-6">
        {store.description ? (
          <div
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            style={{ borderColor: "var(--card-border-subtle)" }}
          >
            <h2 className="text-sm font-semibold text-zinc-900">About</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">{store.description}</p>
            {store.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {store.tags.slice(0, 12).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-[#b63a08] ring-1 ring-orange-100"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
            {store.socialLinks && Object.keys(store.socialLinks).length > 0 ? (
              <SocialRow links={store.socialLinks} />
            ) : null}
            {store.address ? (
              <p className="mt-3 text-sm text-zinc-500">📍 {store.address}</p>
            ) : null}
          </div>
        ) : store.tags.length > 0 ||
          (store.socialLinks && Object.keys(store.socialLinks).length > 0) ||
          store.address ? (
          <div
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            style={{ borderColor: "var(--card-border-subtle)" }}
          >
            <h2 className="text-sm font-semibold text-zinc-900">About</h2>
            {store.tags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {store.tags.slice(0, 12).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-[#b63a08] ring-1 ring-orange-100"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">Hosted on LinkWe.</p>
            )}
            {store.socialLinks && Object.keys(store.socialLinks).length > 0 ? (
              <SocialRow links={store.socialLinks} />
            ) : null}
            {store.address ? (
              <p className="mt-3 text-sm text-zinc-500">📍 {store.address}</p>
            ) : null}
          </div>
        ) : null}

        <OpeningHoursBlock hours={store.openingHours} />

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-900">Products</h2>
            <p className="text-sm text-zinc-500">
              {catalog.total} active product{catalog.total !== 1 ? "s" : ""}
            </p>
          </div>

          {catalog.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-12 text-center">
              <p className="text-sm text-zinc-600">This store has no published products right now.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {catalog.items.map((product) => (
                  <div
                    key={product.id}
                    className="group overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-md"
                  >
                    <Link href={`/products/${product.slug}`} className="block">
                      <div className="aspect-square overflow-hidden bg-zinc-100">
                        {product.images[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <span className="text-4xl text-zinc-300">📦</span>
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="p-3">
                      <Link href={`/products/${product.slug}`} className="block">
                        <p className="truncate text-sm font-medium text-zinc-900">{product.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-sm font-bold text-[#D4450A]">
                            TTD {product.price.toFixed(2)}
                          </p>
                          {product.compareAtPrice != null && (
                            <p className="text-xs text-zinc-400 line-through">
                              TTD {product.compareAtPrice.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </Link>
                      {product.hasVariants ? <ProductCardChooseOptionsLink slug={product.slug} /> : null}
                    </div>
                  </div>
                ))}
              </div>

              {catalog.totalPages > 1 ? (
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  {catalog.page > 1 ? (
                    <Link
                      href={qs(catalog.page - 1)}
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
                    Page {catalog.page} / {catalog.totalPages}
                  </span>
                  {catalog.page < catalog.totalPages ? (
                    <Link
                      href={qs(catalog.page + 1)}
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
            </>
          )}
        </section>

        {reviews.length > 0 ? (
          <section>
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Customer reviews</h2>
            <p className="mb-4 text-sm text-zinc-500">
              Reviews from purchases on this store&apos;s marketplace listings.
            </p>
            <ul className="space-y-4">
              {reviews.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium text-zinc-900">{r.authorName}</div>
                    <div className="text-xs tabular-nums text-amber-600">
                      {"★".repeat(r.rating)}
                      {"☆".repeat(5 - r.rating)}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    {new Date(r.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · {r.listingTitle}
                  </p>
                  {r.title ? <p className="mt-2 text-sm font-medium text-zinc-800">{r.title}</p> : null}
                  {r.body ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600">{r.body}</p>
                  ) : null}
                  <Link
                    href={`/listing/${r.listingSlug}`}
                    className="mt-2 inline-block text-xs font-medium text-[#D4450A] hover:underline"
                  >
                    View listing
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      <footer
        className="mx-auto mt-8 max-w-[1024px] px-4 py-8 text-center sm:px-6"
        style={{ borderTop: "1px solid var(--card-border-subtle)" }}
      >
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
          <Link href="/stores" style={{ color: "var(--scarlet)", textDecoration: "none" }}>
            All stores
          </Link>
          {" · "}
          <Link href="/" style={{ color: "var(--scarlet)", textDecoration: "none" }}>
            LinkWe
          </Link>
          {" "}
          — Trinidad & Tobago&apos;s Marketplace
        </p>
      </footer>
    </div>
  );
}
