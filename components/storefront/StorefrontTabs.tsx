"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconAdjustments } from "@tabler/icons-react";

import StoreAboutTab from "@/components/storefront/StoreAboutTab";
import StoreMobileFilterSheet from "@/components/storefront/StoreMobileFilterSheet";
import StoreProductFiltersPanel from "@/components/storefront/StoreProductFiltersPanel";
import StoreServiceFiltersPanel from "@/components/storefront/StoreServiceFiltersPanel";
import StoreWriteReviewSection from "@/components/storefront/StoreWriteReviewSection";
import ReviewsList from "@/components/ui/ReviewsList";
import { type StorefrontProductRow } from "@/components/storefront/StorefrontMapAndProducts";
import type { PartnerContentItem } from "@/lib/cross-store/types";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { COLOUR_OPTIONS } from "@/lib/variant-options";
import RelatedContentCards from "@/components/storefront/RelatedContentCards";
import { CalendarDays, Compass, Heart, Images, MessageCircle, Newspaper, Search, ShoppingBag, Sparkles, Star, Store, UsersRound, Wrench, type LucideIcon } from "lucide-react";

import StorefrontListingCard from "./StorefrontListingCard";
import StorefrontImage from "./StorefrontImage";
import StorefrontEvents, { type StorefrontEvent } from "./StorefrontEvents";
import StorefrontOverview from "./StorefrontOverview";
import styles from "./storefront.module.css";

type StoreTabProduct = StorefrontProductRow & {
  stock: number | null;
  compareAtPrice?: number | null;
  hasVariants: boolean;
  isFeatured?: boolean;
  variants: { attributes: unknown }[];
};

