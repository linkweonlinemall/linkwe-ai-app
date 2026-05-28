"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconCamera,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconScissors,
  IconShoppingBag,
  IconTag,
  IconTools,
  IconX,
} from "@tabler/icons-react";

import {
  formatDayHours,
  getTodayKey,
  WEEK_DAYS,
  type DaySchedule,
  type WeekSchedule,
} from "@/lib/store/opening-hours-utils";

import StoreCompactCartButton from "./StoreCompactCartButton";
import StoreFollowCard from "./StoreFollowCard";
import type { StorefrontTabsStore } from "./StorefrontTabs";

const SCARLET = "#D4450A";
const BLUE = "#1A7FB5";
const BLUE_TEXT = "#185FA5";

type ProductPreview = {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  category: string | null;
  isFeatured?: boolean;
  hasVariants?: boolean;
};

type ServicePreview = {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  serviceDuration: number | null;
  serviceType: string | null;
};

type Props = {
  store: StorefrontTabsStore;
  storeId: string;
  slug: string;
  products: ProductPreview[];
  services: ServicePreview[];
  openingHours: WeekSchedule | null;
  initialFollowing: boolean;
  followerCount: number;
};

const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  BOOKABLE: "Bookable",
  QUOTE: "Quote",
  ON_DEMAND: "On Demand",
  SUBSCRIPTION: "Subscription",
  VIRTUAL: "Virtual",
};

const GALLERY_GRID: Record<number, string> = {
  0: "col-start-1 row-start-1 row-span-2",
  1: "col-start-2 row-start-1",
  2: "col-start-3 row-start-1",
  3: "col-start-2 row-start-2",
  4: "col-start-3 row-start-2",
};

