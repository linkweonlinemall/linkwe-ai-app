import Link from "next/link";
import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownToLine,
  ArrowRight,
  BadgeCheck,
  Bell,
  BookOpen,
  Calendar,
  Cpu,
  Download,
  Dumbbell,
  MessageCircle,
  Monitor,
  Package,
  RefreshCw,
  Scissors,
  Search,
  ShoppingBag,
  Smartphone,
  Store,
  UtensilsCrossed,
  Wrench,
  Zap,
  Check,
} from "lucide-react";

import { getSavedStoreIds, getWishlistProductIds } from "@/app/actions/wishlist";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { prisma } from "@/lib/prisma";
import HomeFeaturedStoreCard from "@/components/home/HomeFeaturedStoreCard";
import HeroSlider from "@/components/layout/HeroSlider";
import PublicNav from "@/components/layout/PublicNav";
import WishlistButton from "@/components/ui/WishlistButton";
import { EventCard, type EventCardData } from "@/components/events/EventCard";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import { sellableStoreWhere } from "@/lib/store/sellable-store";
import { colors, css, radius, shadow, spacing, typography, tw } from "@/lib/design-system";

export const metadata: Metadata = {
  title: "LinkWe — We People. We Business. We Marketplace.",
  description:
    "We People. We Business. We Marketplace. Discover local vendors, book services, shop products and find events across Trinidad & Tobago.",
};

const SERVICE_CATEGORY_LINKS: {
  Icon: LucideIcon;
  label: string;
  href: string;
}[] = [
  { Icon: Scissors, label: "Beauty & Hair", href: "/services?category=beauty_hair" },
  { Icon: Wrench, label: "Home Repair", href: "/services?category=home_repair" },
  { Icon: BookOpen, label: "Tutoring", href: "/services?category=education_tutoring" },
  { Icon: UtensilsCrossed, label: "Catering", href: "/services?category=catering_events" },
  { Icon: Dumbbell, label: "Fitness", href: "/services?category=fitness_wellness" },
  { Icon: Monitor, label: "Tech Support", href: "/services?category=technology" },
];

const HOW_IT_WORKS_STEPS: { step: string; Icon: LucideIcon; title: string; desc: string; lightClass: string }[] = [
  {
    step: "01",
    Icon: Search,
    title: "Search or browse",
    desc: "Type what you want in plain English, browse by category, or let our AI shopping assistant find it for you.",
    lightClass: "bg-orange-50",
  },
  {
    step: "02",
    Icon: ShoppingBag,
    title: "Discover local vendors",
    desc: "Find verified local vendors across Trinidad and Tobago selling products, services, digital downloads and more.",
    lightClass: "bg-orange-50/80",
  },
  {
    step: "03",
    Icon: BadgeCheck,
    title: "Buy with confidence",
    desc: "Secure WiPay checkout. Delivery island-wide. Digital downloads instant. Services bookable in seconds.",
    lightClass: tw.bgPage,
  },
];

