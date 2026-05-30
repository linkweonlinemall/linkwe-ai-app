"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { X, SlidersHorizontal, ChevronDown } from "lucide-react";
import InlineSpinner from "@/components/ui/InlineSpinner";

export const EVENT_CATEGORY_GROUPS = [
  {
    group: "Fetes & Parties",
    options: [
      { label: "All-inclusive fete", value: "all_inclusive_fete" },
      { label: "Cooler fete", value: "cooler_fete" },
      { label: "Breakfast fete", value: "breakfast_fete" },
      { label: "J'Ouvert", value: "jouvert" },
      { label: "Beach party", value: "beach_party" },
      { label: "Pool party", value: "pool_party" },
      { label: "Birthday party", value: "birthday_party" },
      { label: "Private event", value: "private_event" },
    ],
  },
  {
    group: "Concerts & Music",
    options: [
      { label: "Soca/Carnival", value: "soca_carnival" },
      { label: "Reggae/Dancehall", value: "reggae_dancehall" },
      { label: "Jazz", value: "jazz" },
      { label: "Gospel", value: "gospel" },
      { label: "Steelpan", value: "steelpan" },
      { label: "Live band night", value: "live_band_night" },
      { label: "Open mic", value: "open_mic" },
    ],
  },
  {
    group: "Food & Drink",
    options: [
      { label: "Food fair", value: "food_fair" },
      { label: "Rum tasting", value: "rum_tasting" },
      { label: "Food festival", value: "food_festival" },
      { label: "Pop-up dining", value: "popup_dining" },
      { label: "Cooking class", value: "cooking_class" },
      { label: "Wine tasting", value: "wine_tasting" },
    ],
  },
  {
    group: "Cultural & Community",
    options: [
      { label: "Mas band launch", value: "mas_band_launch" },
      { label: "Cultural festival", value: "cultural_festival" },
      { label: "Art exhibition", value: "art_exhibition" },
      { label: "Fashion show", value: "fashion_show" },
      { label: "Heritage event", value: "heritage_event" },
      { label: "Religious/church", value: "religious_church" },
    ],
  },
  {
    group: "Sports & Fitness",
    options: [
      { label: "Sports tournament", value: "sports_tournament" },
      { label: "Marathon", value: "marathon" },
      { label: "Fitness event", value: "fitness_event" },
      { label: "Water sports", value: "water_sports" },
      { label: "Cricket/football", value: "cricket_football" },
    ],
  },
  {
    group: "Business & Professional",
    options: [
      { label: "Networking event", value: "networking_event" },
      { label: "Conference", value: "conference" },
      { label: "Workshop/training", value: "workshop_training" },
      { label: "Awards ceremony", value: "awards_ceremony" },
      { label: "Product launch", value: "product_launch" },
    ],
  },
  {
    group: "Kids & Family",
    options: [
      { label: "Children's party", value: "childrens_party" },
      { label: "Family fun day", value: "family_fun_day" },
      { label: "School event", value: "school_event" },
      { label: "Story time", value: "story_time" },
    ],
  },
  {
    group: "Other",
    options: [
      { label: "Fundraiser/charity", value: "fundraiser_charity" },
      { label: "Comedy show", value: "comedy_show" },
      { label: "Theatre/performance", value: "theatre_performance" },
      { label: "Market/fair", value: "market_fair" },
    ],
  },
];

const TT_REGIONS = [
  { label: "Port of Spain", value: "port_of_spain" },
  { label: "San Fernando", value: "san_fernando" },
  { label: "Chaguanas", value: "chaguanas" },
  { label: "Arima", value: "arima" },
  { label: "Point Fortin", value: "point_fortin" },
  { label: "Sangre Grande", value: "sangre_grande" },
  { label: "Tobago", value: "tobago" },
  { label: "Diego Martin", value: "diego_martin" },
  { label: "Couva-Tabaquite-Talparo", value: "couva_tabaquite_talparo" },
  { label: "Penal-Debe", value: "penal_debe" },
  { label: "Princes Town", value: "princes_town" },
  { label: "Rio Claro-Mayaro", value: "rio_claro_mayaro" },
  { label: "Siparia", value: "siparia" },
  { label: "Tunapuna-Piarco", value: "tunapuna_piarco" },
];

