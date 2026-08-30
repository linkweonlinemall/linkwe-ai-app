"use client";

import Image from "next/image";
import Link from "next/link";
import { IconMapPin, IconSearchOff } from "@tabler/icons-react";

import { getRegionLabel } from "@/lib/regions/tt-regions";
import { isServiceCatalogItem } from "@/lib/search/resolve-catalog-item";
import type { UniversalSearchResponse } from "@/lib/search/types";
import { formatTTDPrice } from "@/lib/format/price";

const SCARLET = "#D4450A";
const BLUE = "#1A7FB5";

type Props = {
  query: string;
  results: UniversalSearchResponse | null;
  isLoading: boolean;
  error: string | null;
  detectedRegion: string | null;
  onNavigate?: () => void;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function ResultSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 px-3 py-2.5">
      <div className="h-10 w-10 shrink-0 rounded-lg bg-zinc-100" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3 w-3/4 rounded bg-zinc-100" />
        <div className="h-2.5 w-1/2 rounded bg-zinc-100" />
      </div>
      <div className="h-3 w-12 rounded bg-zinc-100" />
    </div>
  );
}

function Thumb({
  src,
  alt,
  fallbackBg,
  fallbackLetter,
}: {
  src: string | null | undefined;
  alt: string;
  fallbackBg: string;
  fallbackLetter: string;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 rounded-lg object-cover"
        sizes="40px"
      />
    );
  }
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-zinc-600"
      style={{ backgroundColor: fallbackBg }}
    >
      {fallbackLetter}
    </div>
  );
}

export default function SearchDropdown({
  query,
  results,
  isLoading,
  error,
  detectedRegion,
  onNavigate,
}: Props) {
  if (query.trim().length < 2) return null;

  const regionLabel = detectedRegion ? getRegionLabel(detectedRegion) : null;
  const total = results?.results.total ?? 0;

  return (
    <div
      className="w-full overflow-y-auto rounded-[12px] border-[0.5px] border-[rgba(28,28,26,0.12)] bg-white shadow-lg max-h-[min(60vh,480px)]"
      role="listbox"
      aria-label="Search suggestions"
    >
      {regionLabel ? (
        <div
          className="mx-3 mt-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white"
          style={{ backgroundColor: SCARLET }}
        >
          <IconMapPin className="size-3.5 shrink-0" stroke={2} aria-hidden />
          Filtering by location: {regionLabel}
        </div>
      ) : null}

      {isLoading ? (
        <div className="py-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <ResultSkeleton key={i} />
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="px-4 py-6 text-center text-xs text-red-600">{error}</p>
      ) : null}

      {!isLoading && !error && results ? (
        <>
          {results.results.services.length > 0 ? (
            <div className="pt-2">
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Services
              </p>
              {results.results.services.map((s) => (
                <Link
                  key={s.id}
                  href={`/service/${s.slug}`}
                  prefetch
                  onClick={onNavigate}
                  className="flex min-h-[44px] items-center gap-3 px-3 py-2 hover:bg-zinc-50"
                >
                  <Thumb
                    src={s.images[0]}
                    alt={s.title}
                    fallbackBg="#E6F1FB"
                    fallbackLetter="S"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-zinc-900">{s.title}</p>
                    <p className="truncate text-[11px] text-zinc-500">
                      {s.store.name} · {getRegionLabel(s.store.region)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[12px] font-semibold" style={{ color: BLUE }}>
                      {formatTTDPrice(s.price)}
                    </span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                      style={{ backgroundColor: "#E6F1FB", color: "#185FA5" }}
                    >
                      Service
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}

          {results.results.stores.length > 0 ? (
            <div className="pt-1">
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Stores
              </p>
              {results.results.stores.map((s) => (
                <Link
                  key={s.id}
                  href={`/store/${s.slug}`}
                  prefetch
                  onClick={onNavigate}
                  className="flex min-h-[44px] items-center gap-3 px-3 py-2 hover:bg-zinc-50"
                >
                  {s.logoUrl ? (
                    <Image
                      src={s.logoUrl}
                      alt={s.name}
                      width={40}
                      height={40}
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                      sizes="40px"
                    />
                  ) : (
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: SCARLET }}
                    >
                      {initials(s.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-zinc-900">{s.name}</p>
                    <p className="truncate text-[11px] text-zinc-500">
                      {s.category} · {getRegionLabel(s.region)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-800">
                    Store
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          {results.results.products.length > 0 ? (
            <div className="pt-1">
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Products
              </p>
              {results.results.products.map((p) => {
                const isService = isServiceCatalogItem(p);
                const href = isService ? `/service/${p.slug}` : `/products/${p.slug}`;
                return (
                  <Link
                    key={`product-${p.id}`}
                    href={href}
                    prefetch
                    onClick={onNavigate}
                    className="flex min-h-[44px] items-center gap-3 px-3 py-2 hover:bg-zinc-50"
                  >
                    <Thumb
                      src={p.images[0]}
                      alt={p.name}
                      fallbackBg={isService ? "#E6F1FB" : "#F7F5F2"}
                      fallbackLetter={isService ? "S" : "P"}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-zinc-900">{p.name}</p>
                      <p className="truncate text-[11px] text-zinc-500">
                        {p.store.name} · {getRegionLabel(p.store.region)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className="text-[12px] font-semibold"
                        style={{ color: isService ? BLUE : SCARLET }}
                      >
                        {formatTTDPrice(p.price)}
                      </span>
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                        style={
                          isService
                            ? { backgroundColor: "#E6F1FB", color: "#185FA5" }
                            : { backgroundColor: "#EAF3DE", color: "#3B6D11" }
                        }
                      >
                        {isService ? "Service" : "Product"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : null}

          {total === 0 ? (
            <div className="flex flex-col items-center px-4 py-8 text-center">
              <IconSearchOff className="mb-2 size-8 text-zinc-300" stroke={1.5} aria-hidden />
              <p className="text-xs text-zinc-500">No results for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            <Link
              href={`/search?q=${encodeURIComponent(query)}`}
              prefetch
              onClick={onNavigate}
              className="block border-t border-zinc-100 px-4 py-3 text-center text-[12px] font-semibold hover:bg-zinc-50"
              style={{ color: SCARLET }}
            >
              See all results for &ldquo;{query}&rdquo; ({total})
            </Link>
          )}
        </>
      ) : null}
    </div>
  );
}
