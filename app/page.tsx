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
  Bot,
  Camera,
  ChartBar,
  CreditCard,
  Heart,
  Megaphone,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Ticket,
  Truck,
  WandSparkles,
  Workflow,
} from "lucide-react";
import { formatTTDPrice } from "@/lib/format/price";

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
import { css, radius, shadow, spacing, typography, tw } from "@/lib/design-system";

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

const PLATFORM_FEATURES: { Icon: LucideIcon; title: string; desc: string; href: string; accent: string; wide?: boolean }[] = [
  { Icon: ShoppingBag, title: "Products that fit real life", desc: "Shop physical products, variations and instant digital downloads from local businesses.", href: "/shop", accent: "from-orange-100 to-amber-50 text-[#D4450A]", wide: true },
  { Icon: Calendar, title: "Services, your way", desc: "Book appointments, request quotes, subscribe, or call an on-demand professional.", href: "/services", accent: "from-sky-100 to-blue-50 text-[#1A7FB5]", wide: true },
  { Icon: Ticket, title: "Events & tickets", desc: "Discover events, buy digital tickets and check in with secure QR codes.", href: "/events", accent: "from-rose-100 to-orange-50 text-rose-600" },
  { Icon: Megaphone, title: "Shop the Timeline", desc: "Follow stores and discover launches, offers and products through visual posts.", href: "/timeline", accent: "from-violet-100 to-sky-50 text-violet-600" },
  { Icon: Store, title: "Rich storefronts", desc: "Explore products, services, reviews, business details, partners and updates in one place.", href: "/stores", accent: "from-cyan-100 to-sky-50 text-cyan-700" },
  { Icon: Truck, title: "Flexible fulfilment", desc: "Choose LinkWe delivery, vendor delivery, pickup or instant digital delivery.", href: "/shipping-info", accent: "from-blue-100 to-cyan-50 text-blue-700" },
  { Icon: CreditCard, title: "Secure local checkout", desc: "Pay online in TTD with clear order, booking and ticket confirmation.", href: "/shop", accent: "from-emerald-100 to-cyan-50 text-emerald-700" },
  { Icon: MessagesSquare, title: "Messages & alerts", desc: "Stay connected with stores through messaging, in-app updates and push notifications.", href: "/messages", accent: "from-indigo-100 to-blue-50 text-indigo-700" },
  { Icon: Heart, title: "Save what matters", desc: "Wishlist products, follow favourite stores and build a more personal marketplace.", href: "/wishlist", accent: "from-pink-100 to-rose-50 text-pink-600" },
  { Icon: ShieldCheck, title: "Trust built in", desc: "Verified businesses, reviews and clear policies help every purchase feel more confident.", href: "/stores", accent: "from-teal-100 to-emerald-50 text-teal-700" },
  { Icon: Workflow, title: "Business collaboration", desc: "Vendors can connect products, services, events and partner stores into shared customer journeys.", href: "/register?role=vendor", accent: "from-fuchsia-100 to-violet-50 text-fuchsia-700", wide: true },
  { Icon: ChartBar, title: "A serious vendor workspace", desc: "Manage inventory, orders, bookings, customers, payouts, staff, reports and marketing from one dashboard.", href: "/register?role=vendor", accent: "from-sky-100 to-indigo-50 text-[#1A7FB5]", wide: true },
];

