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
};

export default function NavSearchInput({
  variant,
  inputId = "public-nav-search",
  onCloseOverlay,
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

  const showPopular = mounted && focused && query.trim().length === 0 && popular.length > 0;
  const showDropdown = mounted && focused && query.trim().length >= 2;

  const inputClass =
    variant === "desktop"
      ? "h-full w-full border-0 bg-transparent pl-[30px] pr-2 text-sm text-white caret-white outline-none placeholder:text-[13px] placeholder:text-white/40"
      : "h-10 w-full border-0 bg-transparent text-base text-white caret-white outline-none placeholder:text-white/50";

  const wrapperClass =
    variant === "desktop"
      ? "relative flex h-[38px] items-center rounded-[10px] border-[0.5px] border-white/[0.15] bg-white/[0.10] px-4"
      : "relative min-w-0 flex-1";

  return (
    <div ref={rootRef} className={variant === "desktop" ? "relative w-full" : "w-full min-w-0 flex-1"}>
      <form className="w-full" onSubmit={handleSubmit}>
        <div className={wrapperClass}>
          {variant === "desktop" ? (
            <IconSearch
              className="pointer-events-none absolute left-3 top-1/2 size-[17px] -translate-y-1/2 text-white/50"
              stroke={1.75}
              aria-hidden
            />
          ) : null}
          <label htmlFor={inputId} className="sr-only">
            Search
          </label>
          <input
            ref={inputRef}
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
        <div className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-[min(60vh,400px)] overflow-y-auto rounded-[12px] border-[0.5px] border-[rgba(28,28,26,0.12)] bg-white p-3 shadow-lg">
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
        <div className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-[min(60vh,400px)] overflow-y-auto rounded-[12px] border-[0.5px] border-[rgba(28,28,26,0.12)] bg-white shadow-lg">
          <SearchDropdown
            query={query}
            results={results}
            isLoading={isLoading}
            error={error}
            detectedRegion={detectedRegion}
            onNavigate={closeDropdown}
          />
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
      className="fixed inset-x-0 top-0 z-[150] bg-[rgba(28,28,26,0.98)] px-4 py-3 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onClose}
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/10"
          aria-label="Close search"
        >
          <IconArrowLeft className="size-5" stroke={2} aria-hidden />
        </button>
        <div className="relative min-w-0 flex-1">
          <NavSearchInput
            variant="mobile-overlay"
            inputId="public-nav-mobile-search"
            onCloseOverlay={onClose}
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/10"
          aria-label="Close search"
        >
          <IconX className="size-5" stroke={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}
