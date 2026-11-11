"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, Check, Copy, ExternalLink, Search } from "lucide-react";
import { saveVendorCatalogue } from "@/app/actions/vendor-catalogue";
import { getProductCategoryLabel, getServiceCategoryLabel } from "@/lib/categories";
import type { CatalogueListing } from "@/lib/vendor/catalogue/model";
import s from "./catalogue.module.css";

const PAGE_SIZE = 48;
const categoryLabel = (item: CatalogueListing) => item.category ? (item.isService ? getServiceCategoryLabel(item.category) : getProductCategoryLabel(item.category)) : "";
export default function CatalogueWorkspace({ store, listings, preview = false }: {
  store: { id: string; name: string; slug: string; status: string }; listings: CatalogueListing[]; preview?: boolean;
}) {
  const [baseline, setBaseline] = useState(() => Object.fromEntries(listings.map(item => [item.id, item.isFeatured])));
  const [selection, setSelection] = useState(baseline);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("available");
  const [category, setCategory] = useState("");
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copyFallback, setCopyFallback] = useState("");
  const path = preview ? "/dev/store-catalogue?tab=catalogue" : `/store/${encodeURIComponent(store.slug)}?tab=catalogue`;
  const changes = listings.filter(item => !item.isArchived && selection[item.id] !== baseline[item.id])
    .map(item => ({ id: item.id, expected: baseline[item.id], selected: selection[item.id] }));
  const filtered = listings.filter(item => (!query.trim() || `${item.name} ${item.category ?? ""} ${categoryLabel(item)}`.toLowerCase().includes(query.trim().toLowerCase()))
    && (kind === "all" || item.isService === (kind === "services"))
    && (!category || item.category === category)
    && (!selectedOnly || selection[item.id])
    && (status === "all" || (status === "available" && !item.isArchived) || (status === "published" && item.isPublished && !item.isArchived)
      || (status === "draft" && !item.isPublished && !item.isArchived) || (status === "archived" && item.isArchived)));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const eligible = visible.filter(item => !item.isArchived);
  const selected = listings.filter(item => selection[item.id] && !item.isArchived);
  const publishedCount = selected.filter(item => item.isPublished).length;
  function selectVisible(value: boolean) {
    setSelection(previous => ({ ...previous, ...Object.fromEntries(eligible.map(item => [item.id, value])) }));
    setMessage(""); setError("");
  }
  async function save() {
    if (preview) { setMessage("Demo only: no changes are saved."); return; }
    setBusy(true); setMessage(""); setError("");
    try {
      const result = await saveVendorCatalogue({ storeId: store.id, changes });
      if (!result.ok) { setError(result.error); return; }
      setBaseline({ ...selection });
      setMessage(`Saved ${result.count} selection ${result.count === 1 ? "change" : "changes"}. Drafts remain private until you publish them.`);
    } catch { setError("We could not confirm the save. Reload to check saved selections before trying again."); }
    finally { setBusy(false); }
  }
  async function copyLink() {
    const url = new URL(path, window.location.origin).href;
    try { await navigator.clipboard.writeText(url); setMessage(preview ? "Sample catalogue link copied. Saving is disabled in this preview." : "Catalogue link copied. It opens your saved public selections."); setCopyFallback(""); }
    catch { setCopyFallback(url); setMessage("Copy the catalogue link from the field below."); }
  }
  return <main className={s.workspace}>
    {preview && <p className={s.warning}>Development preview · sample listings only · saving is disabled.</p>}
    <header className={s.header}>
      <div><span className={s.eyebrow}><BookOpen size={16} aria-hidden="true" /> YOUR STOREFRONT</span>
        <h1>Store catalogue</h1><p>Curate the products and services you want customers to discover first.</p></div>
      <div className={s.actions}><Link className={s.button} href={path} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> {preview ? "Open sample catalogue" : "Preview saved catalogue"}</Link>
        <button className={s.button} onClick={copyLink}><Copy size={16} /> Copy catalogue link</button></div>
    </header>
    <section className={s.intro} aria-label="How your catalogue works">
      <div><h2>A handpicked collection for {store.name}</h2><p>Selected listings are featured in your store and may be recommended elsewhere on LinkWe. Unselected listings stay in your ordinary store. This uses the same selection as “Feature this product” in the listing editor.</p>
        <p>Only published, non-archived selections appear publicly. You can prepare draft selections here without publishing them. Archived listings cannot be selected or changed here.</p>
        {store.status !== "ACTIVE" && <p className={s.warning}>Your store is not active yet. You can prepare your catalogue now, but the public link will be available after your store is approved.</p>}</div>
      <div className={s.summary}><strong>{publishedCount}</strong><span>published selections</span><small>{selected.length - publishedCount} draft selections</small></div>
    </section>
    {copyFallback && <label className={s.fallback}>Catalogue link<input readOnly value={copyFallback} onFocus={event => event.target.select()} /></label>}
    <fieldset className={s.filters} disabled={busy}><legend>Find listings</legend>
      <label className={s.search}><span><Search size={16} /> Search</span><input value={query} placeholder="Name or category" onChange={event => { setQuery(event.target.value); setPage(0); }} /></label>
      <label>Listing type<select value={kind} onChange={event => { setKind(event.target.value); setPage(0); }}><option value="all">Products & services</option><option value="products">Products</option><option value="services">Services</option></select></label>
      <label>Status<select value={status} onChange={event => { setStatus(event.target.value); setPage(0); }}><option value="available">Non-archived</option><option value="published">Published</option><option value="draft">Drafts</option><option value="archived">Archived</option><option value="all">All statuses</option></select></label>
      <label>Category<select value={category} onChange={event => { setCategory(event.target.value); setPage(0); }}><option value="">All categories</option>{Array.from(new Set(listings.flatMap(item => item.category ? [item.category] : []))).sort().map(name => <option key={name} value={name}>{categoryLabel(listings.find(item => item.category === name)!)}</option>)}</select></label>
      <label className={s.checkbox}><input type="checkbox" checked={selectedOnly} onChange={event => { setSelectedOnly(event.target.checked); setPage(0); }} /> Selected only</label>
    </fieldset>
    <div className={s.listToolbar}><p>{filtered.length} matching {filtered.length === 1 ? "listing" : "listings"} · {visible.length} displayed</p><div className={s.actions}>
      <button className={s.button} disabled={busy || !eligible.length} onClick={() => selectVisible(true)}>Select displayed ({eligible.length})</button>
      <button className={s.button} disabled={busy || !eligible.length} onClick={() => selectVisible(false)}>Deselect displayed ({eligible.length})</button></div></div>
    <div className={s.grid}>{visible.map(item => <label key={item.id} className={`${s.card} ${selection[item.id] && !item.isArchived ? s.selected : ""} ${item.isArchived ? s.archived : ""}`}>
      <input type="checkbox" checked={!item.isArchived && selection[item.id]} disabled={busy || item.isArchived} aria-label={`Feature ${item.name}`} onChange={event => { setSelection(previous => ({ ...previous, [item.id]: event.target.checked })); setMessage(""); }} />
      <span><span className={s.type}>{item.isService ? "Service" : "Product"}{item.category ? ` · ${categoryLabel(item)}` : ""}</span><strong>{item.name}</strong><span className={s.status}>{item.isArchived ? "Archived · unavailable" : item.isPublished ? "Published · ready to display" : "Draft · private until published"}</span></span>
      {selection[item.id] && !item.isArchived && <Check size={18} aria-hidden="true" className={s.check} />}
    </label>)}</div>
    {!visible.length && <div className={s.empty}><BookOpen size={28} /><h2>{listings.length ? "No matching listings" : "Your catalogue starts here"}</h2><p>{listings.length ? "Try another search or change your filters." : "Create a product or service, then select it for your catalogue."}</p><Link href="/dashboard/vendor/creation">Manage products & services</Link></div>}
    {pages > 1 && <nav aria-label="Catalogue listing pages" className={s.pagination}><button className={s.button} disabled={busy || currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage + 1} of {pages}</span><button className={s.button} disabled={busy || currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Next</button></nav>}
    <footer className={s.savebar}><div><strong>{changes.length ? `${changes.length} unsaved selection changes` : "Selections are up to date"}</strong><p>Save before previewing or sharing. Bulk actions affect only the displayed page.</p>
      {changes.length > 500 && <p className={s.warning}>Save up to 500 changes at once. Undo some changes or discard and work in smaller batches.</p>}</div>
      <div className={s.actions}><button className={s.button} disabled={busy || !changes.length} onClick={() => { setSelection({ ...baseline }); setError(""); setMessage("Unsaved selection changes discarded."); }}>Discard changes</button>
        <button className={`${s.button} ${s.primary}`} disabled={preview || busy || !changes.length || changes.length > 500} onClick={save}>{busy ? "Saving…" : "Save catalogue"}</button></div>
    </footer>
    <div aria-live="polite" role="status" className={s.message}>{message}</div>
    {error && <div role="alert" className={s.error}>{error} <button className={s.button} onClick={() => { if (!changes.length || window.confirm("Reload the saved catalogue? Any unsaved selections will be discarded.")) window.location.reload(); }}>Reload saved catalogue</button></div>}
  </main>;
}