const REX_CAPABILITIES: { Icon: LucideIcon; title: string; desc: string }[] = [
  { Icon: WandSparkles, title: "Build listings faster", desc: "Create and improve products, services and events through a natural conversation." },
  { Icon: Camera, title: "Work with your visuals", desc: "Use store, product, service and event photos while creating polished content." },
  { Icon: Megaphone, title: "Publish timeline posts", desc: "Turn business updates into searchable posts with photos, links and shopping attachments." },
  { Icon: ChartBar, title: "Understand the business", desc: "Ask about sales, stock, orders and performance without digging through every screen." },
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
  const rexHref = user?.role === "VENDOR" ? "/dashboard/vendor/ai-assistant" : "/pricing";

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

      {/* Platform feature bento */}
      <section className="relative overflow-hidden border-b border-sky-100/70 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_45%,#fffaf5_100%)] py-16 sm:py-24">
        <div className="pointer-events-none absolute -left-40 top-20 size-[30rem] rounded-full bg-[#1A7FB5]/12 blur-[110px]" aria-hidden />
        <div className="pointer-events-none absolute -right-32 bottom-0 size-[28rem] rounded-full bg-[#D4450A]/10 blur-[110px]" aria-hidden />
        <div className="relative mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/85 px-4 py-2 text-[10px] font-black uppercase tracking-[.18em] text-[#1A7FB5] shadow-[0_8px_28px_rgba(26,127,181,.12)]"><Sparkles className="size-3.5" /> One marketplace. More possibilities.</span>
            <h2 className="mt-5 text-3xl font-black tracking-[-.04em] text-[#1C1C1A] sm:text-5xl md:text-6xl">Everything local business<br className="hidden sm:block" /> needs to <span className="bg-gradient-to-r from-[#D4450A] via-[#F06A2A] to-[#1A7FB5] bg-clip-text text-transparent">move forward.</span></h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-zinc-500 sm:text-base">LinkWe brings shopping, services, events, delivery, communication and business tools into one beautifully connected experience.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLATFORM_FEATURES.map((feature) => (
              <Link key={feature.title} href={feature.href} className={`group relative min-h-56 overflow-hidden rounded-[1.65rem] border border-white/90 bg-white/90 p-6 shadow-[0_18px_55px_rgba(35,66,87,.10)] ring-1 ring-sky-950/[.04] backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:border-sky-200 hover:shadow-[0_24px_65px_rgba(26,127,181,.16)] ${feature.wide ? "lg:col-span-2" : ""}`}>
                <div className={`flex size-13 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.accent} shadow-[inset_0_1px_0_rgba(255,255,255,.8),0_9px_24px_rgba(45,83,108,.12)]`}><feature.Icon className="size-6" strokeWidth={1.9} aria-hidden /></div>
                <h3 className="mt-6 text-lg font-black tracking-tight text-zinc-900">{feature.title}</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">{feature.desc}</p>
                <span className="absolute bottom-5 right-5 flex size-9 items-center justify-center rounded-full bg-zinc-950 text-white opacity-0 shadow-lg transition-all group-hover:translate-x-0.5 group-hover:opacity-100"><ArrowRight className="size-4" /></span>
                <div className="pointer-events-none absolute -bottom-16 -right-16 size-36 rounded-full bg-gradient-to-br from-[#1A7FB5]/10 to-[#D4450A]/10 blur-2xl transition group-hover:scale-125" aria-hidden />
              </Link>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link href="/shop" className="group flex items-center justify-between gap-4 rounded-[1.5rem] bg-gradient-to-r from-[#1A7FB5] to-[#155f91] p-6 text-white shadow-[0_18px_45px_rgba(26,127,181,.25)] transition hover:-translate-y-1"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-white/65">For customers</p><p className="mt-1 text-xl font-black">Discover what is nearby</p></div><ArrowRight className="size-6 shrink-0 transition-transform group-hover:translate-x-1" /></Link>
            <Link href="/register?role=vendor" className="group flex items-center justify-between gap-4 rounded-[1.5rem] bg-gradient-to-r from-[#D4450A] to-[#F28A2D] p-6 text-white shadow-[0_18px_45px_rgba(212,69,10,.25)] transition hover:-translate-y-1"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-white/70">For businesses</p><p className="mt-1 text-xl font-black">Open your digital storefront</p></div><ArrowRight className="size-6 shrink-0 transition-transform group-hover:translate-x-1" /></Link>
          </div>
        </div>
      </section>

      {/* Timeline spotlight */}
      <section className="relative overflow-hidden border-b border-sky-100 bg-[#07131d] py-16 text-white sm:py-24">
        <div className="pointer-events-none absolute -left-24 top-0 size-80 rounded-full bg-[#1A7FB5]/30 blur-[110px]" aria-hidden />
        <div className="pointer-events-none absolute -right-20 bottom-0 size-72 rounded-full bg-[#D4450A]/20 blur-[100px]" aria-hidden />
        <div className="relative mx-auto grid max-w-screen-xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/25 bg-sky-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-sky-200 shadow-[0_10px_35px_rgba(26,127,181,.18)]"><Megaphone className="size-4" /> The LinkWe Timeline</span>
            <h2 className="mt-6 text-4xl font-black leading-[1.02] tracking-[-.045em] sm:text-6xl">See what local businesses are <span className="bg-gradient-to-r from-sky-300 via-blue-400 to-orange-400 bg-clip-text text-transparent">creating now.</span></h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300">Timeline turns discovery into a living local feed. Follow stores you love, search posts and ads, browse photo carousels, and shop what catches your eye without leaving the conversation.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                { Icon: Search, label: "Search posts, ads and tags" },
                { Icon: Camera, label: "Rich photo carousels" },
                { Icon: Heart, label: "Instant likes and follows" },
                { Icon: MessageCircle, label: "Comments and replies" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.055] px-4 py-3.5 shadow-lg backdrop-blur">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1A7FB5] to-[#2D9AD1] text-white"><item.Icon className="size-4" /></span>
                  <span className="text-sm font-bold text-slate-200">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/timeline" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1A7FB5] to-[#2D9AD1] px-6 text-sm font-black text-white shadow-[0_15px_40px_rgba(26,127,181,.32)] transition hover:-translate-y-0.5">Explore Timeline <ArrowRight className="size-4" /></Link>
              <Link href="/register?role=vendor" className="inline-flex min-h-13 items-center justify-center rounded-2xl border border-white/20 bg-white/[.06] px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/[.11]">Post as a business</Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-8 rounded-full bg-gradient-to-r from-sky-500/20 to-orange-500/15 blur-3xl" aria-hidden />
            <div className="relative rotate-[1deg] overflow-hidden rounded-[2rem] border border-white/15 bg-white/[.08] p-3 shadow-[0_35px_90px_rgba(0,0,0,.4)] backdrop-blur-xl transition duration-500 hover:rotate-0">
              <div className="overflow-hidden rounded-[1.45rem] bg-white text-zinc-900">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-[#1A7FB5] to-[#D4450A] text-sm font-black text-white">LW</span><div><p className="text-sm font-black">Local Finds TT</p><p className="text-[11px] text-zinc-400">Just now · Port of Spain</p></div></div>
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[#D4450A]">New drop</span>
                </div>
                <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-sky-100 via-[#d9eff9] to-orange-100 p-8 sm:p-10">
                  <div className="absolute -right-12 -top-16 size-52 rounded-full bg-[#1A7FB5]/25 blur-2xl" aria-hidden />
                  <div className="absolute -bottom-16 -left-12 size-48 rounded-full bg-[#D4450A]/20 blur-2xl" aria-hidden />
                  <div className="relative flex h-full flex-col justify-between rounded-[1.5rem] border border-white/80 bg-white/55 p-6 shadow-[0_20px_55px_rgba(26,127,181,.17)] backdrop-blur-md">
                    <div className="flex items-center justify-between"><span className="rounded-full bg-white px-3 py-1 text-[9px] font-black uppercase tracking-[.16em] text-[#1A7FB5] shadow-sm">Shop the post</span><span className="text-xs font-bold text-zinc-500">1 / 4</span></div>
                    <div><p className="text-3xl font-black tracking-[-.04em] text-zinc-900 sm:text-5xl">Made here.<br /><span className="text-[#D4450A]">Found here.</span></p><p className="mt-3 max-w-xs text-xs leading-5 text-zinc-600 sm:text-sm">Fresh products, services and events from businesses across T&amp;T.</p></div>
                  </div>
                  <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5"><span className="h-1.5 w-6 rounded-full bg-[#1A7FB5]" /><span className="size-1.5 rounded-full bg-zinc-400/60" /><span className="size-1.5 rounded-full bg-zinc-400/60" /><span className="size-1.5 rounded-full bg-zinc-400/60" /></div>
                </div>
                <div className="p-4">
                  <p className="text-sm leading-6 text-zinc-700"><strong>Local Finds TT</strong> Weekend collection is live. Tap to browse every item.</p>
                  <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3"><div className="flex gap-5 text-zinc-500"><span className="flex items-center gap-1.5 text-xs font-bold"><Heart className="size-4 text-[#D4450A]" /> Like</span><span className="flex items-center gap-1.5 text-xs font-bold"><MessageCircle className="size-4 text-[#1A7FB5]" /> Comment</span></div><span className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-3 py-2 text-[10px] font-black text-white shadow-md">View product</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
                  className={`group relative overflow-hidden rounded-[1.6rem] border border-white bg-gradient-to-br from-white via-white to-sky-50/75 ring-1 ring-sky-950/[0.05] shadow-[0_16px_45px_rgba(38,73,96,.11)] transition-all duration-300 hover:-translate-y-1.5 hover:border-sky-200 hover:shadow-[0_24px_60px_rgba(26,127,181,.17)] ${
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
                        {formatTTDPrice(product.price)}
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
          <div className="absolute -right-24 bottom-0 size-[28rem] rounded-full bg-[#1A7FB5]/20 blur-[110px]" aria-hidden />
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
                              {formatTTDPrice(service.price)}
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
      <section className={`relative overflow-hidden bg-gradient-to-b from-[#FFF9F5] via-[#F7FBFF] to-[#F7F5F1] ${spacing.sectionY}`}>
        <div className="pointer-events-none absolute -left-40 top-12 size-96 rounded-full bg-[#1A7FB5]/10 blur-[100px]" aria-hidden />
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
                className="group flex min-h-32 flex-col items-center justify-center gap-3 rounded-[1.55rem] border border-white bg-gradient-to-br from-white via-white to-sky-50/80 px-2 py-6 text-center shadow-[0_14px_40px_rgba(40,77,100,.09)] ring-1 ring-sky-950/[.04] transition-all duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_20px_48px_rgba(26,127,181,.14)] sm:py-8"
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
        <section className="bg-gradient-to-b from-white via-sky-50/35 to-white py-14 sm:py-20 md:py-28">
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
        <section className="bg-gradient-to-br from-[#F0ECE6] via-white to-sky-50 py-14 sm:py-20 md:py-28">
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
                className="relative flex flex-col items-center rounded-[1.65rem] border border-white bg-gradient-to-br from-[#FAF8F5] via-white to-sky-50/70 px-6 py-8 text-center shadow-[0_16px_45px_rgba(38,73,96,.09)] ring-1 ring-sky-950/[.04] sm:px-8"
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

      {/* Rex AI */}
      <section className="relative overflow-hidden bg-[#111827] py-16 sm:py-24 md:py-28">
        <div className="pointer-events-none absolute -left-44 top-0 size-[36rem] rounded-full bg-[#1A7FB5]/30 blur-[130px]" aria-hidden />
        <div className="pointer-events-none absolute -right-44 bottom-[-10rem] size-[36rem] rounded-full bg-[#D4450A]/25 blur-[130px]" aria-hidden />
        <div className="pointer-events-none absolute inset-0 opacity-[.08] [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:72px_72px]" aria-hidden />
        <div className="relative mx-auto grid max-w-screen-xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:gap-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/25 bg-sky-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-sky-200 shadow-[0_10px_35px_rgba(26,127,181,.16)]"><Bot className="size-4" /> Meet Rex</span>
            <h2 className="mt-6 text-4xl font-black leading-[1.02] tracking-[-.045em] text-white sm:text-6xl">Your business has a lot to do.<br /><span className="bg-gradient-to-r from-sky-300 via-blue-400 to-orange-400 bg-clip-text text-transparent">Rex helps you do it.</span></h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300">Rex is LinkWe&apos;s AI business assistant, built directly into the vendor workspace. Talk naturally, get useful answers and turn ideas into real marketplace actions—without jumping between tools.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {REX_CAPABILITIES.map((item) => <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[.055] p-4 shadow-[0_14px_35px_rgba(0,0,0,.14)] backdrop-blur"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400/20 to-orange-400/15 text-sky-200 ring-1 ring-white/10"><item.Icon className="size-4.5" /></span><div><h3 className="text-sm font-black text-white">{item.title}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{item.desc}</p></div></div></div>)}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href={rexHref} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1A7FB5] to-[#2D9AD1] px-6 text-sm font-black text-white shadow-[0_15px_40px_rgba(26,127,181,.32)] transition hover:-translate-y-0.5"><Sparkles className="size-4" /> {user?.role === "VENDOR" ? "Open Rex" : "Explore vendor plans"}</Link><Link href="/register?role=vendor" className="inline-flex min-h-13 items-center justify-center rounded-2xl border border-white/20 bg-white/[.06] px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/[.11]">Start a business</Link></div>
            <p className="mt-4 text-[11px] text-slate-500">Starter vendors receive complimentary prompts. Growth and Pro include monthly Rex access.</p>
          </div>

          <div className="relative mx-auto w-full max-w-2xl">
            <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-sky-400/20 via-transparent to-orange-400/20 blur-2xl" aria-hidden />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[#0B1220]/90 shadow-[0_35px_100px_rgba(0,0,0,.45)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[.04] px-5 py-4"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1A7FB5] to-[#D4450A] text-white shadow-lg"><Bot className="size-5" /></span><div><p className="text-sm font-black text-white">Rex</p><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Ready to help</p></div></div><span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1 text-[10px] font-bold text-slate-400">LinkWe AI</span></div>
              <div className="space-y-5 p-5 sm:p-7">
                <div className="ml-auto max-w-[84%] rounded-[1.35rem] rounded-br-md bg-gradient-to-r from-[#D4450A] to-[#F06A2A] px-4 py-3 text-sm leading-6 text-white shadow-lg">Create a timeline post for our weekend sale. Use the blue shirt photo and attach the product.</div>
                <div className="max-w-[90%] rounded-[1.35rem] rounded-bl-md border border-white/10 bg-white/[.07] px-4 py-4 text-sm leading-6 text-slate-200 shadow-lg"><p>I found the product and its photos. I&apos;ll create a polished post with shopping tags and the product attached.</p><div className="mt-4 overflow-hidden rounded-2xl border border-sky-300/15 bg-gradient-to-br from-sky-400/10 to-orange-400/10 p-3"><div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-300 to-blue-600 text-white"><ShoppingBag className="size-5" /></span><div><p className="text-xs font-black text-white">Weekend offer post</p><p className="mt-0.5 text-[10px] text-slate-400">Photo · Product attached · Search tags added</p></div><BadgeCheck className="ml-auto size-5 text-emerald-400" /></div></div></div>
                <div className="max-w-[80%] rounded-[1.35rem] rounded-bl-md border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-200"><span className="mr-2">✓</span>Your timeline post is live.</div>
              </div>
              <div className="border-t border-white/10 p-4"><div className="flex min-h-13 items-center gap-3 rounded-2xl border border-white/10 bg-white/[.055] px-4 text-sm text-slate-500"><span className="flex-1">Ask Rex to help your business…</span><span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1A7FB5] to-[#D4450A] text-white"><ArrowRight className="size-4" /></span></div></div>
            </div>
            <div className="absolute -bottom-5 -left-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-bold text-white shadow-xl backdrop-blur-xl sm:-left-8"><span className="text-sky-300">One conversation.</span><br />Real business actions.</div>
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
