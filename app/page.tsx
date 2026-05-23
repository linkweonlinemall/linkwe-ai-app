import Link from "next/link";
import type { Metadata } from "next";
import { getSavedStoreIds, getWishlistProductIds } from "@/app/actions/wishlist";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { prisma } from "@/lib/prisma";
import HeroSlider from "@/components/layout/HeroSlider";
import PublicNav from "@/components/layout/PublicNav";
import WishlistButton from "@/components/ui/WishlistButton";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import { SERVICE_CATEGORIES } from "@/lib/categories";

export const metadata: Metadata = {
  title: "LinkWe Online Mall — Shop Local Trinidad & Tobago",
  description:
    "Discover local vendors, book services, and shop products across Trinidad & Tobago. LinkWe connects you with the best local businesses.",
};

export default async function Home() {
  const session = await getSession();
  const user = session
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;
  const continueHref = user ? getRoleDashboardPath(user.role) : null;

  const unreadCount = await getNavUnreadCount();

  // Featured products
  const featuredProducts = await prisma.product.findMany({
    where: {
      isPublished: true,
      isService: false,
      OR: [{ isFeatured: true }, { isFeatured: false }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      compareAtPrice: true,
      images: true,
      isFeatured: true,
      isDigital: true,
      hasVariants: true,
      category: true,
      store: { select: { name: true, slug: true } },
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 8,
  });

  const wishlistIds = await getWishlistProductIds();

  // Featured services
  const featuredServices = await prisma.product.findMany({
    where: {
      isPublished: true,
      isService: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: true,
      serviceType: true,
      serviceDuration: true,
      quotePriceType: true,
      store: { select: { name: true, slug: true, region: true } },
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 6,
  });

  // Featured stores
  const featuredStores = await prisma.store.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      logoUrl: true,
      coverPhotoUrl: true,
      categoryId: true,
      region: true,
      _count: {
        select: { products: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const savedStoreIds = await getSavedStoreIds();

  // Stats
  const [storeCount, productCount] = await Promise.all([
    prisma.store.count({ where: { status: "ACTIVE" } }),
    prisma.product.count({ where: { isPublished: true } }),
  ]);

  function serviceTypeInfo(type: string | null) {
    switch (type) {
      case "BOOKABLE":
        return { label: "Bookable", color: "bg-blue-50 text-blue-700", icon: "📅" };
      case "QUOTE":
        return { label: "Get Quote", color: "bg-amber-50 text-amber-700", icon: "💬" };
      case "SUBSCRIPTION":
        return { label: "Subscribe", color: "bg-purple-50 text-purple-700", icon: "🔄" };
      case "ON_DEMAND":
        return { label: "On Demand", color: "bg-emerald-50 text-emerald-700", icon: "⚡" };
      case "VIRTUAL":
        return { label: "Virtual", color: "bg-zinc-100 text-zinc-700", icon: "💻" };
      default:
        return { label: "Service", color: "bg-zinc-100 text-zinc-700", icon: "🛎️" };
    }
  }

  const TOP_CATEGORIES = PRODUCT_CATEGORIES.slice(0, 14);

  return (
    <div className="min-h-screen bg-[#FFFDF9] pb-16 sm:pb-0" style={{ fontFamily: "var(--font-sora)" }}>
      <PublicNav
        transparent
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
        unreadCount={unreadCount}
      />

      {/* Hero */}
      <HeroSlider continueHref={continueHref} />

      {/* Stats bar */}
      <div className="relative overflow-hidden bg-[#1C1C1A]">
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(90deg, #D4450A15 0%, transparent 50%, #E8820C15 100%)",
          }}
        />
        <div className="relative mx-auto max-w-screen-xl px-4 py-8 sm:px-6">
          <div className="flex items-center justify-center gap-8 sm:gap-20">
            {[
              { value: `${storeCount}+`, label: "Local stores" },
              { value: `${productCount}+`, label: "Products listed" },
              { value: "T&T", label: "Island-wide delivery" },
            ].map((stat, i) => (
              <div key={stat.label} className="relative text-center">
                {i > 0 && (
                  <div className="absolute -left-4 top-1/2 h-6 w-px -translate-y-1/2 bg-white/10 sm:-left-10" />
                )}
                <p className="font-display text-3xl font-bold italic text-white sm:text-4xl">{stat.value}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky category strip */}
      <div className="static sm:sticky sm:top-0 z-30 border-b border-amber-100 bg-[#FFFDF9]/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="scrollbar-hide flex gap-1.5 overflow-x-auto py-3">
            <Link
              href="/shop"
              className="shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold text-white shadow-sm"
              style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
            >
              All products
            </Link>
            {TOP_CATEGORIES.map((cat) => (
              <Link
                key={cat.value}
                href={`/shop?category=${cat.value}`}
                className="shrink-0 whitespace-nowrap rounded-full border border-amber-100 bg-white px-4 py-1.5 text-xs font-semibold text-zinc-600 transition-all hover:border-[#D4450A]/30 hover:bg-[#D4450A]/5 hover:text-[#D4450A]"
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Featured products */}
      {featuredProducts.length > 0 && (
        <section className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="h-0.5 w-10 rounded-full" style={{ background: "linear-gradient(90deg, #D4450A, #E8820C)" }} />
                <p className="text-xs font-black uppercase tracking-widest text-[#D4450A]">Shop now</p>
              </div>
              <h2 className="font-display text-4xl font-bold text-zinc-900 sm:text-5xl">
                Featured
                <br />
                <span className="italic text-[#D4450A]">products</span>
              </h2>
            </div>
            <Link
              href="/shop"
              className="group flex items-center gap-2 rounded-full border-2 border-zinc-900 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-zinc-900 transition-all hover:bg-zinc-900 hover:text-white"
            >
              View all
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {featuredProducts.slice(0, 8).map((product, idx) => {
              const isHero = idx === 0;
              const discount =
                product.compareAtPrice && product.compareAtPrice > product.price
                  ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
                  : null;
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className={`group relative overflow-hidden rounded-2xl bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                    isHero ? "col-span-2 row-span-2" : ""
                  }`}
                  style={{ boxShadow: "0 2px 16px rgba(212,69,10,0.08)" }}
                >
                  <div className={`relative overflow-hidden bg-zinc-100 ${isHero ? "aspect-square" : "aspect-square"}`}>
                    {product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-5xl">📦</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    {discount && (
                      <div
                        className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-black text-white shadow-lg"
                        style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
                      >
                        -{discount}%
                      </div>
                    )}
                    {product.isDigital && (
                      <div className="absolute bottom-3 left-3 rounded-full bg-[#1A7FB5] px-2.5 py-1 text-[10px] font-bold text-white">
                        ⬇ Digital
                      </div>
                    )}
                    <div className="absolute right-2 top-2 z-10">
                      <WishlistButton
                        productId={product.id}
                        initialWishlisted={wishlistIds.includes(product.id)}
                        size="sm"
                      />
                    </div>
                  </div>
                  <div className={`p-3 ${isHero ? "sm:p-5" : ""}`}>
                    <p className="mb-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {product.store.name}
                    </p>
                    <p
                      className={`font-semibold leading-snug text-zinc-900 transition-colors group-hover:text-[#D4450A] ${isHero ? "text-base sm:text-lg" : "truncate text-sm"}`}
                    >
                      {product.name}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <p className={`font-black text-[#D4450A] ${isHero ? "text-xl" : "text-sm"}`}>
                        TTD {product.price.toFixed(2)}
                      </p>
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <p className="text-xs text-zinc-400 line-through">TTD {product.compareAtPrice.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured services — warm dark section */}
      {featuredServices.length > 0 && (
        <section
          className="relative overflow-hidden py-20"
          style={{ background: "linear-gradient(135deg, #1C1C1A 0%, #2A1A0E 100%)" }}
        >
          <div
            className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl"
            style={{ background: "radial-gradient(circle, #E8820C, transparent)" }}
          />
          <div
            className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full opacity-10 blur-3xl"
            style={{ background: "radial-gradient(circle, #D4450A, transparent)" }}
          />
          <div className="relative mx-auto max-w-screen-xl px-4 sm:px-6">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <div className="h-0.5 w-10 rounded-full" style={{ background: "linear-gradient(90deg, #E8820C, #D4450A)" }} />
                  <p className="text-xs font-black uppercase tracking-widest text-[#E8820C]">Book now</p>
                </div>
                <h2 className="font-display text-4xl font-bold text-white sm:text-5xl">
                  Local
                  <br />
                  <span className="italic text-[#E8820C]">services</span>
                </h2>
              </div>
              <Link
                href="/services"
                className="flex items-center gap-2 rounded-full border-2 border-white/20 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white transition-all hover:border-white hover:bg-white hover:text-zinc-900"
              >
                View all
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredServices.map((service) => {
                const typeInfo = serviceTypeInfo(service.serviceType);
                return (
                  <Link
                    key={service.id}
                    href={`/service/${service.slug}`}
                    className="group overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <div className="flex h-full">
                      <div className="relative w-32 shrink-0 overflow-hidden">
                        {service.images[0] ? (
                          <img
                            src={service.images[0]}
                            alt={service.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div
                            className="flex h-full w-full items-center justify-center text-4xl"
                            style={{ background: "rgba(255,255,255,0.05)" }}
                          >
                            🛎️
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
                      </div>
                      <div className="flex flex-1 flex-col justify-between p-4">
                        <div>
                          <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold ${typeInfo.color}`}>
                            {typeInfo.icon} {typeInfo.label}
                          </span>
                          <p className="mt-2 text-sm font-bold leading-snug text-white transition-colors group-hover:text-[#E8820C]">
                            {service.name}
                          </p>
                          <p className="mt-1 text-[11px] text-zinc-500">
                            {service.store.name}
                            {service.store.region ? ` · ${getRegionLabel(service.store.region)}` : ""}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                          <div>
                            {service.serviceType === "QUOTE" && service.quotePriceType === "FREE_QUOTE" ? (
                              <p className="text-sm font-black text-[#E8820C]">Free quote</p>
                            ) : (
                              <p className="text-sm font-black text-[#E8820C]">
                                {service.serviceType === "QUOTE" && service.quotePriceType === "STARTING_FROM" ? "From " : ""}
                                TTD {service.price.toFixed(2)}
                              </p>
                            )}
                            {service.serviceDuration && (
                              <p className="text-[10px] text-zinc-500">
                                {service.serviceDuration >= 60
                                  ? `${Math.floor(service.serviceDuration / 60)}h${service.serviceDuration % 60 > 0 ? ` ${service.serviceDuration % 60}m` : ""}`
                                  : `${service.serviceDuration} min`}
                              </p>
                            )}
                          </div>
                          <span
                            className="rounded-full px-3 py-1.5 text-[11px] font-bold text-white transition-all group-hover:scale-105"
                            style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
                          >
                            Book →
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Service categories */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="h-0.5 w-10 rounded-full bg-[#1A7FB5]" />
                <p className="text-xs font-black uppercase tracking-widest text-[#1A7FB5]">Book a professional</p>
              </div>
              <h2 className="font-display text-4xl font-bold text-zinc-900 sm:text-5xl">
                Browse by
                <br />
                <span className="italic text-[#1A7FB5]">service type</span>
              </h2>
            </div>
            <Link
              href="/services"
              className="flex items-center gap-2 rounded-full border-2 border-zinc-900 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-zinc-900 transition-all hover:bg-zinc-900 hover:text-white"
            >
              All services
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {[
              {
                emoji: "💇‍♀️",
                label: "Beauty & Hair",
                href: "/services?category=beauty_hair",
                bg: "#FFF0F0",
                border: "#FFD0D0",
                hover: "#D4450A",
              },
              {
                emoji: "🔧",
                label: "Home Repair",
                href: "/services?category=home_repair",
                bg: "#FFF5EC",
                border: "#FFE0C0",
                hover: "#E8820C",
              },
              {
                emoji: "📚",
                label: "Tutoring",
                href: "/services?category=education_tutoring",
                bg: "#EFF7FF",
                border: "#C0DEFF",
                hover: "#1A7FB5",
              },
              {
                emoji: "🍽️",
                label: "Catering",
                href: "/services?category=catering_events",
                bg: "#FFFBEC",
                border: "#FFE8A0",
                hover: "#D4A017",
              },
              {
                emoji: "🏋️",
                label: "Fitness",
                href: "/services?category=fitness_wellness",
                bg: "#F0FFF4",
                border: "#A8E6BC",
                hover: "#16A34A",
              },
              {
                emoji: "💻",
                label: "Tech Support",
                href: "/services?category=technology",
                bg: "#F5F0FF",
                border: "#D4C0FF",
                hover: "#7C3AED",
              },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 py-8 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                style={{ backgroundColor: item.bg, borderColor: item.border }}
              >
                <span className="text-4xl transition-transform duration-300 group-hover:scale-125">{item.emoji}</span>
                <p className="text-xs font-bold text-zinc-700 group-hover:text-zinc-900">{item.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured stores */}
      {featuredStores.length > 0 && (
        <section className="py-16" style={{ background: "#FFFDF9" }}>
          <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <div className="h-0.5 w-10 rounded-full" style={{ background: "linear-gradient(90deg, #D4450A, #E8820C)" }} />
                  <p className="text-xs font-black uppercase tracking-widest text-[#D4450A]">Discover</p>
                </div>
                <h2 className="font-display text-4xl font-bold text-zinc-900 sm:text-5xl">
                  Local
                  <br />
                  <span className="italic text-[#D4450A]">stores</span>
                </h2>
              </div>
              <Link
                href="/stores"
                className="flex items-center gap-2 rounded-full border-2 border-zinc-900 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-zinc-900 transition-all hover:bg-zinc-900 hover:text-white"
              >
                View all
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {featuredStores.map((store) => (
                <Link
                  key={store.id}
                  href={`/store/${store.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                  style={{ boxShadow: "0 2px 16px rgba(212,69,10,0.06)" }}
                >
                  <div className="relative h-24 overflow-hidden">
                    {store.coverPhotoUrl ? (
                      <img
                        src={store.coverPhotoUrl}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div
                        className="h-full w-full"
                        style={{
                          background: "linear-gradient(135deg, #1C1C1A 0%, #3a3935 50%, #D4450A20 100%)",
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 left-2">
                      <div className="h-10 w-10 overflow-hidden rounded-xl border-2 border-white/90 shadow-lg">
                        {store.logoUrl ? (
                          <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
                        ) : (
                          <div
                            className="flex h-full w-full items-center justify-center text-sm font-black text-white"
                            style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
                          >
                            {store.name[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="pointer-events-none absolute right-2 top-2 z-10 flex flex-col items-end gap-1.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm">
                        {savedStoreIds.includes(store.id) ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#D4450A" stroke="#D4450A" strokeWidth="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                          </svg>
                        )}
                      </div>
                      <div className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                        {store._count.products}
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="truncate text-xs font-black text-zinc-900 transition-colors group-hover:text-[#D4450A]">
                      {store.name}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-zinc-400">
                      {store.tagline ?? getRegionLabel(store.region)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="relative overflow-hidden bg-white py-20">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, #D4450A10 0%, transparent 60%), radial-gradient(circle at 80% 50%, #E8820C10 0%, transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <div className="h-0.5 w-10 rounded-full" style={{ background: "linear-gradient(90deg, #D4450A, #E8820C)" }} />
              <p className="text-xs font-black uppercase tracking-widest text-[#D4450A]">Simple process</p>
              <div className="h-0.5 w-10 rounded-full" style={{ background: "linear-gradient(90deg, #E8820C, #D4450A)" }} />
            </div>
            <h2 className="font-display text-4xl font-bold text-zinc-900 sm:text-5xl">
              How <span className="italic text-[#D4450A]">LinkWe</span> works
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-0">
            {[
              {
                step: "01",
                icon: "🔍",
                title: "Search or browse",
                desc: "Type what you want in plain English, browse by category, or let our AI shopping assistant find it for you.",
                accent: "#D4450A",
                light: "#FFF0F0",
              },
              {
                step: "02",
                icon: "🛍️",
                title: "Discover local vendors",
                desc: "Find verified local vendors across Trinidad and Tobago selling products, services, digital downloads and more.",
                accent: "#E8820C",
                light: "#FFF5EC",
              },
              {
                step: "03",
                icon: "✅",
                title: "Buy with confidence",
                desc: "Secure Stripe checkout. Delivery island-wide. Digital downloads instant. Services bookable in seconds.",
                accent: "#1A7FB5",
                light: "#EFF7FF",
              },
            ].map((item, idx) => (
              <div
                key={item.step}
                className={`relative flex flex-col items-center text-center sm:px-10 ${idx < 2 ? "sm:border-r sm:border-zinc-100" : ""}`}
              >
                <div
                  className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl text-3xl shadow-lg"
                  style={{ backgroundColor: item.light, border: `2px solid ${item.accent}20` }}
                >
                  {item.icon}
                </div>
                <p className="font-display mb-3 text-6xl font-bold italic opacity-10" style={{ color: item.accent, lineHeight: 1 }}>
                  {item.step}
                </p>
                <h3 className="mb-3 -mt-4 text-xl font-black text-zinc-900">{item.title}</h3>
                <p className="text-sm leading-7 text-zinc-500">{item.desc}</p>
                {idx < 2 && (
                  <div className="absolute right-0 top-10 hidden -translate-y-1/2 sm:block">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="#D4450A" strokeWidth="1.5" strokeOpacity="0.3" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vendor CTA */}
      <section
        className="relative overflow-hidden py-24"
        style={{ background: "linear-gradient(135deg, #D4450A 0%, #C23A08 40%, #1C1C1A 100%)" }}
      >
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "url('/wave.png')", backgroundSize: "cover" }} />
        <div
          className="absolute right-0 top-0 h-[600px] w-[600px] rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, #E8820C, transparent)" }}
        />
        <div className="relative mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="flex flex-col items-start gap-12 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#E8820C]" />
                <span className="text-xs font-black uppercase tracking-widest text-white/90">Grow your business</span>
              </div>
              <h2 className="font-display text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl">
                Sell on
                <br />
                <span className="italic text-[#E8820C]">LinkWe</span>
              </h2>
              <p className="mt-6 max-w-lg text-base leading-8 text-white/70">
                Join Trinidad and Tobago&apos;s fastest growing marketplace. Sell products, offer services, accept
                bookings, and reach customers island-wide.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {[
                  "Products & digital downloads",
                  "Bookable services",
                  "Stripe payments",
                  "Delivery management",
                  "AI-powered tools",
                ].map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white/80"
                  >
                    ✓ {feature}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-4 sm:flex-row lg:flex-col">
              <Link
                href="/register?role=vendor"
                className="flex items-center justify-center gap-2 rounded-2xl bg-white px-10 py-5 text-sm font-black text-[#D4450A] shadow-2xl transition-all hover:scale-105"
              >
                Start selling
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/stores"
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-white/30 px-10 py-5 text-sm font-black text-white transition-all hover:border-white hover:bg-white/10"
              >
                Browse stores
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Get the app section */}
      <section className="py-16 px-4 sm:px-6" style={{ background: "linear-gradient(135deg, #1C1C1A 0%, #2A1A0E 100%)" }}>
        <div className="mx-auto max-w-screen-xl">
          <div className="flex flex-col items-center gap-8 text-center lg:flex-row lg:text-left lg:gap-16">
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-[#E8820C]">Free download</p>
              <h2 className="font-display mt-3 text-3xl font-black text-white sm:text-4xl">Take LinkWe everywhere</h2>
              <p className="mt-4 text-sm leading-7 text-zinc-400 max-w-lg">
                Install the LinkWe app on your phone or computer. Shop local vendors, book services, track orders — all from
                your home screen. No app store required.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 justify-center lg:justify-start">
                <Link
                  href="/get-app"
                  className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Get the app
                </Link>
                <Link
                  href="/shop"
                  className="rounded-xl border-2 border-white/20 px-6 py-3 text-sm font-bold text-white hover:border-white/40 transition-colors"
                >
                  Browse first
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-4 justify-center lg:justify-start">
                {[
                  { icon: "📱", label: "iPhone & iPad" },
                  { icon: "🤖", label: "Android" },
                  { icon: "🖥️", label: "Desktop" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="text-base">{item.icon}</span>
                    <span className="text-xs font-semibold text-zinc-400">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="shrink-0">
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-3xl blur-3xl opacity-30"
                  style={{ background: "radial-gradient(circle, #D4450A, transparent)" }}
                />
                <img
                  src="/icon-192x192.png"
                  alt="LinkWe app"
                  className="relative h-40 w-40 rounded-3xl shadow-2xl ring-4 ring-white/10"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#111110] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-screen-xl">
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 lg:grid-cols-5">
            <div className="col-span-2 sm:col-span-4 lg:col-span-2">
              <img src="/linkwe-new-log-dark.png" alt="LinkWe" className="mb-5 h-8 object-contain" />
              <p className="max-w-xs text-sm leading-7 text-zinc-500">
                Trinidad and Tobago&apos;s local marketplace. Shop local, support local, powered by AI.
              </p>
              <div className="mt-6 flex gap-2">
                {["🛍️ Shop", "🛎️ Sell", "📅 Book"].map((tag) => (
                  <span key={tag} className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-500">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            {[
              {
                title: "Shop",
                links: [
                  { label: "All products", href: "/shop" },
                  { label: "All services", href: "/services" },
                  { label: "Browse stores", href: "/stores" },
                  { label: "Events", href: "/events" },
                ],
              },
              {
                title: "Sell",
                links: [
                  { label: "Become a vendor", href: "/register?role=vendor" },
                  { label: "Vendor dashboard", href: "/dashboard/vendor" },
                  { label: "List a service", href: "/dashboard/vendor/services/new" },
                ],
              },
              {
                title: "Help",
                links: [
                  { label: "Sign in", href: "/login" },
                  { label: "Create account", href: "/register" },
                  { label: "My orders", href: "/orders" },
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <p className="mb-5 text-xs font-black uppercase tracking-widest text-zinc-400">{col.title}</p>
                <div className="flex flex-col gap-3">
                  {col.links.map((link) => (
                    <Link key={link.href} href={link.href} className="text-sm text-zinc-500 transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-800/60 pt-8 sm:flex-row">
            <p className="text-xs text-zinc-600">
              © {new Date().getFullYear()} LinkWe. Trinidad & Tobago&apos;s Marketplace.
            </p>
            <div className="flex gap-6">
              <Link href="/privacy" className="text-xs text-zinc-600 transition-colors hover:text-white">
                Privacy
              </Link>
              <Link href="/terms" className="text-xs text-zinc-600 transition-colors hover:text-white">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
