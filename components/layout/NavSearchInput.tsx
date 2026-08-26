"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowLeft, IconSearch, IconX } from "@tabler/icons-react";

import { getPopularSearches } from "@/app/actions/search";
import SearchDropdown from "@/components/search/SearchDropdown";
import { useSearch } from "@/lib/hooks/use-search";

type Props = {
  variant: "desktop" | "mobile-overlay";
  inputId?: string;
  onCloseOverlay?: () => void;
  light?: boolean;
};

export default function NavSearchInput({
  variant,
  inputId = "public-nav-search",
  onCloseOverlay,
  light = false,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(variant === "mobile-overlay");
  const [popular, setPopular] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (variant !== "mobile-overlay") return;
    setFocused(true);
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [variant]);

  const searchEnabled = focused && query.trim().length >= 2;

  const { results, isLoading, error, detectedRegion } = useSearch(query, {
    preview: true,
    enabled: searchEnabled,
  });

  useEffect(() => {
    void getPopularSearches().then(setPopular);
  }, []);

  const closeDropdown = useCallback(() => {
    setFocused(false);
    onCloseOverlay?.();
  }, [onCloseOverlay]);

  useEffect(() => {
    if (!focused || variant === "mobile-overlay") return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [focused, variant]);

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

  function handleQueryChange(value: string) {
    setQuery(value);
    setFocused(true);
  }

  const showPopular = mounted && focused && query.trim().length === 0 && popular.length > 0;
  const showDropdown = mounted && focused && query.trim().length >= 2;

  const popularPanel = showPopular ? (
    <div className="rounded-[12px] border-[0.5px] border-[rgba(28,28,26,0.12)] bg-white p-3 shadow-lg">
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
  ) : null;

  const resultsPanel = showDropdown ? (
    <SearchDropdown
      query={query}
      results={results}
      isLoading={isLoading}
      error={error}
      detectedRegion={detectedRegion}
      onNavigate={closeDropdown}
    />
  ) : null;

  const inputClass =
    variant === "desktop"
      ? `h-full w-full border-0 bg-transparent pl-[30px] pr-2 text-sm outline-none placeholder:text-[13px] ${light ? "text-zinc-900 caret-[#D4450A] placeholder:text-zinc-400" : "text-white caret-white placeholder:text-white/40"}`
      : "h-10 w-full border-0 bg-transparent text-base text-white caret-white outline-none placeholder:text-white/50";

  const wrapperClass =
    variant === "desktop"
      ? `relative flex h-[38px] items-center rounded-[10px] border-[0.5px] px-4 transition-colors ${light ? "border-zinc-200 bg-zinc-100" : "border-white/[0.15] bg-white/[0.10]"}`
      : "relative min-w-0 flex-1";

  if (variant === "mobile-overlay") {
    return (
      <div ref={rootRef} className="flex min-h-0 flex-1 flex-col">
        <form className="w-full shrink-0" onSubmit={handleSubmit}>
          <div className={wrapperClass}>
            <label htmlFor={inputId} className="sr-only">
              Search
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="search"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="Search products, stores, services..."
              className={inputClass}
              autoComplete="off"
              autoFocus
              suppressHydrationWarning
            />
          </div>
        </form>
        {(popularPanel || resultsPanel) ? (
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto pb-2">
            {resultsPanel ?? popularPanel}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative z-[110] w-full">
      <form className="w-full" onSubmit={handleSubmit}>
        <div className={wrapperClass}>
          <IconSearch
            className={`pointer-events-none absolute left-3 top-1/2 size-[17px] -translate-y-1/2 ${light ? "text-zinc-500" : "text-white/50"}`}
            stroke={1.75}
            aria-hidden
          />
          <label htmlFor={inputId} className="sr-only">
            Search
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Search products, stores, services..."
            className={inputClass}
            autoComplete="off"
            suppressHydrationWarning
          />
        </div>
      </form>

      {popularPanel ? (
        <div className="absolute left-0 right-0 top-full z-[110] mt-2 max-h-[min(60vh,400px)] overflow-y-auto">
          {popularPanel}
        </div>
      ) : null}

      {resultsPanel ? (
        <div className="absolute left-0 right-0 top-full z-[110] mt-2 max-h-[min(60vh,400px)] overflow-y-auto">
          {resultsPanel}
        </div>
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
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex flex-col bg-[rgba(28,28,26,0.98)] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/10"
          aria-label="Close search"
        >
          <IconArrowLeft className="size-5" stroke={2} aria-hidden />
        </button>
        <p className="min-w-0 flex-1 text-sm font-semibold text-white">Search</p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/10"
          aria-label="Close search"
        >
          <IconX className="size-5" stroke={2} aria-hidden />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-[max(12px,env(safe-area-inset-bottom,0px))] pt-3">
        <NavSearchInput
          variant="mobile-overlay"
          inputId="public-nav-mobile-search"
          onCloseOverlay={onClose}
        />
      </div>
    </div>
  );
}