type StoreTabServiceRow = {
  quotePriceType?: string | null; subscriptionInterval?: string | null; isAvailable?: boolean;
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  category: string | null;
  serviceType: string | null;
  serviceDuration: number | null;
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

const TAB_IDS = ["discover", "about", "timeline", "store", "services", "partners", "reviews", "events"] as const;
type TabId = (typeof TAB_IDS)[number];

const TAB_ICONS: Record<TabId, LucideIcon> = {
  discover: Compass,
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

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [productColour, setProductColour] = useState("");
  const [productSize, setProductSize] = useState("");
  const [storeFilterOpen, setStoreFilterOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceType, setServiceType] = useState("All");
  const [serviceSort, setServiceSort] = useState("default");
  const [servicePriceMin, setServicePriceMin] = useState("");
  const [servicePriceMax, setServicePriceMax] = useState("");
  const [serviceLocation, setServiceLocation] = useState("All");
  const [serviceCategory, setServiceCategory] = useState("All");
  const [servicesFilterOpen, setServicesFilterOpen] = useState(false);

  function resetStoreFilters() {
    setCategory("All");
    setSearch("");
    setPriceMin("");
    setPriceMax("");
    setSortBy("default");
    setInStockOnly(false);
    setProductColour("");
    setProductSize("");
  }

  function resetServiceFilters() {
    setServiceSearch("");
    setServiceType("All");
    setServiceSort("default");
    setServicePriceMin("");
    setServicePriceMax("");
    setServiceLocation("All");
    setServiceCategory("All");
  }

  const categories = useMemo(() => {
    const unique = new Set<string>();
    for (const p of products) {
      const c = p.category?.trim();
      if (c) unique.add(c);
    }
    return ["All", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = products.filter((p) => {
      const nameOk =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.category?.toLowerCase() ?? "").includes(q);
      const catOk = category === "All" || (p.category?.trim() ?? "") === category;
      const minOk = !priceMin || p.price >= parseFloat(priceMin);
      const maxOk = !priceMax || p.price <= parseFloat(priceMax);
      const stockOk = !inStockOnly || p.stock === null || p.stock > 0;
      const attributes = p.variants.flatMap((variant) => Array.isArray(variant.attributes) ? variant.attributes : []);
      const hasAttribute = (name: string, value: string) => !value || attributes.some((raw) => {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
        const attr = raw as { name?: unknown; value?: unknown };
        return typeof attr.name === "string" && typeof attr.value === "string" && attr.name.toLowerCase() === name && attr.value.toLowerCase() === value.toLowerCase();
      });
      return nameOk && catOk && minOk && maxOk && stockOk && hasAttribute("colour", productColour) && hasAttribute("size", productSize);
    });
    if (sortBy === "price_asc") result = [...result].sort((a, b) => a.price - b.price);
    if (sortBy === "price_desc") result = [...result].sort((a, b) => b.price - a.price);
    if (sortBy === "name") result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "name_desc") result = [...result].sort((a, b) => b.name.localeCompare(a.name));
    if (sortBy === "newest") result = [...result].reverse();
    if (sortBy === "stock") result = [...result].sort((a, b) => (b.stock ?? 0) - (a.stock ?? 0));
    return result;
  }, [products, search, category, priceMin, priceMax, sortBy, inStockOnly, productColour, productSize]);

  const storeVariantFilters = useMemo(() => {
    const colours = new Set<string>(); const sizes = new Set<string>();
    for (const product of products) for (const variant of product.variants) {
      if (!Array.isArray(variant.attributes)) continue;
      for (const raw of variant.attributes) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
        const attr = raw as { name?: unknown; value?: unknown };
        if (typeof attr.name !== "string" || typeof attr.value !== "string") continue;
        if (attr.name.toLowerCase() === "colour") colours.add(attr.value.toLowerCase());
        if (attr.name.toLowerCase() === "size") sizes.add(attr.value);
      }
    }
    const hex = new Map(COLOUR_OPTIONS.map((option) => [option.value, option.hex]));
    return { colours: Array.from(colours).sort().map((value) => ({ value, hex: hex.get(value) ?? "#a1a1aa" })), sizes: Array.from(sizes).sort() };
  }, [products]);

  const filteredServices = (services ?? [])
    .filter((s) => {
      if (serviceSearch && !s.name.toLowerCase().includes(serviceSearch.toLowerCase())) return false;
      if (serviceType !== "All" && s.serviceType !== serviceType) return false;
      if (serviceLocation !== "All" && s.serviceLocation !== serviceLocation) return false;
      if (serviceCategory !== "All" && s.category !== serviceCategory) return false;
      const min = servicePriceMin ? parseFloat(servicePriceMin) : null;
      const max = servicePriceMax ? parseFloat(servicePriceMax) : null;
      if (min !== null && !Number.isNaN(min) && s.price < min) return false;
      if (max !== null && !Number.isNaN(max) && s.price > max) return false;
      return true;
    })
    .sort((a, b) => {
      if (serviceSort === "price_asc") return a.price - b.price;
      if (serviceSort === "price_desc") return b.price - a.price;
      if (serviceSort === "name") return a.name.localeCompare(b.name);
      if (serviceSort === "name_desc") return b.name.localeCompare(a.name);
      if (serviceSort === "duration") return (a.serviceDuration ?? Number.MAX_SAFE_INTEGER) - (b.serviceDuration ?? Number.MAX_SAFE_INTEGER);
      return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
    });

  const serviceCategories = useMemo(
    () => Array.from(new Set((services ?? []).map((service) => service.category).filter(Boolean) as string[])).sort(),
    [services],
  );

  const tabItems: { id: TabId; label: string; count?: number }[] = [
    { id: "discover", label: "Discover" },
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

      {activeTab === "store" ? (
        <div className={TAB_CONTENT_CLASS}>
        <div className={styles.catalogueHeader}><div><p className={styles.eyebrow}>THE FULL COLLECTION</p><h2>A little more to love.</h2><p aria-live="polite">{filteredProducts.length} {filteredProducts.length === 1 ? "find" : "finds"} from {store.name}</p></div><label className={styles.catalogueSearch}><Search size={17} aria-hidden /><input aria-label="Search this store" type="search" placeholder="Find your something…" value={search} onChange={event => setSearch(event.target.value)} /></label></div>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 overflow-x-auto lg:hidden">
            <button
              type="button"
              onClick={() => setStoreFilterOpen(true)}
              className="flex min-h-[36px] shrink-0 items-center gap-1 rounded-full border border-[0.5px] border-[var(--color-border-tertiary)] bg-white px-3 text-xs font-semibold"
            >
              <IconAdjustments className="size-3.5" aria-hidden /> Filters
            </button>
            {category !== "All" ? (
              <button
                type="button"
                onClick={() => setCategory("All")}
                className="flex min-h-[36px] shrink-0 items-center rounded-full bg-[#D4450A] px-3 text-xs font-semibold text-white"
              >
                {category.replace(/_/g, " ")} ×
              </button>
            ) : null}
            {inStockOnly ? (
              <button
                type="button"
                onClick={() => setInStockOnly(false)}
                className="flex min-h-[36px] shrink-0 items-center rounded-full bg-[#D4450A] px-3 text-xs font-semibold text-white"
              >
                In stock ×
              </button>
            ) : null}
            {sortBy !== "default" ? (
              <button
                type="button"
                onClick={() => setSortBy("default")}
                className="flex min-h-[36px] shrink-0 items-center rounded-full bg-[#D4450A] px-3 text-xs font-semibold text-white"
              >
                Sorted ×
              </button>
            ) : null}
            {(priceMin || priceMax) ? (
              <button
                type="button"
                onClick={() => { setPriceMin(""); setPriceMax(""); }}
                className="flex min-h-[36px] shrink-0 items-center rounded-full bg-[#D4450A] px-3 text-xs font-semibold text-white"
              >
                Price ×
              </button>
            ) : null}
          </div>

          <div className="flex flex-col gap-6 lg:flex-row">
            <aside className={`${styles.filterAside} hidden lg:block`}>
              <StoreProductFiltersPanel
                search={search}
                setSearch={setSearch}
                sortBy={sortBy}
                setSortBy={setSortBy}
                category={category}
                setCategory={setCategory}
                categories={categories}
                priceMin={priceMin}
                setPriceMin={setPriceMin}
                priceMax={priceMax}
                setPriceMax={setPriceMax}
                inStockOnly={inStockOnly}
                setInStockOnly={setInStockOnly}
                onClear={resetStoreFilters}
                colour={productColour}
                setColour={setProductColour}
                size={productSize}
                setSize={setProductSize}
                availableColours={storeVariantFilters.colours}
                availableSizes={storeVariantFilters.sizes}
              />
            </aside>

            <div className={styles.catalogueResults}>
              {products.length === 0 ? (
                <div className="rounded-xl border border-[0.5px] border-[var(--color-border-tertiary)] bg-white p-6 text-center">
                  <p className="text-sm text-[var(--text-muted)]">No products available yet.</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <p className="py-12 text-center text-sm text-[var(--text-muted)]">No products found</p>
              ) : (
                <ul className={styles.catalogueGrid}>
                  {filteredProducts.map((product) => (
                    <li key={product.id}><StorefrontListingCard item={product} preview={preview} wishlisted={wishlistProductIds.includes(product.id)} /></li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <StoreMobileFilterSheet
            open={storeFilterOpen}
            onClose={() => setStoreFilterOpen(false)}
            onReset={resetStoreFilters}
            resultCount={filteredProducts.length}
            resultLabel={filteredProducts.length === 1 ? "product" : "products"}
          >
            <StoreProductFiltersPanel
              search={search}
              setSearch={setSearch}
              sortBy={sortBy}
              setSortBy={setSortBy}
              category={category}
              setCategory={setCategory}
              categories={categories}
              priceMin={priceMin}
              setPriceMin={setPriceMin}
              priceMax={priceMax}
              setPriceMax={setPriceMax}
              inStockOnly={inStockOnly}
              setInStockOnly={setInStockOnly}
              onClear={resetStoreFilters}
              colour={productColour}
              setColour={setProductColour}
              size={productSize}
              setSize={setProductSize}
              availableColours={storeVariantFilters.colours}
              availableSizes={storeVariantFilters.sizes}
            />
          </StoreMobileFilterSheet>
        </div>
        </div>
      ) : null}

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

      {activeTab === "services" ? (
        <div className={TAB_CONTENT_CLASS}>
        <div className={styles.catalogueHeader}><div><p className={styles.eyebrow}>GOOD PEOPLE. GREAT AT WHAT THEY DO.</p><h2>Let’s make it happen.</h2><p aria-live="polite">{filteredServices.length} {filteredServices.length === 1 ? "service" : "services"} from {store.name}</p></div><label className={styles.catalogueSearch}><Search size={17} aria-hidden /><input aria-label="Search this store’s services" type="search" placeholder="What can we help with?" value={serviceSearch} onChange={event => setServiceSearch(event.target.value)} /></label></div>
        {!services || services.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center">
            <span className="mb-3 block text-4xl">🛎️</span>
            <p className="text-sm font-semibold text-zinc-700">No services yet</p>
            <p className="mt-1 text-xs text-zinc-400">This store has not added any services.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 overflow-x-auto lg:hidden">
              <button
                type="button"
                onClick={() => setServicesFilterOpen(true)}
                className="flex min-h-[36px] shrink-0 items-center gap-1 rounded-full border border-[0.5px] border-[var(--color-border-tertiary)] bg-white px-3 text-xs font-semibold"
              >
                <IconAdjustments className="size-3.5" aria-hidden /> Filters
              </button>
              {serviceType !== "All" ? (
                <button
                  type="button"
                  onClick={() => setServiceType("All")}
                  className="flex min-h-[36px] shrink-0 items-center rounded-full bg-[#D4450A] px-3 text-xs font-semibold text-white"
                >
                  {serviceType.replace(/_/g, " ")} ×
                </button>
              ) : null}
              {serviceSort !== "default" ? (
                <button
                  type="button"
                  onClick={() => setServiceSort("default")}
                  className="flex min-h-[36px] shrink-0 items-center rounded-full bg-[#D4450A] px-3 text-xs font-semibold text-white"
                >
                  Sorted ×
                </button>
              ) : null}
              {(servicePriceMin || servicePriceMax) ? (
                <button
                  type="button"
                  onClick={() => {
                    setServicePriceMin("");
                    setServicePriceMax("");
                  }}
                  className="flex min-h-[36px] shrink-0 items-center rounded-full bg-[#D4450A] px-3 text-xs font-semibold text-white"
                >
                  Price ×
                </button>
              ) : null}
            </div>

            <div className="flex flex-col gap-6 lg:flex-row">
              <aside className={`${styles.filterAside} hidden lg:block`}>
                <StoreServiceFiltersPanel
                  serviceSearch={serviceSearch}
                  setServiceSearch={setServiceSearch}
                  serviceSort={serviceSort}
                  setServiceSort={setServiceSort}
                  serviceType={serviceType}
                  setServiceType={setServiceType}
                  servicePriceMin={servicePriceMin}
                  setServicePriceMin={setServicePriceMin}
                  servicePriceMax={servicePriceMax}
                  setServicePriceMax={setServicePriceMax}
                  serviceLocation={serviceLocation}
                  setServiceLocation={setServiceLocation}
                  serviceCategory={serviceCategory}
                  setServiceCategory={setServiceCategory}
                  categories={serviceCategories}
                  onClear={resetServiceFilters}
                />
              </aside>

              <div className={styles.catalogueResults}>
              {filteredServices.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center">
                  <span className="mb-3 block text-4xl">🛎️</span>
                  <p className="text-sm font-semibold text-zinc-700">No services found</p>
                  <p className="mt-1 text-xs text-zinc-400">Try adjusting your filters.</p>
                </div>
              ) : (
                <div className={styles.catalogueGrid}>
                  {filteredServices.map(service => <StorefrontListingCard key={service.id} item={service} service availableNow={store.isAvailableNow} preview={preview} wishlisted={wishlistProductIds.includes(service.id)} />)}
                </div>
              )}
            </div>
            </div>

            <StoreMobileFilterSheet
              open={servicesFilterOpen}
              onClose={() => setServicesFilterOpen(false)}
              onReset={resetServiceFilters}
              resultCount={filteredServices.length}
              resultLabel={filteredServices.length === 1 ? "service" : "services"}
            >
              <StoreServiceFiltersPanel
                serviceSearch={serviceSearch}
                setServiceSearch={setServiceSearch}
                serviceSort={serviceSort}
                setServiceSort={setServiceSort}
                serviceType={serviceType}
                setServiceType={setServiceType}
                servicePriceMin={servicePriceMin}
                setServicePriceMin={setServicePriceMin}
                servicePriceMax={servicePriceMax}
                setServicePriceMax={setServicePriceMax}
                serviceLocation={serviceLocation}
                setServiceLocation={setServiceLocation}
                serviceCategory={serviceCategory}
                setServiceCategory={setServiceCategory}
                categories={serviceCategories}
                onClear={resetServiceFilters}
              />
            </StoreMobileFilterSheet>
          </div>
        )}
        </div>
      ) : null}

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
