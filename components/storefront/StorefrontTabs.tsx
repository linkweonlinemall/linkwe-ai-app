"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import StoreAboutTab from "@/components/storefront/StoreAboutTab";
import StoreWriteReviewSection from "@/components/storefront/StoreWriteReviewSection";
import ReviewsList from "@/components/ui/ReviewsList";
import { type StorefrontProductRow } from "@/components/storefront/StorefrontMapAndProducts";
import type { PartnerContentItem } from "@/lib/cross-store/types";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import RelatedContentCards from "@/components/storefront/RelatedContentCards";
import { CalendarDays, Compass, Heart, Images, MessageCircle, Newspaper, ShoppingBag, Sparkles, Star, Store, UsersRound, Wrench, type LucideIcon } from "lucide-react";

import StorefrontImage from "./StorefrontImage";
import StorefrontEvents, { type StorefrontEvent } from "./StorefrontEvents";
import StorefrontOverview from "./StorefrontOverview";
import StoreCatalogue from "./StoreCatalogue";
import styles from "./storefront.module.css";

type StoreTabProduct = StorefrontProductRow & {
  stock: number | null;
  compareAtPrice?: number | null;
  hasVariants: boolean;
  isFeatured?: boolean;
  createdAt?: Date | string;
  variants: { attributes: unknown; stock?: number | null; price?: number | null }[];
};

type StoreTabServiceRow = {
  createdAt?: Date | string; compareAtPrice?: number | null;
  quotePriceType?: string | null; subscriptionInterval?: string | null; isAvailable?: boolean;
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  category: string | null;
  serviceType: string | null;
  serviceDuration: number | null;
  durationMinutes?: number | null;
  serviceLocation: string | null;
  isFeatured: boolean;
};

type RelatedStore = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  tagline: string | null;
  region: string;
  categoryId: string;
};

type TimeSlot = { from: string; to: string };
type DaySchedule = { closed: boolean; allDay: boolean; slots: TimeSlot[] };
type WeekSchedule = Record<string, DaySchedule>;

export type StorefrontTabsStore = {
  isAvailableNow?: boolean;
  name: string;
  slug: string;
  logoUrl: string | null;
  tagline: string | null;
  categoryId: string;
  region: string;
  images: { id: string; url: string; position: number }[];
  description: string | null;
  policies: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  tags: string[];
  amenities: string[];
  owner: { fullName: string };
};

type StoreTimelinePost = { id: string; caption: string; images: string[]; attachments: unknown; createdAt: string; _count: { likes: number; comments: number } };

const TAB_IDS = ["discover", "catalogue", "about", "timeline", "store", "services", "partners", "reviews", "events"] as const;
type TabId = (typeof TAB_IDS)[number];

const TAB_ICONS: Record<TabId, LucideIcon> = {
  discover: Compass,
  catalogue: ShoppingBag,
  store: ShoppingBag,
  services: Wrench,
  events: CalendarDays,
  about: Store,
  timeline: Newspaper,
  reviews: Star,
  partners: UsersRound,
};

/** Constrains tab body width; hero, stats, and tab bar stay full width. */
const TAB_CONTENT_CLASS = `${styles.container} ${styles.catalogueBody}`;

type Props = {
  preview?: boolean;
  store: StorefrontTabsStore;
  storeId: string;
  initialSaved: boolean;
  followerCount: number;
  products: StoreTabProduct[];
  wishlistProductIds?: string[];
  services?: StoreTabServiceRow[];
  events?: StorefrontEvent[];
  partnerItems?: PartnerContentItem[];
  timelinePosts?: StoreTimelinePost[];
  relatedStores?: RelatedStore[];
  openingHours: WeekSchedule | null;
  socialLinks: Record<string, string>;
  hasSocialLinks: boolean;
  canEditStore?: boolean;
  reviewData?: {
    reviews: unknown[];
    count: number;
    average: number;
  };
  userReview?: {
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
  } | null;
  isLoggedIn: boolean;
};

