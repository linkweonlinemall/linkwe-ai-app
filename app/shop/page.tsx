import Link from "next/link";
import { Suspense } from "react";

import { Prisma } from "@prisma/client";

import { getWishlistProductIds } from "@/app/actions/wishlist";
import ProductSearchBar from "@/components/shop/ProductSearchBar";
import ShopProductCardActions from "@/components/shop/ShopProductCardActions";
import ShopFilters from "@/components/shop/ShopFilters";
import PublicNav from "@/components/layout/PublicNav";
import WishlistButton from "@/components/ui/WishlistButton";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import { getRegionLabel } from "@/lib/regions/tt-regions";

const CATEGORIES = [{ value: "all", label: "All" }, ...PRODUCT_CATEGORIES];

type Props = {
  searchParams: Promise<{
    category?: string;
    region?: string;
    q?: string;
    sort?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    condition?: string;
    brand?: string;
    colour?: string;
    size?: string;
  }>;
};

function parsePriceParam(v: string | undefined) {
  if (!v) return undefined;
  const n = parseFloat(v);
  return Number.isNaN(n) ? undefined : n;
}

export default async function ShopPage({ searchParams }: Props) {
  const session = await getSession();
  const user = session
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;
  const continueHref = user ? getRoleDashboardPath(user.role) : null;

  const params = await searchParams;
  const category = params.category && params.category !== "all" ? params.category : undefined;
  const region = params.region || undefined;
  const q = params.q || undefined;
  const sort = params.sort ?? "featured";
  const minPrice = parsePriceParam(params.minPrice);
  const maxPrice = parsePriceParam(params.maxPrice);
  const inStock = params.inStock === "true";
  const condition = params.condition || undefined;
  const brand = params.brand || undefined;
  const colour = params.colour || undefined;
  const size = params.size || undefined;

  const shopFiltersKey = [
    params.category ?? "",
    sort,
    params.minPrice ?? "",
    params.maxPrice ?? "",
    params.inStock ?? "",
    params.condition ?? "",
    params.brand ?? "",
    params.colour ?? "",
    params.size ?? "",
  ].join("|");

  /** Colour/size: Postgres JSON lacks Prisma-client `array_contains` on Json; use JSONB @> containment. */
  let variantProductIdFilter: { id: { in: string[] } } | Record<string, never> = {};
  if (colour || size) {
    const predicates: Prisma.Sql[] = [];
    if (colour) {
      predicates.push(
        Prisma.sql`pv."attributes"::jsonb @> (${JSON.stringify([{ name: "Colour", value: colour }])})::jsonb`,
      );
    }
    if (size) {
      predicates.push(
        Prisma.sql`pv."attributes"::jsonb @> (${JSON.stringify([{ name: "Size", value: size }])})::jsonb`,
      );
    }
    const variantWhere = predicates.length === 1 ? predicates[0]! : Prisma.join(predicates, " AND ");
    const rows = await prisma.$queryRaw<{ productId: string }[]>`
      SELECT DISTINCT pv."productId"
      FROM "ProductVariant" pv
      WHERE ${variantWhere}`;
    variantProductIdFilter = rows.length ? { id: { in: rows.map((r) => r.productId) } } : { id: { in: [] } };
  }

  const orderBy =
    sort === "price_asc"
      ? [{ price: "asc" as const }]
      : sort === "price_desc"
        ? [{ price: "desc" as const }]
        : sort === "newest"
          ? [{ createdAt: "desc" as const }]
          : sort === "name"
            ? [{ name: "asc" as const }]
            : [{ isFeatured: "desc" as const }, { createdAt: "desc" as const }];

  const products = await prisma.product.findMany({
    where: {
      isPublished: true,
      isService: false,
      ...(category ? { category } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      ...(region ? { store: { region } } : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            price: {
              ...(minPrice !== undefined ? { gte: minPrice } : {}),
              ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
            },
          }
        : {}),
      ...(inStock ? { stock: { gt: 0 } } : {}),
      ...(condition ? { condition: condition as any } : {}),
      ...(brand ? { brand: { contains: brand, mode: "insensitive" as const } } : {}),
      ...variantProductIdFilter,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      compareAtPrice: true,
      images: true,
      category: true,
      isFeatured: true,
      hasVariants: true,
      isDigital: true,
      store: { select: { name: true, slug: true, region: true } },
    },
    orderBy,
    take: 60,
  });

  const wishlistIds = await getWishlistProductIds();

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16 sm:pb-0">
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
      />

      {/* Amazon-style search hero bar */}
      <div className="bg-[#1C1C1A] py-4">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
          <ProductSearchBar defaultValue={q} category={category} />
        </div>
      </div>

      {/* Category horizontal scroll strip */}
      <div className="border-b border-zinc-200 bg-white shadow-sm">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto py-2.5 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.value}
                href={cat.value === "all" ? "/shop" : `/shop?category=${cat.value}`}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  (!category && cat.value === "all") || category === cat.value
                    ? "bg-[#D4450A] text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">
        {/* Results header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">
              {category
                ? CATEGORIES.find((c) => c.value === category)?.label ?? "Products"
                : q
                  ? `Results for "${q}"`
                  : "All Products"}
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {products.length} product{products.length !== 1 ? "s" : ""} from local vendors across Trinidad & Tobago
            </p>
          </div>
          {(category || q) && (
            <Link
              href="/shop"
              className="rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Clear filters
            </Link>
          )}
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <Suspense
            fallback={
              <aside className="hidden lg:block w-56 shrink-0">
                <div className="h-96 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100" />
              </aside>
            }
          >
            <div className="hidden lg:block w-56 shrink-0">
              <ShopFilters
                key={shopFiltersKey}
                defaultCategory={category ?? "all"}
                defaultSort={sort}
                productCount={products.length}
                availableBrands={["Aurevia", "Bad Dawg", "Serato", "Virgo Vibes TT", "VYNTIX"]}
                availableCategories={[
                  "bags_luggage",
                  "clothing_apparel",
                  "electronics",
                  "health_beauty",
                  "home_kitchen",
                  "jewellery_watches",
                  "stationery",
                ]}
                availableColours={[
                  { value: "black", hex: "#000000" },
                  {
                    value: "multicolour",
                    hex: "linear-gradient(135deg, #ff0000, #ffff00, #00ff00, #0000ff)",
                  },
                ]}
                availableSizes={["S", "M"]}
              />
            </div>
          </Suspense>

          {/* Product grid */}
          <div className="min-w-0 flex-1">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-24 text-center">
                <span className="mb-4 text-6xl">🔍</span>
                <h2 className="mb-2 text-lg font-bold text-zinc-900">No products found</h2>
                <p className="mb-6 text-sm text-zinc-500">Try a different category or search term</p>
                <Link
                  href="/shop"
                  className="rounded-full bg-[#D4450A] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Browse all products
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {products.map((product) => {
                  const discount =
                    product.compareAtPrice && product.compareAtPrice > product.price
                      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
                      : null;
                  return (
                    <div
                      key={product.id}
                      className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-zinc-300"
                    >
                      <Link href={`/products/${product.slug}`} className="block">
                        {/* Image */}
                        <div className="relative aspect-square overflow-hidden bg-zinc-100">
                          {product.images[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <span className="text-4xl text-zinc-300">📦</span>
                            </div>
                          )}
                          <div className="absolute right-2 top-2 z-10">
                            <WishlistButton
                              productId={product.id}
                              initialWishlisted={wishlistIds.includes(product.id)}
                              size="sm"
                            />
                          </div>
                          {/* Badges */}
                          <div className="absolute left-2 top-2 flex flex-col gap-1">
                            {product.isFeatured ? (
                              <span className="rounded-full bg-[#D4450A] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow">
                                Featured
                              </span>
                            ) : null}
                            {discount ? (
                              <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold text-white shadow">
                                -{discount}%
                              </span>
                            ) : null}
                          </div>
                          {product.isDigital ? (
                            <span className="absolute bottom-2 left-2 rounded-full bg-[#1A7FB5] px-2 py-0.5 text-[9px] font-bold text-white">
                              ⬇️ Digital
                            </span>
                          ) : null}
                        </div>
                      </Link>

                      {/* Info */}
                      <div className="flex flex-1 flex-col gap-1 p-3">
                        <Link href={`/products/${product.slug}`} className="block flex min-h-0 flex-1 flex-col gap-1">
                          <p className="truncate text-[10px] font-medium text-zinc-400">
                            {product.store.name}
                            {product.store.region ? ` · ${getRegionLabel(product.store.region)}` : ""}
                          </p>
                          <p className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900">
                            {product.name}
                          </p>
                          <div className="mt-auto pt-2">
                            <p className="text-sm font-black text-[#D4450A]">TTD {product.price.toFixed(2)}</p>
                            {product.compareAtPrice != null && product.compareAtPrice > product.price ? (
                              <p className="text-xs text-zinc-400 line-through">
                                TTD {product.compareAtPrice.toFixed(2)}
                              </p>
                            ) : null}
                          </div>
                        </Link>
                        <ShopProductCardActions
                          hasVariants={product.hasVariants}
                          isDigital={product.isDigital}
                          slug={product.slug}
                          productId={product.id}
                        />
                      </div>
                    </div>
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
