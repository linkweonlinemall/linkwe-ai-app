"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { IconAdjustments } from "@tabler/icons-react";

import AddToCartButton from "@/components/product/AddToCartButton";
import ProductCardChooseOptionsLink from "@/components/shop/ProductCardChooseOptionsLink";
import StoreAboutTab from "@/components/storefront/StoreAboutTab";
import StoreMobileFilterSheet from "@/components/storefront/StoreMobileFilterSheet";
import StoreProductFiltersPanel from "@/components/storefront/StoreProductFiltersPanel";
import StoreServiceFiltersPanel from "@/components/storefront/StoreServiceFiltersPanel";
import StoreWriteReviewSection from "@/components/storefront/StoreWriteReviewSection";
import ReviewsList from "@/components/ui/ReviewsList";
import { StorefrontMapAndProducts, type StorefrontProductRow } from "@/components/storefront/StorefrontMapAndProducts";
import type { PartnerContentItem } from "@/lib/cross-store/types";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { COLOUR_OPTIONS } from "@/lib/variant-options";
import RelatedContentCards from "@/components/storefront/RelatedContentCards";
import WishlistButton from "@/components/ui/WishlistButton";
import { formatTTDPrice } from "@/lib/format/price";

const PLACEHOLDER_COLORS = ["#E8820C", "#1A7FB5", "#D4450A", "#15803D", "#7C3AED"] as const;

const AMENITY_ICON_MAP: Record<string, string> = {
  free_wifi: "📶",
  parking_available: "🅿️",
  wheelchair_accessible: "♿",
  air_conditioned: "❄️",
  outdoor_seating: "🌿",
  indoor_seating: "🪑",
  waiting_area: "🛋️",
  private_rooms: "🚪",
  card_payments: "💳",
  cash_accepted: "💵",
  linx_accepted: "🏦",
  online_payment: "📱",
  free_consultation: "💬",
  payment_plans: "📋",
  deposits_required: "💰",
  home_visits: "🏠",
  mobile_service: "🚗",
  virtual_sessions: "💻",
  same_day_service: "⚡",
  emergency_service: "🚨",
  weekend_available: "📅",
  evening_available: "🌙",
  walk_ins_welcome: "🚶",
  by_appointment_only: "📌",
  sanitized_equipment: "🧼",
  gloves_used: "🧤",
  masks_available: "😷",
  vaccinated_staff: "💉",
  insured: "🛡️",
  certified_staff: "🎓",
  pet_friendly: "🐾",
  family_friendly: "👨‍👩‍👧",
  child_friendly: "👶",
  refreshments: "☕",
  loyalty_program: "⭐",
  delivery_available: "🚚",
  pickup_available: "📦",
  free_delivery: "🎁",
  express_delivery: "⚡",
  installation_included: "🔧",
  removal_service: "🗑️",
};

