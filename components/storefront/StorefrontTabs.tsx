"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { StorefrontMapAndProducts, type StorefrontProductRow } from "@/components/storefront/StorefrontMapAndProducts";

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

type TabId = "about" | "store" | "bookings" | "reviews";

type Props = {
  store: StorefrontTabsStore;
  products: StorefrontProductRow[];
  openingHours: WeekSchedule | null;
  socialLinks: Record<string, string>;
  hasSocialLinks: boolean;
};

export default function StorefrontTabs({
  store,
  products,
  openingHours,
  socialLinks,
  hasSocialLinks,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("about");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showShareSheet, setShowShareSheet] = useState(false);

  useEffect(() => {
    if (!showShareSheet) return;
    const handler = () => {
      setShowShareSheet(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showShareSheet]);

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
    return products.filter((p) => {
      const nameOk = q === "" || p.name.toLowerCase().includes(q);
      const catOk = category === "All" || (p.category?.trim() ?? "") === category;
      return nameOk && catOk;
    });
  }, [products, search, category]);

  return (
    <>
      <div className="relative flex flex-col gap-4 border-b border-zinc-200 bg-white pb-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6 flex-1 min-w-0">
          <div className="-mt-12 h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-zinc-200 shadow-md dark:border-zinc-900">
            {store.logoUrl ? (
              <img alt="" className="h-full w-full object-cover" src={store.logoUrl} />
            ) : (
              <div className="h-full w-full bg-zinc-300 dark:bg-zinc-700" />
            )}
          </div>

          <div className="flex-1 pb-2 pt-2">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{store.name}</h1>
            {store.tagline ? (
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{store.tagline}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {store.categoryId ? (
                <span className="rounded-full bg-zinc-100 px-3 py-0.5 text-xs font-medium capitalize text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  {store.categoryId.replace(/_/g, " ")}
                </span>
              ) : null}
              {store.region ? (
                <span className="rounded-full bg-zinc-100 px-3 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  {store.region.replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pb-2 shrink-0">
          <Link
            href="/dashboard/vendor/store/edit"
            style={{ backgroundColor: "#D4450A" }}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-white shadow-sm hover:opacity-90 transition-all"
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

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowShareSheet(!showShareSheet)}
              className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-zinc-200 bg-white shadow-sm hover:shadow-md hover:border-zinc-300 transition-all text-zinc-600"
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
            className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-zinc-200 bg-white shadow-sm hover:shadow-md hover:border-zinc-300 transition-all text-zinc-600"
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
            className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-zinc-200 bg-white shadow-sm hover:shadow-md hover:border-zinc-300 transition-all text-zinc-600"
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
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all"
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

      <div className="flex gap-1 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {["About", "Store", "Bookings", "Reviews"].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab.toLowerCase() as TabId)}
            className={`px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.toLowerCase()
                ? "border-b-2 border-[#D4450A] text-[#D4450A]"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "about" ? (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            {store.images && store.images.length > 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">Gallery</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {store.images.map((img) => (
                    <div key={img.id} className="overflow-hidden rounded-xl">
                      <img alt="" className="h-36 w-full object-cover" src={img.url} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {store.description ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">About</p>
                <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400">{store.description}</p>
              </div>
            ) : null}

            {store.policies ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Store policies</p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-600 dark:text-zinc-400">
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
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">Opening hours</p>
                <ul className="space-y-2">
                  {DAYS.map((day) => {
                    const d = openingHours[day];
                    return (
                      <li key={day} className="flex items-start justify-between text-sm">
                        <span className="w-24 font-medium capitalize text-zinc-700 dark:text-zinc-300">{day}</span>
                        <span className="text-right text-zinc-500 dark:text-zinc-400">
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
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {store.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {store.amenities && store.amenities.length > 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Amenities</p>
                <div className="flex flex-col gap-2">
                  {store.amenities.map((a) => (
                    <span key={a} className="text-sm text-zinc-600 dark:text-zinc-400">
                      ✓ {a}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Owner</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{store.owner.fullName}</p>
              <p className="mt-1 text-xs text-zinc-500">Message this vendor directly through LinkWe.</p>
            </div>

            {hasSocialLinks ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">Follow us</p>
                <div className="flex flex-wrap gap-3">
                  {socialLinks.instagram ? (
                    <a
                      href={`https://instagram.com/${socialLinks.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ backgroundColor: "#E1306C" }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm hover:shadow-md hover:opacity-90 transition-all text-white"
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
                      className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm hover:shadow-md hover:opacity-90 transition-all text-white"
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
                      className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm hover:shadow-md hover:opacity-90 transition-all text-white"
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
                      className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm hover:shadow-md hover:opacity-90 transition-all text-white"
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
                      className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm hover:shadow-md hover:opacity-90 transition-all text-white"
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
                      className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm hover:shadow-md hover:opacity-90 transition-all text-white"
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
                      className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm hover:shadow-md hover:opacity-90 transition-all text-white"
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
                      className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm hover:shadow-md hover:opacity-90 transition-all text-white"
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
          <aside className="lg:w-56 shrink-0">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">Filter</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      category === c
                        ? "bg-[#D4450A] text-white"
                        : "border border-[#D4450A] bg-white text-[#D4450A]"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <label className="mt-4 flex flex-col gap-1">
                <span className="sr-only">Search products</span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products…"
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-[#D4450A]/30 placeholder:text-zinc-400 focus:border-[#D4450A] focus:ring-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {products.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm text-center dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm font-medium text-zinc-500">Products coming soon</p>
                <p className="mt-1 text-xs text-zinc-400">This store has not listed any products yet.</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">No products found</p>
            ) : (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map((product) => {
                  const img = product.images[0];
                  return (
                    <li key={product.id}>
                      <Link
                        href={`/products/${product.slug}`}
                        className="group flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 transition hover:border-zinc-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                      >
                        <div className="aspect-square w-full overflow-hidden bg-zinc-200 dark:bg-zinc-700">
                          {img ? (
                            <img
                              alt=""
                              className="h-full w-full object-cover transition group-hover:opacity-95"
                              src={img}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col p-3">
                          <p className="line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {product.name}
                          </p>
                          <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            TTD {product.price.toFixed(2)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "bookings" ? (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Bookings coming soon</p>
        </div>
      ) : null}

      {activeTab === "reviews" ? (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Reviews coming soon</p>
        </div>
      ) : null}
    </>
  );
}