function formatDuration(minutes: number | null): string {
  if (!minutes) return "";
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes} min`;
}

function formatCategory(category: string | null): string {
  if (!category) return "";
  return category.replace(/_/g, " ");
}

function formatHoursCell(schedule: DaySchedule | undefined): {
  text: string;
  isClosed: boolean;
} {
  if (!schedule || schedule.closed) {
    return { text: "Closed", isClosed: true };
  }
  return { text: formatDayHours(schedule), isClosed: false };
}

function SectionBar({
  icon,
  label,
  viewAllHref,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  viewAllHref: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between bg-[var(--color-background-secondary)] px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-[var(--text-muted)]">{icon}</span>
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
          {label}
        </span>
      </div>
      <Link href={viewAllHref} className="text-[11px] font-medium hover:underline" style={{ color: BLUE }}>
        View all {count} →
      </Link>
    </div>
  );
}

function ProductRow({ product }: { product: ProductPreview }) {
  const router = useRouter();

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/products/${product.slug}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/products/${product.slug}`);
      }}
      className="flex cursor-pointer items-center gap-3 border-b border-[0.5px] border-[var(--color-border-tertiary)] px-4 py-[11px] transition-colors last:border-b-0 hover:bg-[var(--color-background-secondary)]"
    >
      <div className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[9px] bg-[var(--color-background-secondary)]">
        {product.images[0] ? (
          <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="52px" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
            <IconShoppingBag className="size-5" stroke={1.5} aria-hidden />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-[13px] font-medium text-[var(--text-primary)]">{product.name}</p>
        {product.category ? (
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{formatCategory(product.category)}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <p className="text-[13px] font-medium" style={{ color: SCARLET }}>
          TTD {product.price.toFixed(2)}
        </p>
        <StoreCompactCartButton
          productId={product.id}
          productName={product.name}
          hasVariants={product.hasVariants}
          slug={product.slug}
        />
      </div>
    </div>
  );
}

function ServiceRow({ service }: { service: ServicePreview }) {
  const router = useRouter();
  const typeLabel = service.serviceType
    ? (SERVICE_TYPE_LABELS[service.serviceType] ?? service.serviceType)
    : "Service";
  const metaParts = [
    service.serviceDuration ? formatDuration(service.serviceDuration) : null,
    typeLabel,
  ].filter(Boolean);

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/service/${service.slug}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/service/${service.slug}`);
      }}
      className="flex cursor-pointer items-center gap-3 border-b border-[0.5px] border-[var(--color-border-tertiary)] px-4 py-[11px] transition-colors last:border-b-0 hover:bg-[var(--color-background-secondary)]"
    >
      <div className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[9px] bg-[#E6F1FB]">
        {service.images[0] ? (
          <Image src={service.images[0]} alt={service.name} fill className="object-cover" sizes="52px" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[#1A7FB5]">
            <IconScissors className="size-5" stroke={1.75} aria-hidden />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-[13px] font-medium text-[var(--text-primary)]">{service.name}</p>
        {metaParts.length > 0 ? (
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{metaParts.join(" · ")}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <p className="text-[13px] font-medium" style={{ color: BLUE }}>
          TTD {service.price.toFixed(2)}
        </p>
        <Link
          href={`/service/${service.slug}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex h-7 items-center rounded-lg px-2.5 text-[11px] font-semibold"
          style={{ backgroundColor: "#E6F1FB", color: BLUE_TEXT }}
        >
          Book
        </Link>
      </div>
    </div>
  );
}

export default function StoreAboutTab({
  store,
  storeId,
  slug,
  products,
  services,
  openingHours,
  initialFollowing,
  followerCount,
}: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const todayKey = getTodayKey();

  const galleryImages = store.images ?? [];
  const masonryImages = galleryImages.slice(0, 5);
  const galleryExtra = galleryImages.length > 5 ? galleryImages.length - 4 : 0;

  const previewProducts = useMemo(() => {
    const sorted = [...products].sort(
      (a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0),
    );
    return sorted.slice(0, 4);
  }, [products]);

  const previewServices = useMemo(() => services.slice(0, 4), [services]);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const goPrev = useCallback(() => {
    setLightboxIndex((i) =>
      i === null ? null : (i - 1 + galleryImages.length) % galleryImages.length,
    );
  }, [galleryImages.length]);

  const goNext = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i + 1) % galleryImages.length));
  }, [galleryImages.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, closeLightbox, goPrev, goNext]);

  return (
    <>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_264px] md:gap-5">
        <div>
          {/* Gallery card */}
          <div className="mb-3.5 overflow-hidden rounded-xl border border-[0.5px] border-[var(--color-border-tertiary)] bg-white">
            <div className="flex items-center justify-between px-4 pb-2.5 pt-3">
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Gallery
              </span>
              {galleryImages.length > 0 ? (
                <button
                  type="button"
                  className="text-[11px] font-medium hover:underline"
                  style={{ color: BLUE }}
                  onClick={() => setLightboxIndex(0)}
                >
                  View all {galleryImages.length} →
                </button>
              ) : null}
            </div>

            {galleryImages.length === 0 ? (
              <div className="mx-3 mb-3 flex h-[120px] flex-col items-center justify-center rounded border border-dashed border-[var(--color-border-tertiary)]">
                <IconCamera className="mb-2 size-7 text-[var(--text-muted)]" stroke={1.25} aria-hidden />
                <p className="text-[13px] text-[var(--text-muted)]">No photos yet</p>
              </div>
            ) : (
              <div
                className="grid h-[200px] grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-[3px] px-[3px] pb-[3px]"
              >
                {masonryImages.map((img, idx) => {
                  const isMoreCell = galleryImages.length > 5 && idx === 4;
                  return (
                    <button
                      key={img.id}
                      type="button"
                      className={`relative overflow-hidden rounded transition-opacity hover:opacity-[0.88] ${GALLERY_GRID[idx] ?? ""}`}
                      onClick={() => setLightboxIndex(idx)}
                    >
                      <Image src={img.url} alt="" fill className="object-cover" sizes="200px" />
                      {isMoreCell ? (
                        <span className="absolute inset-0 flex flex-col items-center justify-center bg-[#1C1C1A]">
                          <span className="text-lg font-medium text-white">+{galleryExtra}</span>
                          <span className="text-[10px] text-white/60">more</span>
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* From this store */}
          <div className="mb-3.5 overflow-hidden rounded-xl border border-[0.5px] border-[var(--color-border-tertiary)] bg-white">
            {products.length === 0 && services.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-[var(--text-muted)]">No listings yet</p>
            ) : (
              <>
                {products.length > 0 ? (
                  <>
                    <SectionBar
                      icon={<IconShoppingBag className="size-[13px]" stroke={1.75} aria-hidden />}
                      label="Products"
                      viewAllHref={`/store/${slug}?tab=store`}
                      count={products.length}
                    />
                    {previewProducts.map((p) => (
                      <ProductRow key={p.id} product={p} />
                    ))}
                  </>
                ) : null}

                {products.length > 0 && services.length > 0 ? (
                  <div className="h-px bg-[var(--color-border-tertiary)]" />
                ) : null}

                {services.length > 0 ? (
                  <>
                    <SectionBar
                      icon={<IconTools className="size-[13px]" stroke={1.75} aria-hidden />}
                      label="Services"
                      viewAllHref={`/store/${slug}?tab=services`}
                      count={services.length}
                    />
                    {previewServices.map((s) => (
                      <ServiceRow key={s.id} service={s} />
                    ))}
                  </>
                ) : null}
              </>
            )}
          </div>

          {/* About */}
          <div className="rounded-xl border border-[0.5px] border-[var(--color-border-tertiary)] bg-white p-4">
            <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
              About this store
            </p>
            {store.description?.trim() ? (
              <p
                className="whitespace-pre-wrap text-[13px] leading-[1.7]"
                style={{ color: "var(--text-secondary)" }}
              >
                {store.description}
              </p>
            ) : (
              <p className="text-[13px] italic text-[var(--text-muted)]">No description added yet</p>
            )}
          </div>
        </div>

        <div>
          <StoreFollowCard
            storeId={storeId}
            storeName={store.name}
            initialFollowing={initialFollowing}
            followerCount={followerCount}
          />

          <div className="mb-3.5 overflow-hidden rounded-xl border border-[0.5px] border-[var(--color-border-tertiary)] bg-white">
            <div className="flex items-center gap-2 border-b border-[0.5px] border-[var(--color-border-tertiary)] px-4 py-3">
              <IconClock className="size-[15px] text-[var(--text-muted)]" stroke={1.75} aria-hidden />
              <h2 className="text-[13px] font-medium text-[var(--text-primary)]">Opening hours</h2>
            </div>
            {!openingHours ? (
              <p className="px-4 py-4 text-[13px] text-[var(--text-muted)]">Hours not set</p>
            ) : (
              <ul>
                {WEEK_DAYS.map((day, i) => {
                  const schedule = openingHours[day];
                  const isToday = day === todayKey;
                  const { text, isClosed } = formatHoursCell(schedule);
                  const isLast = i === WEEK_DAYS.length - 1;
                  return (
                    <li
                      key={day}
                      className={`flex items-center justify-between px-4 py-[7px] ${
                        isToday ? "bg-[#EAF3DE]" : ""
                      } ${isLast ? "" : "border-b border-[0.5px] border-[var(--color-border-tertiary)]"}`}
                    >
                      <span
                        className={`text-xs ${
                          isToday
                            ? "font-medium text-[#3B6D11]"
                            : "text-[var(--text-secondary)]"
                        }`}
                      >
                        {DAY_LABELS[day]}
                      </span>
                      <span
                        className={`text-xs ${
                          isToday
                            ? "font-medium text-[#3B6D11]"
                            : isClosed
                              ? "text-[var(--text-muted)]"
                              : "font-medium text-[var(--text-primary)]"
                        }`}
                      >
                        {text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {store.tags.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-[0.5px] border-[var(--color-border-tertiary)] bg-white">
              <div className="flex items-center gap-2 border-b border-[0.5px] border-[var(--color-border-tertiary)] px-4 py-3">
                <IconTag className="size-[15px] text-[var(--text-muted)]" stroke={1.75} aria-hidden />
                <h2 className="text-[13px] font-medium text-[var(--text-primary)]">Tags</h2>
              </div>
              <div className="flex flex-wrap gap-1.5 px-4 py-3">
                {store.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-[20px] bg-[var(--color-background-secondary)] px-2.5 py-1 text-[11px] text-[var(--text-muted)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {lightboxIndex !== null && galleryImages[lightboxIndex] ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
          role="dialog"
          aria-modal
          onClick={closeLightbox}
        >
          <button
            type="button"
            className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full bg-white text-[var(--text-primary)] shadow-lg"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
          >
            <IconX className="size-5" stroke={1.75} />
          </button>

          {galleryImages.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-4 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-white md:left-6"
                style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                aria-label="Previous"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
              >
                <IconChevronLeft className="size-5" stroke={2} />
              </button>
              <button
                type="button"
                className="absolute right-4 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-white md:right-6"
                style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                aria-label="Next"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
              >
                <IconChevronRight className="size-5" stroke={2} />
              </button>
            </>
          ) : null}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={galleryImages[lightboxIndex]!.url}
            alt=""
            className="max-h-[85vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
