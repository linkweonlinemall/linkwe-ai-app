"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AddToCartButton from "@/components/product/AddToCartButton";
import ProductCardChooseOptionsLink from "@/components/shop/ProductCardChooseOptionsLink";
import { StorefrontMapAndProducts, type StorefrontProductRow } from "@/components/storefront/StorefrontMapAndProducts";
import { getRegionLabel } from "@/lib/regions/tt-regions";

const PLACEHOLDER_COLORS = ["#E8820C", "#1A7FB5", "#D4450A", "#15803D", "#7C3AED"] as const;

type StoreTabProduct = StorefrontProductRow & {
  stock: number | null;
  compareAtPrice?: number | null;
  hasVariants: boolean;
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

function StoreTabProductCard({ product }: { product: StoreTabProduct }) {
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
                <AddToCartButton productId={product.id} stock={product.stock} />
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
                TTD {product.price.toFixed(2)}
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

type TabId = "about" | "store" | "services" | "bookings" | "reviews";

type Props = {
  store: StorefrontTabsStore;
  products: StoreTabProduct[];
  services?: StoreTabServiceRow[];
  relatedStores?: RelatedStore[];
  openingHours: WeekSchedule | null;
  socialLinks: Record<string, string>;
  hasSocialLinks: boolean;
  canEditStore?: boolean;
};

export default function StorefrontTabs({
  store,
  products,
  services,
  relatedStores,
  openingHours,
  socialLinks,
  hasSocialLinks,
  canEditStore,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("about");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceType, setServiceType] = useState("All");
  const [serviceSort, setServiceSort] = useState("default");
  const [servicePriceMin, setServicePriceMin] = useState("");
  const [servicePriceMax, setServicePriceMax] = useState("");
  const [storeAboutExpanded, setStoreAboutExpanded] = useState(false);

  function openLightbox(url: string) {
    const index = store.images.findIndex((img) => img.url === url);
    setLightboxIndex(index >= 0 ? index : 0);
    setZoom(1);
  }

  useEffect(() => {
    if (!showShareSheet) return;
    const handler = () => {
      setShowShareSheet(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showShareSheet]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLightboxIndex(null);
        setZoom(1);
      }
      if (e.key === "ArrowRight") {
        setLightboxIndex((i) => (i === null ? null : (i + 1) % store.images.length));
        setZoom(1);
      }
      if (e.key === "ArrowLeft") {
        setLightboxIndex((i) =>
          i === null ? null : (i - 1 + store.images.length) % store.images.length,
        );
        setZoom(1);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxIndex, store.images.length]);

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
      return nameOk && catOk && minOk && maxOk && stockOk;
    });
    if (sortBy === "price_asc") result = [...result].sort((a, b) => a.price - b.price);
    if (sortBy === "price_desc") result = [...result].sort((a, b) => b.price - a.price);
    if (sortBy === "name") result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [products, search, category, priceMin, priceMax, sortBy, inStockOnly]);

  const serviceCategories = [
    "All",
    ...Array.from(new Set((services ?? []).map((s) => s.category).filter(Boolean) as string[])),
  ];

  const serviceTypeOptions = [
    "All",
    ...Array.from(new Set((services ?? []).map((s) => s.serviceType).filter(Boolean) as string[])),
  ];

  const filteredServices = (services ?? [])
    .filter((s) => {
      if (serviceSearch && !s.name.toLowerCase().includes(serviceSearch.toLowerCase())) return false;
      if (serviceType !== "All" && s.serviceType !== serviceType) return false;
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
      return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
    });

  void serviceCategories;

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-1 sm:px-6">
        <div className="flex shrink-0 items-center justify-end gap-2 pb-2">
          {canEditStore ? (
            <Link
              href="/dashboard/vendor/store/edit"
              style={{ backgroundColor: "#D4450A" }}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-white shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:opacity-90 transition-all"
              title="Edit store"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit store
            </Link>
          ) : null}

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowShareSheet(!showShareSheet)}
              className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-zinc-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:shadow-md hover:border-zinc-300 transition-all text-zinc-600"
              title="Share store"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>

            {showShareSheet ? (
              <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl">
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Share this store</p>
                <div className="flex flex-col gap-1">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(store.name + " — " + window.location.href)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: "#25D366" }}>
                      <svg fill="white" height="14" viewBox="0 0 24 24" width="14">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                      </svg>
                    </span>
                    WhatsApp
                  </a>

                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: "#1877F2" }}>
                      <svg fill="white" height="14" viewBox="0 0 24 24" width="14">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </span>
                    Facebook
                  </a>

                  <a
                    href={`https://x.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent("Check out " + store.name + " on LinkWe")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black">
                      <svg fill="white" height="14" viewBox="0 0 24 24" width="14">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </span>
                    X (Twitter)
                  </a>

                  <a
                    href="https://www.instagram.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: "#E1306C" }}>
                      <svg fill="white" height="14" viewBox="0 0 24 24" width="14">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    </span>
                    Instagram
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(window.location.href);
                      setShowShareSheet(false);
                    }}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors w-full text-left"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        height="14"
                        viewBox="0 0 24 24"
                        width="14"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </span>
                    Copy link
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-zinc-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:shadow-md hover:border-zinc-300 transition-all text-zinc-600"
            title="Message store"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          <button
            type="button"
            className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-zinc-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:shadow-md hover:border-zinc-300 transition-all text-zinc-600"
            title="Save store"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:shadow-md hover:border-zinc-300 transition-all"
            title="Follow store"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            Follow
          </button>
        </div>
      </div>

      <div
        className="sticky top-14 z-40 mt-5 sm:top-16"
        style={{
          backgroundColor: "rgba(245,245,245,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div className="mx-auto min-w-0 max-w-7xl px-4 sm:px-6">
          <div
            className="hide-scrollbar -mx-1 flex gap-0 overflow-x-auto px-1"
            style={{
              borderBottom: "1px solid var(--card-border)",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {(["About", "Store", "Services", "Bookings", "Reviews"] as const).map((label) => {
              const id = label.toLowerCase() as TabId;
              const isActive = activeTab === id;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className="relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors duration-150 sm:px-5"
                  style={{
                    color: isActive ? "var(--scarlet)" : "var(--text-muted)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {label}
                  {label === "Store" && products.length > 0 ? (
                    <span
                      className="ml-1.5 rounded-full px-1.5 py-0.5 text-[11px]"
                      style={{
                        backgroundColor: isActive ? "var(--scarlet-light)" : "#F7F7F6",
                        color: isActive ? "var(--scarlet)" : "var(--text-faint)",
                      }}
                    >
                      {products.length}
                    </span>
                  ) : null}
                  {label === "Services" && (services?.length ?? 0) > 0 ? (
                    <span
                      className="ml-1.5 rounded-full px-1.5 py-0.5 text-[11px]"
                      style={{
                        backgroundColor: isActive ? "var(--scarlet-light)" : "#F7F7F6",
                        color: isActive ? "var(--scarlet)" : "var(--text-faint)",
                      }}
                    >
                      {services!.length}
                    </span>
                  ) : null}
                  {isActive ? (
                    <div
                      className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full sm:left-5 sm:right-5"
                      style={{ backgroundColor: "var(--scarlet)" }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      {activeTab === "about" ? (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            {store.images && store.images.length > 0 ? (
              <div
                className="rounded-2xl border border-zinc-200 bg-white p-5
    shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
              >
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Gallery
                </p>
                <div className="grid grid-cols-2 gap-2" style={{ gridTemplateRows: "auto" }}>
                  <div
                    className="group relative row-span-2 cursor-pointer overflow-hidden rounded-xl"
                    style={{ minHeight: 280 }}
                    onClick={() => openLightbox(store.images[0].url)}
                  >
                    <img
                      alt=""
                      src={store.images[0].url}
                      className="absolute inset-0 h-full w-full object-cover
            transition-transform duration-200 group-hover:scale-105"
                    />
                  </div>
                  <div
                    className="group relative cursor-pointer overflow-hidden rounded-xl"
                    style={{ height: 136 }}
                    onClick={() => store.images[1] && openLightbox(store.images[1].url)}
                  >
                    {store.images[1] && (
                      <img
                        alt=""
                        src={store.images[1].url}
                        className="absolute inset-0 h-full w-full object-cover
              transition-transform duration-200 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div
                    className="group relative cursor-pointer overflow-hidden rounded-xl"
                    style={{ height: 136 }}
                    onClick={() => {
                      if (store.images.length > 3) {
                        setShowAll(true);
                      } else if (store.images[2]) {
                        openLightbox(store.images[2].url);
                      }
                    }}
                  >
                    {store.images[2] && (
                      <>
                        <img
                          alt=""
                          src={store.images[2].url}
                          className="absolute inset-0 h-full w-full object-cover
                transition-transform duration-200 group-hover:scale-105"
                        />
                        {store.images.length > 3 && (
                          <div
                            className="absolute inset-0 flex flex-col
                items-center justify-center rounded-xl bg-black/55"
                          >
                            <div className="mb-1.5 grid grid-cols-2 gap-0.5">
                              {[0, 1, 2, 3].map((k) => (
                                <div key={k} className="h-3 w-3 rounded-sm bg-white/80" />
                              ))}
                            </div>
                            <span className="text-base font-semibold text-white">
                              +{store.images.length - 3}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {showAll && (
                  <div className="mt-3 columns-3 gap-2 space-y-2">
                    {store.images.slice(3).map((img) => (
                      <div
                        key={img.id}
                        className="group break-inside-avoid cursor-pointer
              overflow-hidden rounded-xl"
                        onClick={() => openLightbox(img.url)}
                      >
                        <img
                          alt=""
                          src={img.url}
                          className="w-full object-cover transition-transform duration-200
                group-hover:scale-105"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowAll(false)}
                      className="mt-2 text-xs text-zinc-400 underline hover:text-zinc-600"
                    >
                      Show less
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {store.description ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">About</p>
                <div
                  className={`tiptap-content overflow-hidden text-sm transition-all ${
                    !storeAboutExpanded && store.description.length > 600 ? "max-h-48" : "max-h-none"
                  }`}
                  dangerouslySetInnerHTML={{ __html: store.description }}
                />
                {store.description.length > 600 ? (
                  <button
                    type="button"
                    onClick={() => setStoreAboutExpanded((v) => !v)}
                    className="mt-3 text-xs font-semibold text-[#D4450A] hover:underline"
                  >
                    {storeAboutExpanded ? "Show less ↑" : "Read more ↓"}
                  </button>
                ) : null}
              </div>
            ) : null}

            {store.policies ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Store policies</p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                  {store.policies}
                </p>
              </div>
            ) : null}

            <StorefrontMapAndProducts
              latitude={store.latitude}
              longitude={store.longitude}
              address={store.address}
              products={[]}
            />
          </div>

          <div className="flex flex-col gap-6">
            {openingHours ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">Opening hours</p>
                <ul className="space-y-2">
                  {DAYS.map((day) => {
                    const d = openingHours[day];
                    return (
                      <li key={day} className="flex items-start justify-between text-sm">
                        <span className="w-24 font-medium capitalize text-zinc-700">{day}</span>
                        <span className="text-right text-zinc-500">
                          {!d || d.closed ? (
                            <span className="text-zinc-400">Closed</span>
                          ) : d.allDay ? (
                            <span>24 hours</span>
                          ) : d.slots.length === 0 ? (
                            <span className="text-zinc-400">Closed</span>
                          ) : (
                            <span className="flex flex-col gap-0.5">
                              {d.slots.map((s, i) => (
                                <span key={i}>
                                  {s.from} – {s.to}
                                </span>
                              ))}
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {store.tags && store.tags.length > 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {store.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {store.amenities && store.amenities.length > 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Amenities</p>
                <div className="flex flex-col gap-2">
                  {store.amenities.map((a) => (
                    <span key={a} className="text-sm text-zinc-600">
                      ✓ {a}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Owner</p>
              <p className="text-sm font-medium text-zinc-900">{store.owner.fullName}</p>
              <p className="mt-1 text-xs text-zinc-500">Message this vendor directly through LinkWe.</p>
            </div>

            {hasSocialLinks ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">Follow us</p>
                <div className="flex flex-wrap gap-3">
                  {socialLinks.instagram ? (
                    <a
                      href={`https://instagram.com/${socialLinks.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ backgroundColor: "#E1306C" }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:shadow-md hover:opacity-90 transition-all text-white"
                      title="Instagram"
                    >
                      <svg
                        fill="currentColor"
                        height="18"
                        viewBox="0 0 24 24"
                        width="18"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    </a>
                  ) : null}
                  {socialLinks.facebook ? (
                    <a
                      href={`https://facebook.com/${socialLinks.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ backgroundColor: "#1877F2" }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:shadow-md hover:opacity-90 transition-all text-white"
                      title="Facebook"
                    >
                      <svg
                        fill="currentColor"
                        height="18"
                        viewBox="0 0 24 24"
                        width="18"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </a>
                  ) : null}
                  {socialLinks.tiktok ? (
                    <a
                      href={`https://tiktok.com/@${socialLinks.tiktok}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ backgroundColor: "#000000" }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:shadow-md hover:opacity-90 transition-all text-white"
                      title="TikTok"
                    >
                      <svg
                        fill="currentColor"
                        height="18"
                        viewBox="0 0 24 24"
                        width="18"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                      </svg>
                    </a>
                  ) : null}
                  {socialLinks.youtube ? (
                    <a
                      href={`https://youtube.com/@${socialLinks.youtube}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ backgroundColor: "#FF0000" }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:shadow-md hover:opacity-90 transition-all text-white"
                      title="YouTube"
                    >
                      <svg
                        fill="currentColor"
                        height="18"
                        viewBox="0 0 24 24"
                        width="18"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
                      </svg>
                    </a>
                  ) : null}
                  {socialLinks.x ? (
                    <a
                      href={`https://x.com/${socialLinks.x}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ backgroundColor: "#000000" }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:shadow-md hover:opacity-90 transition-all text-white"
                      title="X"
                    >
                      <svg
                        fill="currentColor"
                        height="18"
                        viewBox="0 0 24 24"
                        width="18"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>
                  ) : null}
                  {socialLinks.linkedin ? (
                    <a
                      href={`https://linkedin.com/in/${socialLinks.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ backgroundColor: "#0A66C2" }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:shadow-md hover:opacity-90 transition-all text-white"
                      title="LinkedIn"
                    >
                      <svg
                        fill="currentColor"
                        height="18"
                        viewBox="0 0 24 24"
                        width="18"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    </a>
                  ) : null}
                  {socialLinks.whatsapp ? (
                    <a
                      href={`https://wa.me/1868${socialLinks.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ backgroundColor: "#25D366" }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:shadow-md hover:opacity-90 transition-all text-white"
                      title="WhatsApp"
                    >
                      <svg
                        fill="currentColor"
                        height="18"
                        viewBox="0 0 24 24"
                        width="18"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                      </svg>
                    </a>
                  ) : null}
                  {socialLinks.website ? (
                    <a
                      href={`https://${socialLinks.website.replace(/^https?:\/\//, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ backgroundColor: "#D4450A" }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:shadow-md hover:opacity-90 transition-all text-white"
                      title="Website"
                    >
                      <svg
                        fill="currentColor"
                        height="18"
                        viewBox="0 0 24 24"
                        width="18"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                      </svg>
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeTab === "store" ? (
        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <aside className="shrink-0 lg:w-64">
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
                <p className="text-sm font-bold text-zinc-900">Filters</p>
                <button
                  type="button"
                  onClick={() => {
                    setCategory("All");
                    setSearch("");
                    setPriceMin("");
                    setPriceMax("");
                    setSortBy("default");
                    setInStockOnly(false);
                  }}
                  className="text-xs font-medium text-[#D4450A] hover:underline"
                >
                  Clear all
                </button>
              </div>

              <div className="border-b border-zinc-100 px-5 py-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">Search</p>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products…"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[#D4450A]"
                />
              </div>

              <div className="border-b border-zinc-100 px-5 py-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">Sort by</p>
                <div className="flex flex-col gap-2">
                  {[
                    { value: "default", label: "Featured" },
                    { value: "price_asc", label: "Price: Low to High" },
                    { value: "price_desc", label: "Price: High to Low" },
                    { value: "name", label: "Name A–Z" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className="group flex cursor-pointer items-center gap-2.5"
                      onClick={() => setSortBy(opt.value)}
                    >
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
                          sortBy === opt.value
                            ? "border-[#D4450A] bg-[#D4450A]"
                            : "border-zinc-300 group-hover:border-[#D4450A]"
                        }`}
                      >
                        {sortBy === opt.value ? <div className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                      </div>
                      <span className="text-sm text-zinc-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-b border-zinc-100 px-5 py-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">Category</p>
                <div className="flex flex-col gap-1.5">
                  {categories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                        category === c
                          ? "bg-[#D4450A]/10 font-semibold text-[#D4450A]"
                          : "text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      <span>{c.replace(/_/g, " ")}</span>
                      {category === c ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-b border-zinc-100 px-5 py-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">Price range (TTD)</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder="Min"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
                  />
                  <span className="shrink-0 text-sm text-zinc-400">–</span>
                  <input
                    type="number"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="Max"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
                  />
                </div>
              </div>

              <div className="px-5 py-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">Availability</p>
                <label
                  className="flex cursor-pointer items-center gap-2.5"
                  onClick={() => setInStockOnly((v) => !v)}
                >
                  <div
                    className={`relative h-5 w-10 cursor-pointer rounded-full transition-colors ${
                      inStockOnly ? "bg-[#D4450A]" : "bg-zinc-200"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        inStockOnly ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                  <span className="text-sm text-zinc-700">In stock only</span>
                </label>
              </div>
            </div>

            {(category !== "All" || priceMin || priceMax || inStockOnly || sortBy !== "default") && (
              <p className="mt-3 text-center text-xs text-zinc-500">
                {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} found
              </p>
            )}
          </aside>

          <div className="flex-1 min-w-0">
            {products.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.08)] text-center">
                <p className="text-sm font-medium text-zinc-500">Products coming soon</p>
                <p className="mt-1 text-xs text-zinc-400">This store has not listed any products yet.</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <p className="py-12 text-center text-sm text-zinc-500">No products found</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map((product) => (
                  <StoreTabProductCard key={product.id} product={product} />
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "services" ? (
        !services || services.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center">
            <span className="mb-3 block text-4xl">🛎️</span>
            <p className="text-sm font-semibold text-zinc-700">No services yet</p>
            <p className="mt-1 text-xs text-zinc-400">This store has not added any services.</p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-6 lg:flex-row">
            {/* Filter sidebar */}
            <aside className="shrink-0 lg:w-64">
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
                <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
                  <p className="text-sm font-bold text-zinc-900">Filters</p>
                  <button
                    type="button"
                    onClick={() => {
                      setServiceSearch("");
                      setServiceType("All");
                      setServiceSort("default");
                      setServicePriceMin("");
                      setServicePriceMax("");
                    }}
                    className="text-xs font-medium text-[#D4450A] hover:underline"
                  >
                    Clear all
                  </button>
                </div>

                {/* Search */}
                <div className="border-b border-zinc-100 px-5 py-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">Search</p>
                  <input
                    type="search"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    placeholder="Search services…"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[#D4450A]"
                  />
                </div>

                {/* Sort */}
                <div className="border-b border-zinc-100 px-5 py-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">Sort by</p>
                  <div className="flex flex-col gap-2">
                    {[
                      { value: "default", label: "Featured" },
                      { value: "price_asc", label: "Price: Low to High" },
                      { value: "price_desc", label: "Price: High to Low" },
                      { value: "name", label: "Name A–Z" },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className="group flex cursor-pointer items-center gap-2.5"
                        onClick={() => setServiceSort(opt.value)}
                      >
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
                            serviceSort === opt.value
                              ? "border-[#D4450A] bg-[#D4450A]"
                              : "border-zinc-300 group-hover:border-[#D4450A]"
                          }`}
                        >
                          {serviceSort === opt.value ? (
                            <div className="h-1.5 w-1.5 rounded-full bg-white" />
                          ) : null}
                        </div>
                        <span className="text-sm text-zinc-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Service type */}
                {serviceTypeOptions.length > 1 ? (
                  <div className="border-b border-zinc-100 px-5 py-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">Service type</p>
                    <div className="flex flex-col gap-1.5">
                      {serviceTypeOptions.map((t) => {
                        const typeLabels: Record<string, string> = {
                          BOOKABLE: "📅 Bookable",
                          QUOTE: "💬 Quote",
                          SUBSCRIPTION: "🔄 Subscription",
                          ON_DEMAND: "⚡ On Demand",
                          VIRTUAL: "💻 Virtual",
                        };
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setServiceType(t)}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                              serviceType === t
                                ? "bg-[#D4450A]/10 font-semibold text-[#D4450A]"
                                : "text-zinc-600 hover:bg-zinc-50"
                            }`}
                          >
                            <span>{t === "All" ? "All types" : typeLabels[t] ?? t}</span>
                            {serviceType === t ? (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Price range */}
                <div className="px-5 py-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">Price range (TTD)</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={servicePriceMin}
                      onChange={(e) => setServicePriceMin(e.target.value)}
                      placeholder="Min"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
                    />
                    <span className="shrink-0 text-sm text-zinc-400">–</span>
                    <input
                      type="number"
                      value={servicePriceMax}
                      onChange={(e) => setServicePriceMax(e.target.value)}
                      placeholder="Max"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {serviceType !== "All" ||
              serviceSearch ||
              servicePriceMin ||
              servicePriceMax ||
              serviceSort !== "default" ? (
                <p className="mt-3 text-center text-xs text-zinc-500">
                  {filteredServices.length} service{filteredServices.length !== 1 ? "s" : ""} found
                </p>
              ) : null}
            </aside>

            {/* Services grid */}
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
                            <div className="absolute right-2.5 top-2.5">
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
                                TTD {service.price.toFixed(2)}
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
        )
      ) : null}

      {activeTab === "bookings" ? (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
          <p className="text-sm font-medium text-zinc-500">Bookings coming soon</p>
        </div>
      ) : null}

      {activeTab === "reviews" ? (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
          <p className="text-sm font-medium text-zinc-500">Reviews coming soon</p>
        </div>
      ) : null}

      {relatedStores && relatedStores.length > 0 ? (
        <div className="mt-12 border-t border-zinc-200 pt-8">
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

      {lightboxIndex !== null && store.images[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          onClick={() => {
            setLightboxIndex(null);
            setZoom(1);
          }}
        >
          {/* Header */}
          <div
            className="flex shrink-0 items-center justify-between px-4 py-3"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-sm text-zinc-400">
              {lightboxIndex + 1} of {store.images.length}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(z + 0.5, 3))}
                className="rounded-lg p-1.5 text-lg leading-none text-zinc-400
            hover:bg-white/10 hover:text-white"
                title="Zoom in"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(z - 0.5, 1))}
                className="rounded-lg p-1.5 text-lg leading-none text-zinc-400
            hover:bg-white/10 hover:text-white"
                title="Zoom out"
              >
                −
              </button>
              <a
                href={store.images[lightboxIndex].url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-1.5 text-zinc-400
            hover:bg-white/10 hover:text-white"
                title="Download"
                onClick={(e) => e.stopPropagation()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </a>
              <button
                type="button"
                onClick={() => {
                  setLightboxIndex(null);
                  setZoom(1);
                }}
                className="rounded-lg p-1.5 text-xl leading-none text-zinc-400
            hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>

          {/* Image area */}
          <div
            className="relative flex flex-1 items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {store.images.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setLightboxIndex((i) =>
                    i === null ? null : (i - 1 + store.images.length) % store.images.length,
                  );
                  setZoom(1);
                }}
                className="absolute left-3 z-10 flex h-10 w-10 items-center justify-center
            rounded-full bg-white/10 text-white
            hover:bg-white/20"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}

            <img
              src={store.images[lightboxIndex].url}
              alt=""
              className="max-h-full max-w-full select-none rounded-lg
          object-contain transition-transform duration-200"
              style={{ transform: `scale(${zoom})`, cursor: zoom > 1 ? "zoom-out" : "zoom-in" }}
              onClick={() => setZoom((z) => (z > 1 ? 1 : 2))}
              onWheel={(e) => {
                e.preventDefault();
                setZoom((z) => Math.min(Math.max(z - e.deltaY * 0.001, 1), 3));
              }}
              draggable={false}
            />

            {store.images.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setLightboxIndex((i) => (i === null ? null : (i + 1) % store.images.length));
                  setZoom(1);
                }}
                className="absolute right-3 z-10 flex h-10 w-10 items-center justify-center
            rounded-full bg-white/10 text-white
            hover:bg-white/20"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>

          {/* Thumbnail strip */}
          {store.images.length > 1 && (
            <div
              className="flex shrink-0 gap-2 overflow-x-auto px-4 py-3"
              onClick={(e) => e.stopPropagation()}
            >
              {store.images.map((img, i) => (
                <button
                  type="button"
                  key={img.id}
                  onClick={() => {
                    setLightboxIndex(i);
                    setZoom(1);
                  }}
                  className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg
              transition-all ${
                lightboxIndex === i
                  ? "opacity-100 ring-2 ring-[#D4450A]"
                  : "opacity-40 hover:opacity-70"
              }`}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