export default function StorefrontTabs({
  preview = false,
  store,
  storeId,
  initialSaved,
  followerCount,
  products,
  wishlistProductIds = [],
  services,
  events = [],
  partnerItems = [],
  timelinePosts = [],
  relatedStores,
  openingHours,
  socialLinks,
  hasSocialLinks,
  canEditStore,
  reviewData,
  userReview,
  isLoggedIn,
}: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const tabParam = searchParams.get("tab");
  const activeTab: TabId = TAB_IDS.includes(tabParam as TabId)
    ? (tabParam as TabId)
    : "discover";
  const tabNav = useRef<HTMLElement>(null);
  const selectedTab = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const nav = tabNav.current;
    const selected = selectedTab.current;
    if (!nav || !selected || nav.scrollWidth <= nav.clientWidth) return;
    // Reveal the selected item on narrow screens without moving the page vertically.
    nav.scrollTo({ left: nav.scrollLeft + selected.getBoundingClientRect().left - nav.getBoundingClientRect().left - (nav.clientWidth - selected.offsetWidth) / 2, behavior: "instant" });
  }, [activeTab]);

  function setActiveTab(tab: TabId) {
    const sp = new URLSearchParams(searchParams.toString());
    if (tab === "discover") {
      sp.delete("tab");
    } else {
      sp.set("tab", tab);
    }
    const qs = sp.toString();
    window.history.pushState(null, "", `${qs ? `${pathname}?${qs}` : pathname}#store-content`);
    document.getElementById("store-content")?.scrollIntoView({ block: "start", behavior: "instant" });
  }

  const tabItems: { id: TabId; label: string; count?: number }[] = [
    { id: "discover", label: "Discover" },
    { id: "catalogue", label: "Catalogue", count: products.filter(p => p.isFeatured).length + (services ?? []).filter(s => s.isFeatured).length },
    ...(products.length > 0 || !services?.length ? [{ id: "store" as const, label: "The collection", count: products.length }] : []),
    ...(services?.length ? [{ id: "services" as const, label: "Services", count: services.length }] : []),
    ...(events.length ? [{ id: "events" as const, label: "Events", count: events.length }] : []),
    { id: "about", label: "Store info" },
    { id: "timeline", label: "Timeline", count: timelinePosts.length },
    { id: "reviews", label: "Reviews", count: reviewData?.count ?? 0 },
    { id: "partners", label: "Our circle", count: partnerItems.length },
  ];

  void canEditStore;
  void hasSocialLinks;

  return (
    <>
      <div className={styles.tabAnchor} id="store-content" />
      <div className={styles.tabBar}>
        <nav ref={tabNav} className={`${styles.container} ${styles.tabInner}`} aria-label="Explore this store">
          {tabItems.map(({ id, label, count }) => {
            const Icon = TAB_ICONS[id];
            return <button key={id} ref={activeTab === id ? selectedTab : undefined} type="button" onClick={() => setActiveTab(id)} aria-pressed={activeTab === id}>
              <Icon size={18} strokeWidth={1.9} aria-hidden />
              {label}
              {count != null && count > 0 && <span>{count}</span>}
            </button>;
          })}
        </nav>
      </div>

      <main className="pb-[80px] lg:pb-8">
      {activeTab === "discover" && <StorefrontOverview store={store} products={products} services={services ?? []} events={events} wishlistProductIds={wishlistProductIds} preview={preview} openingHours={openingHours} socialLinks={socialLinks} onNavigate={setActiveTab} />}
      {activeTab === "events" && <div className={TAB_CONTENT_CLASS}><StorefrontEvents events={events} /></div>}
      {activeTab === "about" ? (
        <div className={styles.detailsBody}>
          <div className={TAB_CONTENT_CLASS}>
            <StoreAboutTab
              preview={preview}
              basePath={pathname}
              store={store}
              storeId={storeId}
              slug={store.slug}
              products={products}
              services={services ?? []}
              partnerItems={partnerItems}
              openingHours={openingHours}
              socialLinks={socialLinks}
              initialFollowing={initialSaved}
              followerCount={followerCount}
            />
          </div>
        </div>
      ) : null}

      {(activeTab === "catalogue" || activeTab === "store" || activeTab === "services") && <div className={TAB_CONTENT_CLASS}><StoreCatalogue key={activeTab} mode={activeTab} products={products} services={services ?? []} storeName={store.name} availableNow={store.isAvailableNow} preview={preview} wishlistProductIds={wishlistProductIds} /></div>}

      {activeTab === "timeline" && <div className={TAB_CONTENT_CLASS}>
        <div className={styles.catalogueHeader}><div><p className={styles.eyebrow}>STRAIGHT FROM {store.name}</p><h2>The story keeps going.</h2><p>New arrivals, offers, events, and everyday moments from the business.</p></div></div>
        {timelinePosts.length ? <div className={styles.timelineGrid}>{timelinePosts.map(post => <Link href={`/timeline/${post.id}`} key={post.id} className={styles.timelineCard}>
          {post.images[0] ? <div className={styles.timelineMedia}><StorefrontImage src={post.images[0]} alt={post.caption ? post.caption.slice(0, 120) : `${store.name} update`} />{post.images.length > 1 && <span><Images size={14} aria-hidden /> {post.images.length}</span>}</div> : <div className={styles.timelinePlaceholder}><MessageCircle size={42} strokeWidth={1} aria-hidden /></div>}
          <div className={styles.timelineCopy}><p>{post.caption || "Photo update"}</p><div><span><Heart size={14} aria-hidden />{post._count.likes}</span><span><MessageCircle size={14} aria-hidden />{post._count.comments}</span><time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString("en-TT", { month: "short", day: "numeric" })}</time></div></div>
        </Link>)}</div> : <div className={styles.emptyState}><Sparkles size={38} strokeWidth={1} aria-hidden /><h3>A new story is taking shape.</h3><p>Check back for the latest from {store.name}.</p></div>}
      </div>}

      {activeTab === "partners" && <div className={TAB_CONTENT_CLASS}>
        <div className={styles.catalogueHeader}><div><p className={styles.eyebrow}>GOOD COMPANY</p><h2>Meet the local circle.</h2><p>Products and services this store recommends from approved LinkWe partners.</p></div></div>
        {partnerItems.length ? <RelatedContentCards items={partnerItems.map(item => ({ id: item.id, name: item.name, image: item.image, price: item.price, href: item.href }))} /> : <div className={styles.emptyState}><Heart size={38} strokeWidth={1} aria-hidden /><h3>Connections worth coming back for.</h3><p>This store has not featured any partner items yet.</p></div>}
      </div>}

      {activeTab === "reviews" ? (
        <div className={`flex flex-col gap-4 ${TAB_CONTENT_CLASS}`}>
          <div className={styles.catalogueHeader}><div><p className={styles.eyebrow}>WORD OF MOUTH</p><h2>What people are saying.</h2><p>Reviews and experiences from the LinkWe community.</p></div></div>
          {!preview && <StoreWriteReviewSection
            storeId={storeId}
            storeName={store.name}
            isLoggedIn={isLoggedIn}
            userReview={userReview ?? null}
          />}
          <ReviewsList
            reviews={(reviewData?.reviews ?? []) as never}
            count={reviewData?.count ?? 0}
            average={reviewData?.average ?? 0}
            showProductName
          />
        </div>
      ) : null}

      {relatedStores && relatedStores.length > 0 ? (
        <div className={`${styles.container} ${styles.relatedSection}`}>
          <h2 className="mb-4 text-lg font-bold text-zinc-900">Keep it local.</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {relatedStores.map((s) => (
              <Link
                key={s.id}
                href={`${preview ? "https://www.linkweonlinemall.com" : ""}/store/${s.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Cover / logo area */}
                <div className="relative h-20 overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-200">
                  {s.coverPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.coverPhotoUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div
                      className="h-full w-full"
                      style={{ background: "linear-gradient(135deg, #1C1C1A 0%, #45443F 100%)" }}
                    />
                  )}
                  {/* Logo overlay */}
                  <div className="absolute -bottom-4 left-3">
                    <div className="h-10 w-10 overflow-hidden rounded-xl border-2 border-white shadow-sm">
                      {s.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.logoUrl} alt={s.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#D4450A] text-xs font-bold text-white">
                          {s.name[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Info */}
                <div className="px-3 pb-3 pt-6">
                  <p className="truncate text-xs font-bold text-zinc-900 transition-colors group-hover:text-[#D4450A]">
                    {s.name}
                  </p>
                  {s.tagline ? (
                    <p className="mt-0.5 truncate text-[10px] text-zinc-400">{s.tagline}</p>
                  ) : (
                    <p className="mt-0.5 text-[10px] text-zinc-400">{getRegionLabel(s.region)}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      </main>
    </>
  );
}