function formatAmenityLabel(value: string): string {
  if (value.includes(" ")) return value;
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

type StoreTabProduct = StorefrontProductRow & {
  stock: number | null;
  compareAtPrice?: number | null;
  hasVariants: boolean;
  isFeatured?: boolean;
  variants: { attributes: unknown }[];
};

type StoreTabServiceRow = {
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

function StoreTabProductCard({ product, wishlisted }: { product: StoreTabProduct; wishlisted: boolean }) {
  const [hovered, setHovered] = useState(false);
  const img = product.images[0];
  const bgColor = PLACEHOLDER_COLORS[product.name.length % PLACEHOLDER_COLORS.length];
  const isLowStock = product.stock !== null && product.stock <= 5 && product.stock > 0;
  const isOutOfStock = product.stock === 0;
  const compareAt = product.compareAtPrice ?? null;

  return (
    <li className="h-full">
      <div
        className="group relative flex flex-col overflow-hidden rounded-2xl bg-white transition-all duration-300 h-full"
        style={{
          border: "1px solid var(--card-border)",
          boxShadow: hovered
            ? "0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)"
            : "0 2px 8px rgba(0,0,0,0.06)",
          transform: hovered ? "translateY(-4px)" : "translateY(0)",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="absolute right-2.5 top-2.5 z-20"><WishlistButton productId={product.id} initialWishlisted={wishlisted} /></div>
        <div className="relative">
          <Link href={`/products/${product.slug}`} className="block">
            <div className="relative overflow-hidden" style={{ aspectRatio: "1/1" }}>
              {img ? (
                <img
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                  src={img}
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ backgroundColor: `${bgColor}12` }}
                >
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-white"
                    style={{ backgroundColor: `${bgColor}40` }}
                  >
                    {product.name.charAt(0)}
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </Link>

          {isLowStock && (
            <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Only {product.stock} left
            </div>
          )}
          {isOutOfStock && (
            <div className="absolute top-2 left-2 bg-zinc-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Out of stock
            </div>
          )}

          <div
            className="absolute inset-x-0 bottom-0 flex justify-center px-3 pb-3"
            style={{
              opacity: hovered ? 1 : 0,
              transform: hovered ? "translateY(0)" : "translateY(8px)",
              transition: "opacity 0.2s, transform 0.2s",
              pointerEvents: hovered ? "auto" : "none",
            }}
          >
            <div className="w-full max-w-[220px]">
              {product.hasVariants ? (
                <ProductCardChooseOptionsLink slug={product.slug} />
              ) : (
                <AddToCartButton productId={product.id} productName={product.name} stock={product.stock} />
              )}
            </div>
          </div>
        </div>

        <Link href={`/products/${product.slug}`} className="flex flex-col p-4 flex-1 bg-white">
          {product.category ? (
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              {product.category.replace(/_/g, " ")}
            </p>
          ) : null}

          <p className="mb-2 line-clamp-2 flex-1 text-sm font-semibold leading-snug text-zinc-900">{product.name}</p>

          <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-2">
            <div>
              <p className="text-base font-black" style={{ color: "var(--scarlet)" }}>
                {formatTTDPrice(product.price ?? 0)}
              </p>
              {compareAt && compareAt > product.price ? (
                <p className="-mt-0.5 text-xs text-zinc-400 line-through">TTD {compareAt.toFixed(2)}</p>
              ) : null}
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D4450A]/10 transition-colors duration-200 group-hover:bg-[#D4450A]">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-[#D4450A] group-hover:text-white transition-colors duration-200"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
          </div>
        </Link>
      </div>
    </li>
  );
}

type TimeSlot = { from: string; to: string };
type DaySchedule = { closed: boolean; allDay: boolean; slots: TimeSlot[] };
type WeekSchedule = Record<string, DaySchedule>;

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export type StorefrontTabsStore = {
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

const TAB_IDS = ["about", "store", "services", "partners", "reviews"] as const;
type TabId = (typeof TAB_IDS)[number];

/** Constrains tab body width; hero, stats, and tab bar stay full width. */
const TAB_CONTENT_CLASS = "mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-7 lg:py-8";

type Props = {
  store: StorefrontTabsStore;
  storeId: string;
  initialSaved: boolean;
  followerCount: number;
  products: StoreTabProduct[];
  wishlistProductIds?: string[];
  services?: StoreTabServiceRow[];
  partnerItems?: PartnerContentItem[];
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
  store,
  storeId,
  initialSaved,
  followerCount,
  products,
  wishlistProductIds = [],
  services,
  partnerItems = [],
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
  const router = useRouter();
  const pathname = usePathname();
  const tabParam = searchParams.get("tab");
  const activeTab: TabId = TAB_IDS.includes(tabParam as TabId)
    ? (tabParam as TabId)
    : "about";

  function setActiveTab(tab: TabId) {
    const sp = new URLSearchParams(searchParams.toString());
    if (tab === "about") {
      sp.delete("tab");
    } else {
      sp.set("tab", tab);
    }
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
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
    { id: "about", label: "About" },
    { id: "store", label: "Store", count: products.length },
    { id: "services", label: "Services", count: services?.length ?? 0 },
    { id: "partners", label: "Collab", count: partnerItems.length },
    { id: "reviews", label: "Reviews", count: reviewData?.count ?? 0 },
  ];

  void canEditStore;
  void hasSocialLinks;

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-[0.5px] border-[var(--color-border-tertiary)] bg-white">
        <div className="hide-scrollbar flex flex-nowrap overflow-x-auto px-4 md:px-7">
          {tabItems.map(({ id, label, count }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`relative shrink-0 whitespace-nowrap px-4 py-[14px] text-[13px] font-medium transition-colors hover:text-[var(--text-primary)] ${
                  isActive
                    ? "border-b-2 border-[#D4450A] text-[#D4450A]"
                    : "border-b-2 border-transparent text-[var(--text-secondary)]"
                }`}
              >
                {label}
                {count != null && count > 0 ? (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      isActive ? "bg-[#FEF0EB] text-[#D4450A]" : "bg-[#F7F7F6] text-[var(--text-muted)]"
                    }`}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <main className="pb-[80px] lg:pb-8">
      {activeTab === "about" ? (
        <div className="bg-[#F7F5F2]">
          <div className={TAB_CONTENT_CLASS}>
            <StoreAboutTab
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
            <aside className="hidden w-72 shrink-0 lg:block lg:sticky lg:top-[60px] lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto">
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

            <div className="min-w-0 flex-1">
              {products.length === 0 ? (
                <div className="rounded-xl border border-[0.5px] border-[var(--color-border-tertiary)] bg-white p-6 text-center">
                  <p className="text-sm text-[var(--text-muted)]">No products available yet.</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <p className="py-12 text-center text-sm text-[var(--text-muted)]">No products found</p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {filteredProducts.map((product) => (
                    <StoreTabProductCard key={product.id} product={product} wishlisted={wishlistProductIds.includes(product.id)} />
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

      {activeTab === "partners" ? <div className={TAB_CONTENT_CLASS}><section className="overflow-hidden rounded-[28px] border border-orange-100 bg-[radial-gradient(circle_at_top_right,rgba(242,122,61,.18),transparent_36%),linear-gradient(145deg,#fff,#fff8f3)] p-5 shadow-[0_18px_55px_rgba(212,69,10,.10)] sm:p-8"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#D4450A]">Trusted network</p><h2 className="mt-2 text-2xl font-black text-zinc-950">From partner stores</h2><p className="mb-6 mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Discover products and services this store recommends from approved LinkWe partners.</p>{partnerItems.length ? <RelatedContentCards items={partnerItems.map((item)=>({id:item.id,name:item.name,image:item.image,price:item.price,href:item.href}))}/>:<div className="rounded-2xl border border-dashed border-orange-200 bg-white/70 py-14 text-center text-sm text-zinc-500">This store has not featured any partner items yet.</div>}</section></div> : null}

      {activeTab === "services" ? (
        <div className={TAB_CONTENT_CLASS}>
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
              <aside className="hidden w-72 shrink-0 lg:block lg:sticky lg:top-[60px] lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto">
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

              <div className="min-w-0 flex-1">
              {filteredServices.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center">
                  <span className="mb-3 block text-4xl">🛎️</span>
                  <p className="text-sm font-semibold text-zinc-700">No services found</p>
                  <p className="mt-1 text-xs text-zinc-400">Try adjusting your filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredServices.map((service) => {
                    const typeConfig: Record<string, { label: string; color: string; icon: string }> = {
                      BOOKABLE: { label: "Bookable", color: "bg-blue-50 text-blue-700", icon: "📅" },
                      QUOTE: { label: "Get Quote", color: "bg-amber-50 text-amber-700", icon: "💬" },
                      SUBSCRIPTION: { label: "Subscribe", color: "bg-purple-50 text-purple-700", icon: "🔄" },
                      ON_DEMAND: { label: "On Demand", color: "bg-emerald-50 text-emerald-700", icon: "⚡" },
                      VIRTUAL: { label: "Virtual", color: "bg-zinc-100 text-zinc-700", icon: "💻" },
                    };
                    const type = service.serviceType
                      ? (typeConfig[service.serviceType] ?? {
                          label: "Service",
                          color: "bg-zinc-100 text-zinc-700",
                          icon: "🛎️",
                        })
                      : { label: "Service", color: "bg-zinc-100 text-zinc-700", icon: "🛎️" };

                    return (
                      <Link
                        key={service.id}
                        href={`/service/${service.slug}`}
                        className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-200">
                          <div className="absolute right-2.5 top-2.5 z-20"><WishlistButton productId={service.id} initialWishlisted={wishlistProductIds.includes(service.id)} /></div>
                          {service.images[0] ? (
                            <img
                              src={service.images[0]}
                              alt={service.name}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-3xl">🛎️</div>
                          )}
                          <div className="absolute left-2.5 top-2.5">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${type.color}`}>
                              {type.icon} {type.label}
                            </span>
                          </div>
                          {service.isFeatured ? (
                            <div className="absolute bottom-2.5 right-2.5">
                              <span className="rounded-full bg-[#D4450A] px-2.5 py-1 text-[10px] font-bold text-white">
                                Featured
                              </span>
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-1 flex-col gap-2 p-4">
                          <p className="text-sm font-bold leading-snug text-zinc-900 transition-colors group-hover:text-[#D4450A]">
                            {service.name}
                          </p>
                          <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-2">
                            <div>
                              <p className="text-sm font-black text-[#D4450A]">
                                {formatTTDPrice(service.price ?? 0)}
                              </p>
                              {service.serviceDuration ? (
                                <p className="text-[10px] text-zinc-400">
                                  {service.serviceDuration >= 60
                                    ? `${Math.floor(service.serviceDuration / 60)}h${
                                        service.serviceDuration % 60 > 0
                                          ? ` ${service.serviceDuration % 60}m`
                                          : ""
                                      }`
                                    : `${service.serviceDuration} min`}
                                </p>
                              ) : null}
                            </div>
                            {service.serviceLocation ? (
                              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-medium capitalize text-zinc-500">
                                {service.serviceLocation.replace("_", " ").toLowerCase()}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
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
          <StoreWriteReviewSection
            storeId={storeId}
            storeName={store.name}
            isLoggedIn={isLoggedIn}
            userReview={userReview ?? null}
          />
          <ReviewsList
            reviews={(reviewData?.reviews ?? []) as never}
            count={reviewData?.count ?? 0}
            average={reviewData?.average ?? 0}
            showProductName
          />
        </div>
      ) : null}

      {relatedStores && relatedStores.length > 0 ? (
        <div className="mt-12 border-t border-zinc-200 px-4 pt-8 md:px-7">
          <h2 className="mb-4 text-lg font-bold text-zinc-900">Similar stores</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {relatedStores.map((s) => (
              <Link
                key={s.id}
                href={`/store/${s.slug}`}
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