function ServiceTypeBadge({ type }: { type: string | null }) {
  let label = "Service";
  let palette = "bg-zinc-100 text-zinc-700";
  let Icon: LucideIcon = Bell;
  switch (type) {
    case "BOOKABLE":
      label = "Bookable";
      palette = "bg-blue-50 text-blue-700";
      Icon = Calendar;
      break;
    case "QUOTE":
      label = "Get Quote";
      palette = "bg-amber-50 text-amber-700";
      Icon = MessageCircle;
      break;
    case "SUBSCRIPTION":
      label = "Subscribe";
      palette = "bg-purple-50 text-purple-700";
      Icon = RefreshCw;
      break;
    case "ON_DEMAND":
      label = "On Demand";
      palette = "bg-emerald-50 text-emerald-700";
      Icon = Zap;
      break;
    case "VIRTUAL":
      label = "Virtual";
      palette = "bg-zinc-100 text-zinc-700";
      Icon = Monitor;
      break;
    default:
      break;
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${palette}`}>
      <Icon className="size-3 shrink-0" aria-hidden strokeWidth={2.25} />
      {label}
    </span>
  );
}

export default async function Home() {
  const session = await getSession();
  const user = session
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;
  const continueHref = user ? getRoleDashboardPath(user.role) : null;
  const showHeroDashboard = user?.role === "VENDOR";

  const unreadCount = await getNavUnreadCount();

  // Featured products
  const featuredProducts = await prisma.product.findMany({
    where: {
      isPublished: true,
      isService: false,
      store: sellableStoreWhere(),
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
      store: sellableStoreWhere(),
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

  const savedStoreIds = await getSavedStoreIds();

  const featuredStoresRaw = await prisma.store.findMany({
    where: sellableStoreWhere(),
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      logoUrl: true,
      coverPhotoUrl: true,
      region: true,
      tags: true,
      _count: {
        select: { products: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const featuredStoresSection = featuredStoresRaw.length >= 3 ? featuredStoresRaw : [];

  const reviewByStoreId = new Map<string, { avg: number; count: number }>();
  if (featuredStoresSection.length > 0) {
    const reviewGroups = await prisma.review.groupBy({
      by: ["storeId"],
      where: {
        storeId: { in: featuredStoresSection.map((s) => s.id) },
        productId: null,
      },
      _avg: { rating: true },
      _count: { id: true },
    });
    for (const row of reviewGroups) {
      if (row.storeId) {
        reviewByStoreId.set(row.storeId, {
          avg: row._avg.rating ?? 0,
          count: row._count.id,
        });
      }
    }
  }

  const featuredStoreCards = featuredStoresSection.map((store) => {
    const r = reviewByStoreId.get(store.id);
    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      tagline: store.tagline,
      logoUrl: store.logoUrl,
      coverPhotoUrl: store.coverPhotoUrl,
      regionLabel: getRegionLabel(store.region),
      productCount: store._count.products,
      tags: [...store.tags],
      reviewAvg: r ? r.avg : null,
      reviewCount: r?.count ?? 0,
      initialSaved: savedStoreIds.includes(store.id),
    };
  });

  // Stats
  const [storeCount, productCount] = await Promise.all([
    prisma.store.count({ where: { status: "ACTIVE" } }),
    prisma.product.count({ where: { isPublished: true } }),
  ]);

  // Upcoming events
  const upcomingEvents = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      startDate: { gte: new Date() },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      startDate: true,
      coverImage: true,
      venueName: true,
      region: true,
      isOnline: true,
      store: { select: { name: true, slug: true, logoUrl: true } },
      ticketTypes: {
        select: {
          price: true,
          quantity: true,
          quantitySold: true,
          isVisible: true,
        },
      },
    },
    orderBy: { startDate: "asc" },
    take: 6,
  });

  const TOP_CATEGORIES = PRODUCT_CATEGORIES.slice(0, 14);

  return (
    <div className={`min-h-screen overflow-x-hidden pb-mobile-public lg:pb-0 ${tw.fontSans} bg-[#F7F5F1]`}>
      <PublicNav
        transparent
        logoVariant="wordmark"
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
        unreadCount={unreadCount}
      />

      <div className="flex flex-col">
        {/* Hero */}
        <HeroSlider
          continueHref={continueHref}
          showDashboardButton={showHeroDashboard}
        />

        {/* Stats bar */}
        <div className="relative overflow-hidden border-y border-white/10 bg-[#171714]">
          <div className="absolute inset-0" style={{ background: css.scarletGlowRow }} />
          <div className="relative mx-auto max-w-screen-xl px-4 py-5 font-sans sm:px-6 sm:py-7">
            <div className="grid grid-cols-3 divide-x divide-white/10">
              {[
                { value: `${storeCount}+`, label: "Local stores" },
                { value: `${productCount}+`, label: "Products listed" },
                { value: "T&T", label: "Island-wide delivery" },
              ].map((stat) => (
                <div key={stat.label} className="flex min-w-0 flex-col items-center gap-1 px-2 text-center sm:gap-2">
                  <p className="text-xl font-black tabular-nums text-white sm:text-4xl">{stat.value}</p>
                  <p className="max-w-28 text-[8px] font-bold uppercase leading-3 tracking-[0.12em] text-white/50 sm:text-[11px]">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky category strip */}
        <div
          id="browse-categories"
          className="static z-30 border-b border-zinc-900/10 bg-white/95 shadow-[0_10px_35px_rgba(30,25,20,.06)] backdrop-blur-xl sm:sticky sm:top-0"
        >
          <div className="relative mx-auto max-w-screen-xl px-4 sm:px-6">
            <div className="scrollbar-hide flex gap-2 overflow-x-auto py-3 sm:py-4">
              <Link
                href="/shop"
                className={`shrink-0 whitespace-nowrap ${radius.pill} ${tw.bgScarlet} px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 ease-in-out ${tw.hoverBgScarletHover}`}
              >
                All products
              </Link>
              {TOP_CATEGORIES.map((cat) => (
                <Link
                  key={cat.value}
                  href={`/shop?category=${cat.value}`}
                  className={`shrink-0 whitespace-nowrap ${radius.pill} border border-zinc-200 bg-[#F8F7F4] px-4 py-1.5 text-xs font-semibold text-[#1C1C1A] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D4450A]/50 hover:bg-orange-50`}
                >
                  {cat.label}
                </Link>
              ))}
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-2 right-0 w-[60px] bg-gradient-to-l from-[#F5F5F5] to-transparent"
            />
          </div>
        </div>
      </div>

      {/* Featured products */}
      {featuredProducts.length > 0 && (
        <section className={`relative mx-auto max-w-screen-xl px-4 sm:px-6 ${spacing.sectionY}`}>
          <div className="mb-8 flex items-end justify-between gap-4 sm:mb-12">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className={`h-0.5 w-10 shrink-0 ${radius.pill} ${tw.bgScarlet}`} />
                <p className={`${typography.caption} ${tw.textScarlet}`}>Shop now</p>
              </div>
              <h2 className={`${typography.h2} ${tw.textPrimary}`}>
                Featured
                <br />
                <span className={`italic ${tw.textScarlet}`}>products</span>
              </h2>
            </div>
            <Link
              href="/shop"
              className={`group flex shrink-0 items-center gap-2 ${radius.pill} border border-zinc-300 bg-white px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide ${tw.textPrimary} shadow-sm transition-all hover:border-zinc-900 hover:bg-zinc-900 hover:text-white sm:px-5 sm:text-xs`}
            >
              View all
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} aria-hidden />
            </Link>
          </div>

          <div className={`grid grid-cols-2 sm:grid-cols-4 ${spacing.cardGap}`}>
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
                  className={`group relative overflow-hidden rounded-[1.35rem] bg-white ring-1 ring-black/[0.05] transition-all duration-300 hover:-translate-y-1.5 ${shadow.card} hover:shadow-xl ${
                    isHero ? "col-span-2 row-span-2" : ""
                  }`}
                >
                  <div className={`relative overflow-hidden bg-zinc-100 ${isHero ? "aspect-square" : "aspect-square"}`}>
                    {product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="size-12 text-zinc-300" strokeWidth={1.25} aria-hidden />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    {discount && (
                      <div className={`absolute left-3 top-3 ${radius.pill} ${tw.bgScarlet} px-2.5 py-1 text-[11px] font-black text-white ${shadow.modal}`}>
                        -{discount}%
                      </div>
                    )}
                    {product.isDigital && (
                      <div className={`absolute bottom-3 left-3 flex items-center gap-1 ${radius.pill} ${tw.bgDark} px-2.5 py-1 text-[10px] font-bold text-white`}>
                        <ArrowDownToLine className="size-3 shrink-0" aria-hidden strokeWidth={2.25} />
                        Digital
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
                      className={`font-semibold leading-snug ${tw.textPrimary} transition-colors ${tw.hoverTextScarlet} ${isHero ? "text-base sm:text-lg" : "truncate text-sm"}`}
                    >
                      {product.name}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <p className={`font-black ${tw.textScarlet} ${isHero ? "text-xl" : "text-sm"}`}>
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
        <section className={`relative overflow-hidden border-y border-white/5 ${spacing.sectionY} bg-[#171714]`}>
          <div
            className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl"
            style={{ background: css.scarletRadialSoft }}
          />
          <div
            className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full opacity-10 blur-3xl"
            style={{ background: css.scarletRadialMuted }}
          />
          <div className="relative mx-auto max-w-screen-xl px-4 sm:px-6">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <div className={`h-0.5 w-10 shrink-0 ${radius.pill} ${tw.bgScarlet}`} />
                  <p className={`${typography.caption} ${tw.textScarlet}`}>Book now</p>
                </div>
                <h2 className={`${typography.h2} text-white`}>
                  Local
                  <br />
                  <span className={`italic ${tw.textScarlet}`}>services</span>
                </h2>
              </div>
              <Link
                href="/services"
                className={`group flex items-center gap-2 ${radius.pill} border-2 ${tw.borderDarkMuted} px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition-all hover:border-white hover:bg-white hover:text-zinc-900`}
              >
                View all
                <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden />
              </Link>
            </div>
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${spacing.cardGap}`}>
              {featuredServices.map((service) => (
                <Link
                  key={service.id}
                  href={`/service/${service.slug}`}
                  className="group overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.065] shadow-[0_16px_50px_rgba(0,0,0,.18)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-[#D4450A]/40 hover:bg-white/[0.09]"
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
                        <div className="flex h-full w-full items-center justify-center bg-white/5">
                          <Bell className="size-9 text-white/35" aria-hidden strokeWidth={1.25} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
                    </div>
                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <ServiceTypeBadge type={service.serviceType} />
                        <p className={`mt-2 ${typography.bodySmall} font-bold leading-snug text-white transition-colors ${tw.hoverTextScarlet}`}>
                          {service.name}
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-500">
                          {service.store.name}
                          {service.store.region ? ` · ${getRegionLabel(service.store.region)}` : ""}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                        <div>
                          {service.serviceType === "QUOTE" && service.quotePriceType === "FREE_QUOTE" ? (
                            <p className={`text-sm font-black ${tw.textScarlet}`}>Free quote</p>
                          ) : (
                            <p className={`text-sm font-black ${tw.textScarlet}`}>
                              {service.serviceType === "QUOTE" && service.quotePriceType === "STARTING_FROM" ? "From " : ""}
                              TTD {service.price.toFixed(2)}
                            </p>
                          )}
                          {service.serviceDuration ? (
                            <p className="text-[10px] text-zinc-500">
                              {service.serviceDuration >= 60
                                ? `${Math.floor(service.serviceDuration / 60)}h${service.serviceDuration % 60 > 0 ? ` ${service.serviceDuration % 60}m` : ""}`
                                : `${service.serviceDuration} min`}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 ${radius.pill} ${tw.bgScarlet} px-3 py-1.5 text-[11px] font-bold text-white transition-all group-hover:scale-105 ${tw.hoverBgScarletHover}`}
                        >
                          Book
                          <ArrowRight className="size-3" aria-hidden strokeWidth={2.5} />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Service categories */}
      <section className={`bg-gradient-to-b from-[#FFF9F5] to-[#F7F5F1] ${spacing.sectionY}`}>
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className={`h-0.5 w-10 shrink-0 ${radius.pill} ${tw.bgScarlet}`} />
                <p className={`${typography.caption} ${tw.textScarlet}`}>Book a professional</p>
              </div>
              <h2 className={`${typography.h2} ${tw.textPrimary}`}>
                Browse by
                <br />
                <span className={`italic ${tw.textScarlet}`}>service type</span>
              </h2>
            </div>
            <Link
              href="/services"
              className={`group flex items-center gap-2 ${radius.pill} border-2 border-zinc-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide ${tw.textPrimary} transition-all hover:bg-zinc-900 hover:text-white`}
            >
              All services
              <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {SERVICE_CATEGORY_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group flex min-h-32 flex-col items-center justify-center gap-3 rounded-[1.35rem] border border-orange-900/10 bg-white/90 px-2 py-6 text-center shadow-[0_12px_35px_rgba(70,35,15,.06)] transition-all duration-300 hover:-translate-y-1 hover:border-[#D4450A]/35 hover:bg-[#FFF5EF] hover:shadow-lg sm:py-8"
              >
                <item.Icon
                  className={`size-8 transition-transform duration-300 group-hover:scale-110 ${tw.textScarlet}`}
                  aria-hidden
                  strokeWidth={1.75}
                />
                <p className={`${typography.bodySmall} font-semibold text-zinc-600 ${tw.hoverTextScarlet}`}>
                  {item.label}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured stores — require ≥3 stores for a balanced grid */}
      {featuredStoreCards.length > 0 && (
        <section className="bg-white py-14 sm:py-20 md:py-28">
          <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
            <div className="mb-10 flex items-end justify-between gap-6">
              <div>
                <p className="font-sans text-xs uppercase tracking-wide text-[#D4450A]">Discover</p>
                <div className="mt-2 h-px w-8 bg-[#D4450A]" aria-hidden />
                <h2 className="mt-4 font-sans text-3xl font-black tracking-[-0.035em] text-[#1C1C1A] sm:text-5xl">Local stores</h2>
              </div>
              <Link
                href="/stores"
                className={`group flex shrink-0 items-center gap-2 ${radius.pill} border-2 border-[#1C1C1A] px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-[#1C1C1A] transition-all duration-200 ease-in-out hover:bg-[#1C1C1A] hover:text-white`}
              >
                View all
                <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
              {featuredStoreCards.map((store) => (
                <HomeFeaturedStoreCard key={store.id} store={store} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Upcoming events */}
      {upcomingEvents.length > 0 && (
        <section className="bg-[#F0ECE6] py-14 sm:py-20 md:py-28">
          <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <p className={`mb-1 text-xs font-bold uppercase tracking-widest ${tw.textScarlet}`}>
                  Get tickets
                </p>
                <h2 className="font-sans text-3xl font-black tracking-tight text-[#1C1C1A] sm:text-5xl">
                  Upcoming Events
                </h2>
              </div>
              <Link
                href="/events"
                className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#D4450A] transition-opacity hover:opacity-80"
              >
                View all events →
              </Link>
            </div>

            {/* Horizontal scroll on mobile, 3-col grid on desktop */}
            <div className="scrollbar-hide -mx-4 flex gap-5 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
              {(upcomingEvents as EventCardData[]).map((event) => (
                <div key={event.id} className="w-72 shrink-0 lg:w-auto">
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className={`relative overflow-hidden bg-white ${spacing.sectionY}`}>
        <div className="absolute inset-0 opacity-[0.42]" style={{ backgroundImage: css.scarletDotsBg }} />
        <div className="relative mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <div className={`h-0.5 w-10 shrink-0 ${radius.pill} ${tw.bgScarlet}`} />
              <p className={`${typography.caption} ${tw.textScarlet}`}>Simple process</p>
              <div className={`h-0.5 w-10 shrink-0 ${radius.pill} ${tw.bgScarlet}`} />
            </div>
            <h2 className={`${typography.h2} ${tw.textPrimary}`}>
              How <span className={`italic ${tw.textScarlet}`}>LinkWe</span> works
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
            {HOW_IT_WORKS_STEPS.map((item, idx) => (
              <div
                key={item.step}
                className="relative flex flex-col items-center rounded-[1.5rem] border border-zinc-900/5 bg-[#FAF8F5] px-6 py-8 text-center shadow-[0_12px_40px_rgba(40,30,20,.05)] sm:px-8"
              >
                <div
                  className={`mb-6 flex h-20 w-20 items-center justify-center rounded-lg ${item.lightClass} ${shadow.modal} ring-2 ring-[#D4450A]/25`}
                >
                  <item.Icon className={`size-8 ${tw.textScarlet}`} aria-hidden strokeWidth={2} />
                </div>
                <p className={`mb-3 text-6xl font-semibold italic leading-none opacity-[0.14] ${tw.textScarlet}`}>{item.step}</p>
                <h3 className={`mb-3 -mt-4 ${typography.h4} ${tw.textPrimary}`}>{item.title}</h3>
                <p className={`${typography.bodySmall} leading-7 text-zinc-500`}>{item.desc}</p>
                {idx < 2 ? (
                  <div className="absolute right-0 top-10 hidden -translate-y-1/2 sm:block">
                    <ArrowRight className="size-6 text-[#D4450A]/30" aria-hidden strokeWidth={1.5} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vendor CTA */}
      <section className={`relative overflow-hidden ${spacing.sectionY}`} style={{ background: css.vendorCtaGradient }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "url('/wave.png')", backgroundSize: "cover" }} />
        <div
          className="absolute right-0 top-0 h-[600px] w-[600px] rounded-full opacity-10 blur-3xl"
          style={{ background: css.scarletRadialMuted }}
        />
        <div className="relative mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="flex flex-col items-start gap-12 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className={`mb-6 inline-flex items-center gap-2 ${radius.pill} border border-white/20 bg-white/10 px-4 py-2`}>
                <div className={`h-1.5 w-1.5 shrink-0 ${radius.avatar} bg-white/90`} />
                <span className={`${typography.caption} text-white/90`}>Grow your business</span>
              </div>
              <h2 className={`${typography.h1} text-white`}>
                Sell on
                <br />
                <span className="italic text-white">LinkWe</span>
              </h2>
              <p className={`mt-6 max-w-lg ${typography.body} leading-8 ${tw.textOnDarkMuted}`}>
                Join Trinidad and Tobago&apos;s fastest growing marketplace. Sell products, offer services, accept
                bookings, and reach customers island-wide.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {[
                  "Products & digital downloads",
                  "Bookable services",
                  "Secure WiPay payments",
                  "Delivery management",
                  "AI-powered tools",
                ].map((feature) => (
                  <span
                    key={feature}
                    className={`inline-flex items-center gap-1.5 ${radius.pill} border border-white/20 bg-white/10 px-4 py-2 ${typography.bodySmall} font-medium text-white/80`}
                  >
                    <Check className="size-3.5 shrink-0" aria-hidden strokeWidth={2.5} />
                    {feature}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-4 sm:flex-row lg:flex-col">
              <Link
                href="/register?role=vendor"
                className={`flex items-center justify-center gap-2 ${radius.card} bg-white px-10 py-5 text-sm font-bold ${tw.textScarlet} shadow-2xl transition-all hover:scale-[1.02]`}
              >
                Start selling
                <ArrowRight className="size-4" strokeWidth={2.5} aria-hidden />
              </Link>
              <Link
                href="/stores"
                className={`flex items-center justify-center gap-2 ${radius.card} border-2 border-white/30 px-10 py-5 text-sm font-bold text-white transition-all hover:border-white hover:bg-white/10`}
              >
                Browse stores
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Get the app section */}
      <section className={`${spacing.sectionY} border-t border-white/10 bg-[#11110F] px-4 sm:px-6`}>
        <div className="mx-auto max-w-screen-xl">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] px-5 py-9 text-center shadow-2xl sm:px-10 lg:flex lg:items-center lg:gap-16 lg:px-14 lg:py-12 lg:text-left">
            <div className="flex-1">
              <p className={`${typography.caption} ${tw.textScarlet}`}>Free download</p>
              <h2 className={`mt-3 ${typography.h2} text-white`}>Take LinkWe everywhere</h2>
              <p className={`mt-4 max-w-lg ${typography.bodySmall} leading-7 text-zinc-400`}>
                Install the LinkWe app on your phone or computer. Shop local vendors, book services, track orders —
                all from your home screen. No app store required.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 justify-center lg:justify-start">
                <Link
                  href="/get-app"
                  className={`inline-flex items-center gap-2 ${radius.card} ${tw.bgScarlet} px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-[0.92]`}
                >
                  <Download className="size-4 shrink-0" aria-hidden strokeWidth={2} />
                  Get the app
                </Link>
                <Link
                  href="/shop"
                  className={`${radius.card} border-2 border-white/20 px-6 py-3 text-sm font-bold text-white transition-colors hover:border-white/40`}
                >
                  Browse first
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-4 justify-center lg:justify-start">
                {[
                  { Icon: Smartphone, label: "iPhone & iPad" },
                  { Icon: Cpu, label: "Android" },
                  { Icon: Monitor, label: "Desktop" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-2">
                    <row.Icon className="size-4 text-zinc-400" aria-hidden strokeWidth={2} />
                    <span className={`${typography.bodySmall} font-semibold text-zinc-400`}>{row.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-10 flex shrink-0 justify-center lg:mt-0">
              <div className="relative">
                <div className={`absolute inset-0 rounded-xl blur-3xl opacity-30`} style={{ background: css.scarletRadialLight }} />
                <img
                  src="/linkwe-pwa-192-v3.png"
                  alt="LinkWe app"
                  className={`relative h-40 w-40 rounded-xl shadow-2xl ring-4 ring-white/10`}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#11110F] px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-screen-xl">
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 lg:grid-cols-5">
            <div className="col-span-2 sm:col-span-4 lg:col-span-2">
              <img src="/linkwe-logo-on-dark.png" alt="LinkWe" className="mb-5 h-10 w-auto object-contain" />
              <p className={`max-w-xs ${typography.bodySmall} leading-7 text-zinc-500`}>
                We People. We Business. We Marketplace. Shop local and support local across Trinidad &amp; Tobago.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  { Icon: ShoppingBag, label: "Shop" },
                  { Icon: Store, label: "Sell" },
                  { Icon: Calendar, label: "Book" },
                ].map((tag) => (
                  <span
                    key={tag.label}
                    className={`inline-flex items-center gap-1.5 ${radius.pill} border border-zinc-800 px-3 py-1.5 ${typography.bodySmall} font-semibold text-zinc-500`}
                  >
                    <tag.Icon className="size-3.5 shrink-0" aria-hidden strokeWidth={2} />
                    {tag.label}
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
                <p className={`mb-5 ${typography.caption} text-zinc-400`}>{col.title}</p>
                <div className="flex flex-col gap-3">
                  {col.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`${typography.bodySmall} text-zinc-500 transition-colors hover:text-white`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-800/60 pt-8 sm:flex-row">
            <p className="text-xs text-zinc-600">
              © {new Date().getFullYear()} LinkWe. We People. We Business. We Marketplace.
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
