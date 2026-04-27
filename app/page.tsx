import Link from "next/link";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import HeroSlider from "@/components/layout/HeroSlider";
import PublicNav from "@/components/layout/PublicNav";

function getDashboardPath(role: string) {
  if (role === "VENDOR") return "/dashboard/vendor";
  if (role === "COURIER") return "/dashboard/courier";
  if (role === "ADMIN") return "/dashboard/admin";
  return "/dashboard/customer";
}

export default async function Home() {
  const session = await getSession();
  const user = session
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;
  const continueHref = user ? getDashboardPath(user.role) : null;

  const featuredStores = await prisma.store.findMany({
    where: { status: "ACTIVE" },
    select: {
      name: true,
      slug: true,
      tagline: true,
      logoUrl: true,
      categoryId: true,
      region: true,
    },
    take: 6,
    orderBy: { createdAt: "desc" },
  });

  const featuredProducts = await prisma.product.findMany({
    where: { isPublished: true, isFeatured: true },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: true,
      store: { select: { name: true, slug: true } },
    },
    take: 8,
    orderBy: { createdAt: "desc" },
  });

  const allProducts =
    featuredProducts.length < 4
      ? await prisma.product.findMany({
          where: { isPublished: true },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            images: true,
            store: { select: { name: true, slug: true } },
          },
          take: 8,
          orderBy: { createdAt: "desc" },
        })
      : featuredProducts;

  const displayProducts = featuredProducts.length >= 4 ? featuredProducts : allProducts;

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <PublicNav
        transparent
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
      />

      <HeroSlider continueHref={continueHref} />

      {/* How it works */}
      <section className="bg-white px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-2xl font-bold text-zinc-900">How LinkWe works</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Describe what you want",
                desc: "Type naturally — 'something for mih wife birthday' or upload a photo of what you're looking for.",
              },
              {
                step: "2",
                title: "Discover local vendors",
                desc: "Our AI finds matching products from verified vendors across Trinidad and Tobago.",
              },
              {
                step: "3",
                title: "Buy with confidence",
                desc: "Secure checkout with Stripe. Delivery available across the island.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div
                  className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full
                  bg-[#D4450A] text-xl font-bold text-white"
                >
                  {item.step}
                </div>
                <h3 className="mb-2 font-semibold text-zinc-900">{item.title}</h3>
                <p className="text-sm leading-6 text-zinc-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured products */}
      {displayProducts.length > 0 && (
        <section className="px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-zinc-900">Featured products</h2>
              <Link href="/shop" className="text-sm text-[#D4450A] hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {displayProducts.map((product) => (
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
                    <p className="mb-1 text-xs text-zinc-400">{product.store.name}</p>
                    <p className="truncate text-sm font-medium text-zinc-900">{product.name}</p>
                    <p className="mt-1 text-sm font-bold text-[#D4450A]">TTD {product.price.toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured stores */}
      {featuredStores.length > 0 && (
        <section className="bg-white px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-8 text-2xl font-bold text-zinc-900">Local stores</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {featuredStores.map((store) => (
                <Link
                  key={store.slug}
                  href={`/store/${store.slug}`}
                  className="rounded-xl bg-[#F5F5F5] p-4 text-center
                    transition-all hover:bg-zinc-100"
                >
                  <div
                    className="mx-auto mb-3 h-14 w-14 overflow-hidden rounded-full bg-white
                    shadow-sm"
                  >
                    {store.logoUrl ? (
                      <img
                        src={store.logoUrl}
                        alt={store.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center
                        bg-[#D4450A]/10"
                      >
                        <span className="text-lg font-bold text-[#D4450A]">{store.name[0]}</span>
                      </div>
                    )}
                  </div>
                  <p className="truncate text-xs font-semibold text-zinc-900">{store.name}</p>
                  <p className="mt-0.5 text-[10px] capitalize text-zinc-400">{store.region ?? ""}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Vendor CTA */}
      <section className="bg-[#1C1C1A] px-4 py-16 text-center text-white">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-3xl font-bold">Ready to sell on LinkWe?</h2>
          <p className="mb-8 text-zinc-400">
            Join vendors across Trinidad and Tobago. Set up your store in minutes.
          </p>
          <Link
            href="/register"
            className="inline-block rounded-xl bg-[#D4450A] px-8
              py-4 text-lg font-semibold text-white hover:opacity-90"
          >
            Open your store →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-[#1C1C1A] px-4 py-8">
        <div
          className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4
          sm:flex-row"
        >
          <p className="text-sm text-zinc-500">© 2026 LinkWe — Trinidad & Tobago's Marketplace</p>
          <div className="flex gap-6 text-sm text-zinc-500">
            <Link href="/chat" className="hover:text-white">
              AI Shopping
            </Link>
            <Link href="/shop" className="hover:text-white">
              Shop
            </Link>
            <Link href="/events" className="hover:text-white">
              Events
            </Link>
            <Link href="/register" className="hover:text-white">
              Sell
            </Link>
            <Link href="/login" className="hover:text-white">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
