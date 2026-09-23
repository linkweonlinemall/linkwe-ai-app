"use client";

import { useId, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownWideNarrow, Check, ChevronDown, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import type { ShopFilterOptions } from "@/lib/shop/types";
import { SHOP_SORTS, type ShopQuery } from "@/lib/shop/query";
import styles from "./shop.module.css";

type Props = { query: ShopQuery; options: ShopFilterOptions; total: number; children: ReactNode };
export default function ShopBrowser({ query, options, total, children }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState({ category: query.category, region: query.region, minPrice: query.minPrice?.toString() ?? "", maxPrice: query.maxPrice?.toString() ?? "", brand: query.brand, colour: query.colour, size: query.size, condition: query.condition, inStock: query.inStock });
  const [pending, startTransition] = useTransition();
  const [priceError, setPriceError] = useState("");
  const activeCount = [query.category, query.region, query.minPrice !== undefined || query.maxPrice !== undefined, query.inStock, query.condition, query.brand, query.colour, query.size].filter(Boolean).length;
  function navigate(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    next.delete("page");
    for (const [key,value] of Object.entries(changes)) { if (value) next.set(key,value); else next.delete(key); }
    dialog.current?.close();
    startTransition(() => router.push(`/shop${next.size ? `?${next}` : ""}#shop-results`, { scroll: false }));
  }
  function apply(event: React.FormEvent) {
    event.preventDefault();
    if (draft.minPrice && draft.maxPrice && Number(draft.minPrice) > Number(draft.maxPrice)) { setPriceError("The maximum should be higher than the minimum."); return; }
    setPriceError("");
    navigate({ ...draft, inStock: draft.inStock ? "true" : "" });
  }
  function reset() { navigate({ category: "", region: "", minPrice: "", maxPrice: "", brand: "", colour: "", size: "", condition: "", inStock: "" }); }
  function fields(prefix: string) {
    const select = (key: "category" | "region" | "brand" | "size" | "condition", label: string, values: {value:string;label:string}[], placeholder: string) => <label className={styles.field} htmlFor={`${prefix}-${key}`}><span>{label}</span><div className={styles.selectWrap}><select id={`${prefix}-${key}`} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })}><option value="">{placeholder}</option>{draft[key] && !values.some(v => v.value === draft[key]) && <option value={draft[key]}>{draft[key].replaceAll("_", " ")}</option>}{values.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}</select><ChevronDown size={14} aria-hidden /></div></label>;
    return <form onSubmit={apply} className={styles.filterForm}>
      {select("category", "Category", options.categories.map(c => ({ value:c.value, label:`${c.label} (${c.count})` })), "Every kind of find")}
      <fieldset className={styles.priceField}><legend>Price range <span>TTD</span></legend><div><label htmlFor={`${prefix}-min`}><span className="sr-only">Minimum price</span><input id={`${prefix}-min`} type="number" min="0" step="0.01" inputMode="decimal" placeholder="Min" value={draft.minPrice} onChange={e => setDraft({ ...draft, minPrice:e.target.value })} /></label><span>—</span><label htmlFor={`${prefix}-max`}><span className="sr-only">Maximum price</span><input id={`${prefix}-max`} type="number" min="0" step="0.01" inputMode="decimal" placeholder="Max" value={draft.maxPrice} onChange={e => setDraft({ ...draft, maxPrice:e.target.value })} /></label></div>{priceError && <p role="alert" className={styles.filterError}>{priceError}</p>}</fieldset>
      <label className={styles.stockToggle}><input type="checkbox" checked={draft.inStock} onChange={e => setDraft({ ...draft, inStock:e.target.checked })} /><span>In stock only</span></label>
      {select("region", "Store location", options.regions, "Anywhere in T&T")}
      {select("condition", "Condition", [{value:"NEW",label:"New"},{value:"USED",label:"Used"},{value:"REFURBISHED",label:"Refurbished"}], "Any condition")}
      {options.brands.length > 0 && select("brand", "Brand", options.brands.map(b => ({value:b,label:b})), "All brands")}
      {options.sizes.length > 0 && select("size", "Size", options.sizes.map(s => ({value:s,label:s})), "All sizes")}
      {options.colours.length > 0 && <fieldset className={styles.colourField}><legend>Colour{draft.colour && <span> · {draft.colour}</span>}</legend><div>{options.colours.map(c => <button type="button" key={c.value} aria-label={`Filter by ${c.value}`} aria-pressed={draft.colour === c.value} onClick={() => setDraft({...draft, colour:draft.colour === c.value ? "" : c.value})} style={{background:c.hex}}>{draft.colour === c.value && <Check size={17} aria-hidden />}</button>)}</div></fieldset>}
      <div className={styles.filterActions}><button type="submit" disabled={pending}>{pending ? "Updating…" : "Apply filters"}<Check size={16} aria-hidden /></button><button type="button" onClick={reset} disabled={pending}><RotateCcw size={13} aria-hidden />Reset filters</button></div>
    </form>;
  }
  return <div className={styles.browseLayout} aria-busy={pending}>
    <aside className={styles.sidebar} aria-label="Product filters"><div className={styles.filterHeading}><SlidersHorizontal size={18} aria-hidden /><div><h3>Make it your find.</h3><p>A few details. A better match.</p></div></div>{fields(`${id}-desktop`)}<div className={styles.sidebarNote}><span>WE PEOPLE. WE BUSINESS.</span><strong>Every find has<br />someone behind it.</strong><Link href="/stores">Meet our local stores ↗</Link></div></aside>
    <div className={styles.resultsColumn}>
      <div className={styles.toolbar}><button type="button" className={styles.filterTrigger} onClick={() => dialog.current?.showModal()} aria-haspopup="dialog"><SlidersHorizontal size={17} aria-hidden />Filters{activeCount > 0 && <span>{activeCount}</span>}</button><p className={styles.resultCount} role="status">{pending ? "Finding your matches…" : `${total} ${total === 1 ? "find" : "finds"} to explore`}</p><label className={styles.sortLabel} htmlFor={`${id}-sort`}><ArrowDownWideNarrow size={17} aria-hidden /><span>Sort by</span><select aria-label="Sort by" id={`${id}-sort`} value={query.sort} disabled={pending} onChange={e => navigate({ sort:e.target.value === "featured" ? "" : e.target.value })}>{SHOP_SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select><ChevronDown size={13} aria-hidden /></label></div>
      <div className={styles.resultsBody} data-pending={pending}>{children}</div>
    </div>
    <dialog ref={dialog} className={styles.filterDialog} aria-labelledby={`${id}-title`} onClick={e => { if (e.target === e.currentTarget) { const rect=e.currentTarget.getBoundingClientRect(); if(e.clientX<rect.left || e.clientX>rect.right || e.clientY<rect.top || e.clientY>rect.bottom) dialog.current?.close(); } }}><div className={styles.dialogHeading}><div><span>FIND YOUR SOMETHING</span><h2 id={`${id}-title`}>Refine your finds</h2></div><button type="button" onClick={() => dialog.current?.close()} aria-label="Close filters"><X size={23} aria-hidden /></button></div>{fields(`${id}-mobile`)}</dialog>
  </div>;
}