const DATE_FILTERS = [
  { label: "All dates", value: "" },
  { label: "This week", value: "this_week" },
  { label: "This weekend", value: "this_weekend" },
  { label: "This month", value: "this_month" },
];

/** Glass pill select — appearance-none + custom ChevronDown arrow */
const glassPillSelect =
  "appearance-none cursor-pointer rounded-full border border-white/20 bg-white/10 px-4 py-2 pr-8 text-sm font-medium text-white backdrop-blur-sm focus:border-[#D4450A] focus:outline-none focus:ring-1 focus:ring-[#D4450A]";

const drawerSelect =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-800 focus:border-[#D4450A] focus:outline-none";

/** Wrapper that adds a ChevronDown arrow over a glass select */
function GlassSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={glassPillSelect}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 size-3.5 text-white/60"
        aria-hidden
      />
    </div>
  );
}

export function EventFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const category = params.get("category") ?? "";
  const region = params.get("region") ?? "";
  const dateFilter = params.get("date") ?? "";
  const sort = params.get("sort") ?? "soonest";
  const q = params.get("q") ?? "";

  // Local search state — debounced to URL
  const [inputValue, setInputValue] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when URL q changes externally (e.g. browser back)
  useEffect(() => {
    setInputValue(params.get("q") ?? "");
  }, [params]);

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      startTransition(() => {
        router.push(`/events?${next.toString()}`, { scroll: false });
      });
    },
    [params, router],
  );

  function handleSearchChange(value: string) {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      console.log("[EventFilters] debounced search →", JSON.stringify(value.trim()));
      setParam("q", value.trim());
    }, 300);
  }

  function clearSearch() {
    setInputValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setParam("q", "");
  }

  // Count active non-default filters for the badge
  const activeCount = [
    category,
    region,
    dateFilter,
    sort !== "soonest" ? sort : "",
    inputValue.trim(),
  ].filter(Boolean).length;

  // Shared filter controls (used in both desktop row and mobile drawer)
  const filterControls = (variant: "glass" | "drawer") => {
    const pillBase =
      variant === "glass"
        ? "rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-150"
        : "rounded-lg border px-3.5 py-2 text-sm font-medium transition-all";
    const pillActive = "border-[#D4450A] bg-[#D4450A] text-white";
    const pillInactive =
      variant === "glass"
        ? "border-white/[0.18] bg-transparent text-white/60 hover:border-white/40 hover:text-white"
        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300";

    // Option elements shared between both variants
    const sortOptions = (
      <>
        <option value="soonest" className="bg-[#1C1C1A] text-white">Soonest first</option>
        <option value="latest" className="bg-[#1C1C1A] text-white">Latest first</option>
        <option value="price_asc" className="bg-[#1C1C1A] text-white">Price: low to high</option>
      </>
    );
    const categoryOptions = (
      <>
        <option value="" className="bg-[#1C1C1A] text-white">All categories</option>
        {EVENT_CATEGORY_GROUPS.map((g) => (
          <optgroup key={g.group} label={g.group} className="bg-[#1C1C1A] text-white">
            {g.options.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#1C1C1A] text-white">{o.label}</option>
            ))}
          </optgroup>
        ))}
      </>
    );
    const regionOptions = (
      <>
        <option value="" className="bg-[#1C1C1A] text-white">All regions</option>
        {TT_REGIONS.map((r) => (
          <option key={r.value} value={r.value} className="bg-[#1C1C1A] text-white">{r.label}</option>
        ))}
      </>
    );

    if (variant === "glass") {
      return (
        <>
          <GlassSelect value={sort} onChange={(v) => setParam("sort", v)}>{sortOptions}</GlassSelect>
          <GlassSelect value={category} onChange={(v) => setParam("category", v)}>{categoryOptions}</GlassSelect>
          <GlassSelect value={region} onChange={(v) => setParam("region", v)}>{regionOptions}</GlassSelect>
          <div className="flex flex-wrap gap-2">
            {DATE_FILTERS.map((df) => {
              const isActive = dateFilter === df.value || (!dateFilter && df.value === "");
              return (
                <button
                  key={df.value}
                  onClick={() => setParam("date", df.value)}
                  className={`${pillBase} ${isActive ? pillActive : pillInactive}`}
                >
                  {df.label}
                </button>
              );
            })}
          </div>
        </>
      );
    }

    // Drawer variant — plain labeled selects
    return (
      <>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-600">Sort by</label>
          <select value={sort} onChange={(e) => setParam("sort", e.target.value)} className={drawerSelect}>{sortOptions}</select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-600">Category</label>
          <select value={category} onChange={(e) => setParam("category", e.target.value)} className={drawerSelect}>{categoryOptions}</select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-600">Region</label>
          <select value={region} onChange={(e) => setParam("region", e.target.value)} className={drawerSelect}>{regionOptions}</select>
        </div>
        <div className="space-y-1.5 pt-1">
          <span className="text-xs font-semibold text-zinc-600">Date</span>
          <div className="flex flex-wrap gap-2">
            {DATE_FILTERS.map((df) => {
              const isActive = dateFilter === df.value || (!dateFilter && df.value === "");
              return (
                <button
                  key={df.value}
                  onClick={() => setParam("date", df.value)}
                  className={`${pillBase} ${isActive ? pillActive : pillInactive}`}
                >
                  {df.label}
                </button>
              );
            })}
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      <div className="space-y-3">
        {/* ── Search bar — centered, max-w-2xl ── */}
        <div className="flex justify-center">
          <div
            className="flex w-full max-w-2xl items-center overflow-hidden rounded-2xl p-1.5"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <input
              type="search"
              placeholder="Search events, venues, or categories…"
              value={inputValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="min-w-0 flex-1 bg-transparent py-2 pl-4 pr-2 text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
            {/* Spinner while pending */}
            {isPending && (
              <span className="mr-1 text-white/50">
                <InlineSpinner className="h-4 w-4" />
              </span>
            )}
            {/* Clear × button */}
            {inputValue && !isPending && (
              <button
                onClick={clearSearch}
                className="mr-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Desktop filter row — hidden on mobile ── */}
        <div className="hidden lg:flex lg:flex-wrap lg:items-center lg:justify-center lg:gap-2.5">
          {filterControls("glass")}
          {activeCount > 0 && (
            <button
              onClick={() => startTransition(() => router.push("/events", { scroll: false }))}
              className="flex items-center gap-1.5 rounded-full border border-white/[0.18] px-3 py-2 text-xs text-white/50 transition-colors hover:border-white/40 hover:text-white"
            >
              <X className="size-3" />
              Clear
            </button>
          )}
        </div>

        {/* ── Mobile: Filters trigger button ── */}
        <div className="flex justify-center lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filters
            {activeCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D4450A] text-[10px] font-black text-white">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile slide-up drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Panel — slides up from bottom */}
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-3xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <p className="text-sm font-bold text-zinc-900">
                Filters
                {activeCount > 0 && (
                  <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#D4450A] text-[10px] font-black text-white">
                    {activeCount}
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200"
                aria-label="Close filters"
              >
                <X className="size-4" strokeWidth={2.5} />
              </button>
            </div>

            {/* Filter controls */}
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              {filterControls("drawer")}
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-100 p-5 pb-safe">
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
              >
                Apply filters
              </button>
              {activeCount > 0 && (
                <button
                  onClick={() => {
                    startTransition(() => router.push("/events", { scroll: false }));
                    setDrawerOpen(false);
                    setInputValue("");
                  }}
                  className="mt-2.5 w-full rounded-xl border-2 border-zinc-200 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
