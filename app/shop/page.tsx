import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { PackageSearch, Package, ArrowDownToLine } from "lucide-react";
import { Suspense } from "react";

import { Prisma, ProductCondition } from "@prisma/client";

import { getWishlistProductIds } from "@/app/actions/wishlist";
import ProductSearchBar from "@/components/shop/ProductSearchBar";
import ShopProductCardActions from "@/components/shop/ShopProductCardActions";
import ShopFilters from "@/components/shop/ShopFilters";
import { ProductCardSkeleton, ShopFiltersSidebarSkeleton } from "@/components/ui/content-skeletons";
import PublicNav from "@/components/layout/PublicNav";
import EmptyState from "@/components/ui/empty-state";
import WishlistButton from "@/components/ui/WishlistButton";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { prisma } from "@/lib/prisma";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { sellableStoreWhere } from "@/lib/store/sellable-store";
import { typography, radius, shadow, tw } from "@/lib/design-system";
import { COLOUR_OPTIONS } from "@/lib/variant-options";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse products from local vendors across Trinidad & Tobago. Electronics, fashion, food, services and more.",
};

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

  const unreadCount = await getNavUnreadCount();

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
        Prisma.sql`EXISTS (SELECT 1 FROM jsonb_array_elements(pv."attributes"::jsonb) attr WHERE lower(attr->>'name') = 'colour' AND lower(attr->>'value') = lower(${colour}))`,
      );
    }
    if (size) {
      predicates.push(
        Prisma.sql`EXISTS (SELECT 1 FROM jsonb_array_elements(pv."attributes"::jsonb) attr WHERE lower(attr->>'name') = 'size' AND lower(attr->>'value') = lower(${size}))`,
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
            : sort === "name_desc"
              ? [{ name: "desc" as const }]
              : sort === "stock"
                ? [{ stock: "desc" as const }]
            : [{ isFeatured: "desc" as const }, { createdAt: "desc" as const }];

  const products = await prisma.product.findMany({
    where: {
      isPublished: true,
      isService: false,
      store: {
        ...sellableStoreWhere(),
        ...(region ? { region } : {}),
      },
      ...(category ? { category } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            price: {
              ...(minPrice !== undefined ? { gte: minPrice } : {}),
              ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
            },
          }
        : {}),
      ...(inStock ? { stock: { gt: 0 } } : {}),
      ...(condition ? { condition: condition as ProductCondition } : {}),
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
      _count: {
        select: { reviews: true },
      },
    },
    orderBy,
    take: 60,
  });

  const productIds = products.map((p) => p.id);
  const reviewAggs =
    productIds.length > 0
      ? await prisma.review.groupBy({
          by: ["productId"],
          where: { productId: { in: productIds } },
          _avg: { rating: true },
          _count: { rating: true },
        })
      : [];

  const reviewMap = new Map(
    reviewAggs.map((r) => [r.productId!, { avg: r._avg.rating ?? 0, count: r._count.rating }]),
  );

  const wishlistIds = await getWishlistProductIds();
  const filterInventory = await prisma.product.findMany({
    where: { isPublished: true, isService: false, store: sellableStoreWhere() },
    select: { brand: true, category: true, variants: { select: { attributes: true } } },
  });
  const availableBrands = Array.from(new Set(filterInventory.map((p) => p.brand?.trim()).filter(Boolean) as string[])).sort();
  const availableCategories = Array.from(new Set(filterInventory.map((p) => p.category).filter(Boolean) as string[]));
  const colourValues = new Set<string>();
  const sizeValues = new Set<string>();
  for (const product of filterInventory) for (const variant of product.variants) {
    if (!Array.isArray(variant.attributes)) continue;
    for (const raw of variant.attributes) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const attribute = raw as { name?: unknown; value?: unknown };
      const name = typeof attribute.name === "string" ? attribute.name.toLowerCase() : "";
      const value = typeof attribute.value === "string" ? attribute.value.trim() : "";
      if (name === "colour" && value) colourValues.add(value.toLowerCase());
      if (name === "size" && value) sizeValues.add(value);
    }
  }
  const colourHex = new Map(COLOUR_OPTIONS.map((option) => [option.value, option.hex]));
  const availableColours = Array.from(colourValues).sort().map((value) => ({ value, hex: colourHex.get(value) ?? "#a1a1aa" }));
  const availableSizes = Array.from(sizeValues).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return (
    <div className={`min-h-screen pb-mobile-public lg:pb-0 ${tw.bgPage} ${tw.fontSans}`}>
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
        unreadCount={unreadCount}
      />

      {/* Amazon-style search hero bar */}
      <div className={`${tw.bgDark} py-4`}>
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
          <ProductSearchBar defaultValue={q} category={category} />
        </div>
      </div>

      {/* Category horizontal scroll strip */}
      <div className="border-b border-zinc-200 bg-white shadow-sm">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 py-2.5 scrollbar-hide sm:mx-0 sm:px-0">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.value}
                href={cat.value === "all" ? "/shop" : `/shop?category=${cat.value}`}
                className={`shrink-0 ${radius.pill} px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  (!category && cat.value === "all") || category === cat.value
                    ? `${tw.bgScarlet} text-white ${shadow.card}`
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
            <h1 className={`${typography.h1} text-zinc-900`}>
              {category
                ? CATEGORIES.find((c) => c.value === category)?.label ?? "Products"
                : q
                  ? `Results for "${q}"`
                  : "All Products"}
            </h1>
            <p className="mt-0.5 text-base text-zinc-500 md:text-sm">
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

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar */}
          <Suspense
            fallback={
              <div className="flex w-full flex-col gap-6 lg:flex-row">
                <ShopFiltersSidebarSkeleton />
                <div className="grid min-h-[40vh] min-w-0 flex-1 grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              </div>
            }
          >
            <div className="w-full shrink-0 lg:w-72">
              <ShopFilters
                key={shopFiltersKey}
                defaultCategory={category ?? "all"}
                defaultSort={sort}
                productCount={products.length}
                availableBrands={availableBrands}
                availableCategories={availableCategories}
                availableColours={availableColours}
                availableSizes={availableSizes}
              />
            </div>
          </Suspense>

          {/* Product grid */}
          <div className="min-w-0 flex-1">
            {products.length === 0 ? (
              <div className={`overflow-hidden ${radius.card} border border-dashed border-zinc-300 bg-white`}>
                <EmptyState
                  icon={<PackageSearch strokeWidth={1.25} className="text-current" />}
                  title="No products match your filters"
                  description="Try adjusting your filters or browse all products."
                  actionLabel="Clear filters"
                  actionHref="/shop"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5">
                {products.map((product) => {
                  const discount =
                    product.compareAtPrice && product.compareAtPrice > product.price
                      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
                      : null;
                  return (
                    <div
                      key={product.id}
                      className={`group flex flex-col overflow-hidden ${radius.card} bg-white ${shadow.card} ring-1 ring-zinc-200/60 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:ring-zinc-300`}
                    >
                      <Link href={`/products/${product.slug}`} className="block">
                        {/* Image */}
                        <div className="relative aspect-square overflow-hidden bg-zinc-100">
                          {product.images[0] ? (
                            <Image
                              src={product.images[0]}
                              alt={product.name}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              loading="lazy"
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="size-10 text-zinc-300" strokeWidth={1.25} aria-hidden />
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
                              <span className={`${radius.pill} ${tw.bgScarlet} px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white ${shadow.modal}`}>
                                Featured
                              </span>
                            ) : null}
                            {discount ? (
                              <span className={`${radius.pill} ${tw.bgSuccessSolid} px-2 py-0.5 text-[9px] font-bold text-white ${shadow.modal}`}>
                                -{discount}%
                              </span>
                            ) : null}
                          </div>
                          {product.isDigital ? (
                            <span className={`absolute bottom-2 left-2 inline-flex items-center gap-0.5 ${radius.pill} ${tw.bgBlue} px-2 py-0.5 text-[9px] font-bold text-white`}>
                              <ArrowDownToLine className="size-2.5 shrink-0" aria-hidden strokeWidth={2.5} />
                              Digital
                            </span>
                          ) : null}
                        </div>
                      </Link>

                      {/* Info */}
                      <div className="flex flex-1 flex-col gap-1 p-3">
                        <Link href={`/products/${product.slug}`} className="block flex min-h-0 min-w-0 flex-1 flex-col gap-1">
                          <p className="truncate text-[10px] font-medium text-zinc-400">
                            {product.store.name}
                            {product.store.region ? ` · ${getRegionLabel(product.store.region)}` : ""}
                          </p>
                          <p className="line-clamp-2 min-w-0 text-xs font-semibold leading-snug text-zinc-900 sm:text-sm">
                            {product.name}
                          </p>
                          <div className="mt-auto pt-1 sm:pt-2">
                            <p className={`text-xs font-black sm:text-sm ${tw.textScarlet}`}>TTD {product.price.toFixed(2)}</p>
                            {product.compareAtPrice != null && product.compareAtPrice > product.price ? (
                              <p className="text-xs text-zinc-400 line-through">
                                TTD {product.compareAtPrice.toFixed(2)}
                              </p>
                            ) : null}
                            {(() => {
                              const rv = reviewMap.get(product.id);
                              if (!rv || rv.count === 0) return null;
                              return (
                                <div className="mt-1 flex items-center gap-1">
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <svg
                                        key={s}
                                        viewBox="0 0 24 24"
                                        className={`h-2.5 w-2.5 ${s <= Math.round(rv.avg) ? tw.fillAmber : "fill-zinc-200"}`}
                                      >
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                      </svg>
                                    ))}
                                  </div>
                                  <span className="text-[10px] text-zinc-400">({rv.count})</span>
                                </div>
                              );
                            })()}
                          </div>
                        </Link>
                        <ShopProductCardActions
                          hasVariants={product.hasVariants}
                          isDigital={product.isDigital}
                          slug={product.slug}
                          productId={product.id}
                          productName={product.name}
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
