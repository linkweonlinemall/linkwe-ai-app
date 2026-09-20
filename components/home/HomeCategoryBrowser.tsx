"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Grid2X2, Search, X } from "lucide-react";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import styles from "./home.module.css";

export default function HomeCategoryBrowser({ compact = false }: { compact?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [query, setQuery] = useState("");
  const categories = PRODUCT_CATEGORIES.filter((category) => category.label.toLowerCase().includes(query.trim().toLowerCase()));

  return <>
    <button className={compact ? styles.categoryTriggerCompact : styles.categoryTrigger} type="button" onClick={() => { setQuery(""); dialog.current?.showModal(); }} aria-haspopup="dialog">
      {compact ? <Grid2X2 size={16} aria-hidden /> : null}
      {compact ? "All categories" : "Explore all categories"}
      {!compact ? <ArrowUpRight size={17} aria-hidden /> : null}
    </button>
    <dialog ref={dialog} className={styles.categoryDialog} aria-labelledby={`${id}-title`} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); dialog.current?.close(); } }} onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.current?.close(); } }}>
      <div className={styles.dialogHeading}>
        <div><span className={styles.eyebrow}>A WHOLE WORLD OF LOCAL</span><h2 id={`${id}-title`}>What are you looking for?</h2></div>
        <button type="button" className={styles.closeDialog} aria-label="Close categories" onClick={() => dialog.current?.close()}><X size={22} /></button>
      </div>
      <div className={styles.categorySearch}><Search size={20} aria-hidden /><label className="sr-only" htmlFor={`${id}-search`}>Search product categories</label><input id={`${id}-search`} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try fashion, food, home…" /></div>
      <div className={styles.dialogShortcuts}><Link href="/shop" onClick={() => dialog.current?.close()}>All products <ArrowUpRight size={15} /></Link><Link href="/services" onClick={() => dialog.current?.close()}>Book a service <ArrowUpRight size={15} /></Link><Link href="/events" onClick={() => dialog.current?.close()}>Find an event <ArrowUpRight size={15} /></Link></div>
      <p className={styles.categoryCount} aria-live="polite">{categories.length} {categories.length === 1 ? "category" : "categories"}</p>
      <div className={styles.categoryResults}>{categories.map((category) => <Link key={category.value} href={`/shop?category=${category.value}`} onClick={() => dialog.current?.close()}>{category.label}<ArrowUpRight size={14} aria-hidden /></Link>)}</div>
      {categories.length === 0 && <p className={styles.noCategories}>No matching categories. Try a different word, or browse all products.</p>}
    </dialog>
  </>;
}
