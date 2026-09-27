"use client";

import Link from "next/link";
import { FilterSelect, FilterChoices, ColourSwatches } from "@/components/filters/FilterControls";
import { useId, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownWideNarrow, Check, ChevronDown, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { EVENT_DATES, EVENT_SORTS, eventRegionLabel, type EventQuery } from "@/lib/events/directory-query";
import type { EventDirectoryOptions } from "@/lib/events/directory";
import base from "@/components/shop/shop.module.css";
import styles from "./directory.module.css";

export function EventsSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter(), params = useSearchParams();
  const [query, setQuery] = useState(defaultValue), [pending, startTransition] = useTransition();
  return <form role="search" aria-label="Find an event" className={styles.search} onSubmit={event => {
    event.preventDefault();
    const next = new URLSearchParams(params.toString()); next.delete("page");
    if (query.trim()) next.set("q", query.trim()); else next.delete("q");
    startTransition(() => router.push("/events" + (next.size ? "?" + next : "") + "#event-results", { scroll: false }));
  }}>
    <Search size={19} aria-hidden/>
    <input type="search" aria-label="Search events" value={query} onChange={event => setQuery(event.target.value)} placeholder="Event, venue, organiser…"/>
    <button type="submit" disabled={pending}>{pending ? "Finding…" : "Search"}</button>
  </form>;
}

export default function EventsBrowser({ query, options, total, children }: { query: EventQuery; options: EventDirectoryOptions; total: number; children: ReactNode }) {
  const router = useRouter(), params = useSearchParams(), id = useId(), dialog = useRef<HTMLDialogElement>(null);
  const initialDraft = { category: query.category, region: query.region, date: query.date, format: query.format, pricing: query.pricing, availability: query.availability, minPrice: query.minPrice?.toString() ?? "", maxPrice: query.maxPrice?.toString() ?? "" };
  const [draft, setDraft] = useState(initialDraft);
  const [error,setError] = useState("");
  const [pending, startTransition] = useTransition();
  const count = Object.values(initialDraft).filter(Boolean).length;

  function navigate(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString()); next.delete("page");
    for (const [key, value] of Object.entries(values)) { if (value) next.set(key, value); else next.delete(key); }
    dialog.current?.close();
    startTransition(() => router.push("/events" + (next.size ? "?" + next : "") + "#event-results", { scroll: false }));
  }
  function fields(prefix: string) {
    const select = (key: keyof typeof draft, label: string, values: { value: string; label: string }[], placeholder: string) => <FilterSelect id={`${prefix}-${key}`} label={label} value={String(draft[key])} options={values} placeholder={placeholder} onChange={value=>setDraft({...draft,[key]:value})}/>;
    return <form className={base.filterForm} onSubmit={event => { event.preventDefault(); if (draft.minPrice && draft.maxPrice && Number(draft.minPrice) > Number(draft.maxPrice)) { setError("Maximum price must be at least the minimum."); return; } setError(""); navigate(draft); }}>
      {select("date", "When are we going?", EVENT_DATES.filter(date => !!date.value), "Any date")}
      {select("category", "What’s your scene?", options.categories.map(category => ({ value: category.value, label: category.label + " (" + category.count + ")" })), "All event categories")}
      {select("region", "Where in T&T?", options.regions, "Anywhere in T&T")}
      {select("format", "The experience", [{ value: "in_person", label: "In person" }, { value: "online", label: "Online" }], "In person & online")}
      {select("pricing", "Tickets", [{ value: "free", label: "Free tickets available" }, { value: "paid", label: "Paid tickets available" }], "All ticket options")}
      {select("availability", "Ticket availability", [{value:"on_sale",label:"Book tickets now"},{value:"not_started",label:"On sale soon"},{value:"sold_out",label:"Sold out"}], "Any availability")}
      <fieldset className={base.priceField}><legend>Starting ticket price <span>TTD</span></legend><div><input aria-label="Minimum ticket price" type="number" min="0" step="0.01" placeholder="Min" value={draft.minPrice} onChange={e=>setDraft({...draft,minPrice:e.target.value})}/><span>—</span><input aria-label="Maximum ticket price" type="number" min="0" step="0.01" placeholder="Max" value={draft.maxPrice} onChange={e=>setDraft({...draft,maxPrice:e.target.value})}/></div>{error&&<p role="alert" className={base.filterError}>{error}</p>}</fieldset>
      <p className={styles.tip}>Dates and times are in Trinidad &amp; Tobago time. Ticket availability is confirmed on the event page.</p>
      <div className={base.filterActions}>
        <button type="submit" disabled={pending}>{pending ? "Updating…" : "Apply filters"}<Check size={16} aria-hidden/></button>
        <button type="button" onClick={() => navigate({ category: "", region: "", date: "", format: "", pricing: "", availability: "", minPrice: "", maxPrice: "" })} disabled={pending}><RotateCcw size={13} aria-hidden/>Reset filters</button>
      </div>
    </form>;
  }
  return <div className={base.browseLayout} aria-busy={pending}>
    <aside className={base.sidebar} aria-label="Event filters">
      <div className={base.filterHeading}><SlidersHorizontal size={18} aria-hidden/><div><h3>Your kind of good time.</h3><p>Make a plan that feels like you.</p></div></div>
      {fields(id + "-desktop")}
      <div className={base.sidebarNote}><span>A LITTLE SOMETHING TO LOOK FORWARD TO</span><strong>Find the event.<br/>Bring your people.</strong><Link href="/event-collections">Explore your collections ↗</Link></div>
    </aside>
    <div className={base.resultsColumn}>
      <div className={base.toolbar}>
        <button type="button" className={base.filterTrigger} onClick={() => { setDraft(initialDraft); dialog.current?.showModal(); }} aria-haspopup="dialog"><SlidersHorizontal size={17} aria-hidden/>Filters{count > 0 && <span>{count}</span>}</button>
        <p className={base.resultCount} role="status">{pending ? "Finding your next plan…" : total + (total === 1 ? " event" : " events") + " to explore"}</p>
        <label className={base.sortLabel} htmlFor={id + "-sort"}><ArrowDownWideNarrow size={17} aria-hidden/><span>Sort by</span><select id={id + "-sort"} aria-label="Sort events" value={query.sort} disabled={pending} onChange={event => navigate({ sort: event.target.value === "recommended" ? "" : event.target.value })}>{EVENT_SORTS.map(sort => <option key={sort.value} value={sort.value}>{sort.label}</option>)}</select><ChevronDown size={13} aria-hidden/></label>
      </div>
      <div className={base.resultsBody} data-pending={pending}>{children}</div>
    </div>
    <dialog ref={dialog} className={base.filterDialog} aria-labelledby={id + "-title"} onClick={event => {
      if (event.target === event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.current?.close();
      }
    }}>
      <div className={base.dialogHeading}><div><span>YOUR NEXT GOOD TIME</span><h2 id={id + "-title"}>Find your kind of event</h2></div><button type="button" aria-label="Close filters" onClick={() => dialog.current?.close()}><X size={23} aria-hidden/></button></div>
      {fields(id + "-mobile")}
    </dialog>
  </div>;
}
