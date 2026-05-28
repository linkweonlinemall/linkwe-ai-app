"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconSearch, IconX } from "@tabler/icons-react";

import { getPopularSearches } from "@/app/actions/search";
import SearchDropdown from "@/components/search/SearchDropdown";
import { useSearch } from "@/lib/hooks/use-search";

const SCARLET = "#D4450A";

type Props = {
  variant: "desktop" | "mobile-overlay";
  inputId?: string;
  onCloseOverlay?: () => void;
};

export default function NavSearchInput({
  variant,
  inputId = "public-nav-search",
  onCloseOverlay,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [popular, setPopular] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { results, isLoading, error, detectedRegion } = useSearch(query, {
    preview: true,
    enabled: focused && query.trim().length >= 2,
  });

  useEffect(() => {
    void getPopularSearches().then(setPopular);
  }, []);

  const closeDropdown = useCallback(() => {
    setFocused(false);
    onCloseOverlay?.();
  }, [onCloseOverlay]);

  useEffect(() => {
    if (!focused) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [focused]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setFocused(false);
        onCloseOverlay?.();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCloseOverlay]);

  function goToSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    closeDropdown();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    goToSearch(query);
  }

  const showPopular = mounted && focused && query.trim().length === 0 && popular.length > 0;
  const showDropdown = mounted && focused && query.trim().length >= 2;

  const inputClass =
    variant === "desktop"
      ? "h-full w-full border-0 bg-transparent pl-[30px] pr-2 text-sm text-white caret-white outline-none placeholder:text-[13px] placeholder:text-white/40"
      : "h-11 w-full rounded-[10px] border-[0.5px] border-zinc-200 bg-white pl-10 pr-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400";

  const wrapperClass =
    variant === "desktop"
      ? "relative flex h-[38px] items-center rounded-[10px] border-[0.5px] border-white/[0.15] bg-white/[0.10] px-4"
      : "relative";

  return (
    <div ref={rootRef} className={variant === "desktop" ? "relative w-full" : "w-full"}>
      <form className="w-full" onSubmit={handleSubmit}>
        <div className={wrapperClass}>
          <IconSearch
            className={
              variant === "desktop"
                ? "pointer-events-none absolute left-3 top-1/2 size-[17px] -translate-y-1/2 text-white/50"
                : "pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-zinc-400"
            }
            stroke={1.75}
            aria-hidden
          />
          <label htmlFor={inputId} className="sr-only">
            Search
          </label>
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Search products, stores, services..."
            className={inputClass}
            autoComplete="off"
            autoFocus={variant === "mobile-overlay"}
            suppressHydrationWarning
          />
        </div>
      </form>

      {showPopular ? (
        <div
          className={`absolute left-0 right-0 top-full z-[100] mt-1 rounded-[12px] border-[0.5px] border-[rgba(28,28,26,0.12)] bg-white p-3 shadow-lg ${
            variant === "mobile-overlay" ? "" : ""
          }`}
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Popular searches
          </p>
          <div className="flex flex-wrap gap-1.5">
            {popular.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => goToSearch(term)}
                className="min-h-[32px] rounded-full border border-zinc-200 px-3 py-1 text-[11px] font-medium text-zinc-700 hover:border-[#D4450A] hover:text-[#D4450A]"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showDropdown ? (
        <SearchDropdown
          query={query}
          results={results}
          isLoading={isLoading}
          error={error}
          detectedRegion={detectedRegion}
          onNavigate={closeDropdown}
        />
      ) : null}
    </div>
  );
}

export function MobileSearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-[rgba(28,28,26,0.92)] px-4 pt-4 md:hidden">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Search LinkWe</p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white"
          aria-label="Close search"
        >
          <IconX className="size-5" stroke={2} aria-hidden />
        </button>
      </div>
      <NavSearchInput variant="mobile-overlay" inputId="public-nav-mobile-search" onCloseOverlay={onClose} />
    </div>
  );
}
