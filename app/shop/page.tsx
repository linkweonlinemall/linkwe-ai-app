import Link from "next/link";
import { Suspense } from "react";

import ProductSearchBar from "@/components/shop/ProductSearchBar";
import ShopFilters from "@/components/shop/ShopFilters";
import PublicNav from "@/components/layout/PublicNav";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const CATEGORIES = [
  { value: "all", label: "All" },
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

type Props = {
  searchParams: Promise<{
    category?: string;
    region?: string;
    q?: string;
    sort?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
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

  const shopFiltersKey = [
    params.category ?? "",
    sort,
    params.minPrice ?? "",
    params.maxPrice ?? "",
    params.inStock ?? "",
  ].join("|");

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
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      compareAtPrice: true,
      images: true,
      category: true,
      store: { select: { name: true, slug: true, region: true } },
    },
    orderBy,
    take: 60,
  });

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16 sm:pb-0">
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900">Shop</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {products.length} products from local vendors across Trinidad & Tobago
          </p>
        </div>

        <div className="mb-6">
          <ProductSearchBar defaultValue={q} category={category} />
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <Suspense
            fallback={
              <aside className="w-full shrink-0 lg:w-64">
                <div className="h-96 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100" />
              </aside>
            }
          >
            <ShopFilters
              key={shopFiltersKey}
              defaultCategory={category ?? "all"}
              defaultSort={sort}
              productCount={products.length}
            />
          </Suspense>

          <div className="min-w-0 flex-1">
            <div className="mb-6 flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.value}
                  href={cat.value === "all" ? "/shop" : `/shop?category=${cat.value}`}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    (!category && cat.value === "all") || category === cat.value
                      ? "bg-[#D4450A] text-white"
                      : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {cat.label}
                </Link>
              ))}
            </div>

            {products.length === 0 ? (
              <div className="py-20 text-center">
                <p className="mb-4 text-5xl">🔍</p>
                <h2 className="mb-2 text-lg font-semibold text-zinc-900">No products found</h2>
                <p className="mb-6 text-sm text-zinc-500">Try a different category or search term</p>
                <Link href="/shop" className="text-sm text-[#D4450A] hover:underline">
                  Clear filters
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    className="group overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-md"
                  >
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
                    <div className="p-3">
                      <p className="mb-0.5 truncate text-[10px] capitalize text-zinc-400">{product.store.name}</p>
                      <p className="mb-1 truncate text-sm font-semibold text-zinc-900">{product.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[#D4450A]">TTD {product.price.toFixed(2)}</p>
                        {product.compareAtPrice != null && product.compareAtPrice > product.price ? (
                          <p className="text-xs text-zinc-400 line-through">
                            TTD {product.compareAtPrice.toFixed(2)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
