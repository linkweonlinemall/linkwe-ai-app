import Link from "next/link";

import PublicNav from "@/components/layout/PublicNav";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

function getDashboardPath(role: string) {
  if (role === "VENDOR") return "/dashboard/vendor";
  if (role === "COURIER") return "/dashboard/courier";
  if (role === "ADMIN") return "/dashboard/admin";
  return "/dashboard/customer";
}

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
  searchParams: Promise<{ category?: string; region?: string; q?: string }>;
};

export default async function ShopPage({ searchParams }: Props) {
  const session = await getSession();
  const user = session
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;
  const continueHref = user ? getDashboardPath(user.role) : null;

  const params = await searchParams;
  const category = params.category && params.category !== "all" ? params.category : undefined;
  const region = params.region || undefined;
  const q = params.q || undefined;

  const products = await prisma.product.findMany({
    where: {
      isPublished: true,
      ...(category ? { category } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      ...(region ? { store: { region } } : {}),
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
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 60,
  });

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900">Shop</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {products.length} products from local vendors across Trinidad & Tobago
          </p>
        </div>

        {/* Search bar */}
        <form method="GET" className="mb-6">
          <div className="flex gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search products..."
              className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5
                text-sm focus:border-[#D4450A] focus:outline-none"
            />
            {category && <input type="hidden" name="category" value={category} />}
            <button
              type="submit"
              className="rounded-xl bg-[#D4450A] px-5 py-2.5
                text-sm font-medium text-white hover:opacity-90"
            >
              Search
            </button>
          </div>
        </form>

        {/* Category filter */}
        <div className="mb-8 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.value}
              href={cat.value === "all" ? "/shop" : `/shop?category=${cat.value}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all
                ${
                  (!category && cat.value === "all") || category === cat.value
                    ? "bg-[#D4450A] text-white"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"
                }`}
            >
              {cat.label}
            </Link>
          ))}
        </div>

        {/* Products grid */}
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group overflow-hidden rounded-xl bg-white shadow-sm
                  transition-all hover:shadow-md"
              >
                <div className="aspect-square overflow-hidden bg-zinc-100">
                  {product.images[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="h-full w-full object-cover
                        transition-transform duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-4xl text-zinc-300">📦</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="mb-1 truncate text-[10px] text-zinc-400">{product.store.name}</p>
                  <p className="truncate text-sm font-medium text-zinc-900">{product.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-sm font-bold text-[#D4450A]">TTD {product.price.toFixed(2)}</p>
                    {product.compareAtPrice && (
                      <p className="text-xs text-zinc-400 line-through">
                        TTD {product.compareAtPrice.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
