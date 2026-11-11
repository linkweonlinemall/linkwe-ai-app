"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Check, Copy, Search, SlidersHorizontal, X, ShoppingBag } from "lucide-react";
import { FilterSelect } from "@/components/filters/FilterControls";
import { getProductCategoryLabel, getServiceCategoryLabel } from "@/lib/categories";
import { filterCatalogue, filterDefaults, itemLocation, pricingKind, pricingLabels, readCatalogueFilters, salePrice, productChoices, sortLabels, type CatalogueItem, type FilterKey } from "@/lib/storefront/catalogue-filters";
import { storefrontServiceLocation } from "@/lib/storefront/service-display";
import StorefrontListingCard from "./StorefrontListingCard";
import StoreMobileFilterSheet from "./StoreMobileFilterSheet";
import styles from "./storefront.module.css";

const serviceLabels: Record<string,string> = { BOOKABLE: 'Appointments', QUOTE: 'Custom quotes', ON_DEMAND: 'On demand', SUBSCRIPTION: 'Subscriptions', VIRTUAL: 'Online services' };
const fieldLabels: Record<FilterKey,string> = { q: 'Search', type: 'Show', category: 'Category', min: 'Minimum', max: 'Maximum', sale: 'On sale', available: 'Available only', sort: 'Sort', colour: 'Colour', size: 'Size', serviceType: 'Service type', location: 'Location', pricing: 'Pricing' };
const controlClass = "min-h-11 w-full min-w-0 rounded-xl border border-sky-100 bg-slate-50 px-3 text-sm text-[#173f58] focus:outline-2 focus:outline-[#168c89]";
const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-100 bg-white px-4 text-sm font-semibold text-[#173f58] hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-[#168c89]";

export default function StoreCatalogue({ mode, products, services, storeName, availableNow, preview = false, wishlistProductIds = [] }: {
  mode: 'catalogue' | 'store' | 'services'; products: CatalogueItem[]; services: CatalogueItem[];
  storeName: string; availableNow?: boolean; preview?: boolean; wishlistProductIds?: string[];
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const prefix = mode === 'catalogue' ? 'c_' : mode === 'store' ? 'p_' : 's_';
  const filters = readCatalogueFilters(params, prefix);
  const [open, setOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const [manualLink, setManualLink] = useState('');
  const items = [ ...(mode !== 'services' ? products.map(p => ({ ...p, isService: false })) : []), ...(mode !== 'store' ? services.map(s => ({ ...s, isService: true })) : []) ].filter(item => mode !== 'catalogue' || item.isFeatured);
  const scope = items.filter(item => !filters.type || (filters.type === 'services') === item.isService);
  const showProducts = scope.some(i => !i.isService);
  const showServices = scope.some(i => i.isService);
  const categories = Array.from(new Set(scope.map(i => i.category).filter((c): c is string => !!c))).sort();
  const serviceTypes = Array.from(new Set(scope.filter(i => i.isService).map(i => i.serviceType).filter((t): t is string => !!t))).sort();
  const locations = Array.from(new Set(scope.filter(i => i.isService).map(itemLocation).filter(Boolean))).sort();
  const pricing = Array.from(new Set(scope.map(pricingKind)));
  const hasSales = scope.some(item => item.isService ? salePrice(item, item.price) : productChoices(item).some(v => salePrice(item, v.price)));
  const options = { colour: new Set<string>(), size: new Set<string>() };
  for (const item of scope.filter(i => !i.isService)) for (const variant of item.variants ?? []) {
    if (!Array.isArray(variant.attributes)) continue;
    for (const attr of variant.attributes) {
      if (!attr || typeof attr.name !== 'string' || typeof attr.value !== 'string') continue;
      const key = attr.name.trim().toLowerCase();
      if (key === 'colour' || key === 'color') options.colour.add(attr.value.trim().toLowerCase());
      if (key === 'size') options.size.add(attr.value.trim());
    }
  }
  const results = filterCatalogue(items, filters, availableNow);
  const activeKeys = (Object.keys(filters) as FilterKey[]).filter(key => filters[key]);
  const rangeInvalid = !!filters.min && !!filters.max && Number(filters.min) > Number(filters.max);

  function update(changes: Partial<typeof filters>, replace = false) {
    // Read the current URL to avoid losing consecutive edits batched by React.
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(`${prefix}${key}`, value); else next.delete(`${prefix}${key}`);
    }
    next.set('tab', mode);
    const url = `${pathname}?${next.toString()}#store-content`;
    if (replace) window.history.replaceState(null, '', url); else window.history.pushState(null, '', url);
    setCopyStatus(''); setManualLink('');
  }
  function change(key: FilterKey, value: string) {
    if (key === 'type') update({ ...filterDefaults, q: filters.q, type: value });
    else if (key === 'pricing') update({ pricing: value, min: '', max: '', sale: '', ...(value && value !== 'fixed' ? { colour: '', size: '' } : {}) });
    else if ((key === 'colour' || key === 'size') && value) update({ [key]: value, serviceType: '', location: '', pricing: '' });
    else if ((key === 'serviceType' || key === 'location') && value) update({ [key]: value, colour: '', size: '' });
    else update({ [key]: value });
  }
  function clear() { update(filterDefaults); }
  function label(key: FilterKey) {
    const value = filters[key];
    if (key === 'sale' || key === 'available') return fieldLabels[key];
    if (key === 'sort') return sortLabels[value];
    if (key === 'type') return value === 'services' ? 'Services' : 'Products';
    if (key === 'min' || key === 'max') return `${fieldLabels[key]}: TT$${Number(value).toLocaleString('en-TT')}`;
    const readable = key === 'pricing' ? pricingLabels[value] : key === 'location' ? storefrontServiceLocation(value) : key === 'serviceType' ? serviceLabels[value] : key === 'category' ? categoryLabel(value) : value;
    return `${fieldLabels[key]}: ${readable}`;
  }
  function categoryLabel(value: string) { return scope.some(i => i.category === value && i.isService) ? getServiceCategoryLabel(value) : getProductCategoryLabel(value); }
  async function copyLink() {
    const url = new URL(pathname, window.location.origin);
    url.searchParams.set('tab', mode);
    for (const key of activeKeys) url.searchParams.set(`${prefix}${key}`, filters[key]);
    url.hash = 'store-content';
    try { await navigator.clipboard.writeText(url.toString()); setCopyStatus('Link copied. Paste it anywhere you want to share these results.'); setManualLink(''); }
    catch { setManualLink(url.toString()); setCopyStatus('Select and copy the link below.'); }
  }
  const panel = <section className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm" aria-label="Catalogue filters">
    <header className="flex items-center justify-between border-t-4 border-[#e07838] bg-[#173f58] p-5"><div><h3 className="font-bold text-white">Find your kind of find.</h3><p className="mt-1 text-xs text-sky-100">Refine the collection.</p></div><button type="button" onClick={clear} className="min-h-11 rounded-xl bg-white/10 px-3 text-xs font-bold text-white">Clear all</button></header>
    <div className="grid gap-5 p-5">
      {mode === 'catalogue' && <FilterSelect label="Show" value={filters.type} options={[{ value: 'products', label: 'Products' }, { value: 'services', label: 'Services' }]} placeholder="Products & services" onChange={v => change('type', v)} />}
      {categories.length > 0 && <FilterSelect label="Category" value={filters.category} options={categories.map(value => ({ value, label: categoryLabel(value) }))} placeholder="All categories" onChange={v => change('category', v)} />}
      {(hasSales || filters.sale) && <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-[#173f58]"><input type="checkbox" checked={!!filters.sale} onChange={e => change('sale', e.target.checked ? '1' : '')} className="size-4 accent-[#168c89]" />On sale</label>}
      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-[#173f58]"><input type="checkbox" checked={!!filters.available} onChange={e => change('available', e.target.checked ? '1' : '')} className="size-4 accent-[#168c89]" />{showServices && showProducts ? 'In stock / available' : showServices ? 'Available services' : 'In stock only'}</label>
      {showServices && pricing.some(p => p !== 'fixed') && <FilterSelect label="Pricing basis" value={filters.pricing} options={pricing.map(value => ({ value, label: pricingLabels[value] }))} placeholder="All pricing types" onChange={v => change('pricing', v)} />}
      {filters.pricing !== 'quote' && <fieldset><legend className="mb-2 text-xs font-bold text-[#284f65]">{filters.pricing ? pricingLabels[filters.pricing] : 'Fixed price'} range · TTD</legend><div className="flex gap-2">{(['min', 'max'] as const).map(key => <input key={key} aria-label={`${key === 'min' ? 'Minimum' : 'Maximum'} price`} aria-invalid={rangeInvalid} inputMode="decimal" type="number" min="0" max="99999999" step="0.01" placeholder={key === 'min' ? 'Min' : 'Max'} value={filters[key]} onChange={e => change(key, e.target.value)} className={controlClass} />)}</div>{rangeInvalid && <p role="alert" className="mt-2 text-xs text-orange-800">Maximum must be at least the minimum.</p>}{showServices && <p className="mt-2 text-xs leading-5 text-slate-500">{!filters.pricing ? 'Price ranges use fixed prices. Choose a pricing basis to filter starting prices, call-out fees or subscriptions.' : filters.pricing === 'subscription' ? 'These are recurring fees, not one-time prices. Check each billing interval.' : 'Listed fees may not be the final cost. Check the service details.'}</p>}</fieldset>}
      {showProducts && (['colour', 'size'] as const).map(key => options[key].size > 0 && <FilterSelect key={key} label={fieldLabels[key]} value={filters[key]} options={Array.from(options[key]).sort().map(value => ({ value, label: value }))} onChange={v => change(key, v)} />)}
      {showServices && serviceTypes.length > 0 && <FilterSelect label="Service type" value={filters.serviceType} options={serviceTypes.map(value => ({ value, label: serviceLabels[value] ?? value }))} onChange={v => change('serviceType', v)} />}
      {showServices && locations.length > 0 && <FilterSelect label="Where it happens" value={filters.location} options={locations.map(value => ({ value, label: storefrontServiceLocation(value) ?? value }))} onChange={v => change('location', v)} />}
      <p className="text-xs leading-5 text-slate-500">Results update as you refine. Copy a link to share this exact selection.</p>
    </div>
  </section>;
  return <section aria-label={`${mode === 'catalogue' ? 'Selected catalogue' : mode === 'store' ? 'Product collection' : 'Services'} from ${storeName}`}>
    <div className={styles.catalogueHeader}><div><p className={styles.eyebrow}>{mode === 'catalogue' ? 'CURATED BY THIS STORE' : mode === 'store' ? 'THE FULL COLLECTION' : 'LOCAL EXPERTISE'}</p><h2>{mode === 'catalogue' ? 'The catalogue.' : mode === 'store' ? 'A little more to love.' : 'Let’s make it happen.'}</h2><p aria-live="polite">{results.length} of {items.length} {mode === 'services' ? 'services' : mode === 'store' ? 'products' : 'selected finds'} from {storeName}</p></div><label className={styles.catalogueSearch}><Search size={17} aria-hidden /><input aria-label="Search catalogue" type="search" maxLength={120} placeholder="Search by name or category…" value={filters.q} onChange={e => update({ q: e.target.value }, true)} /></label></div>
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div className="flex flex-wrap gap-2"><button type="button" className={`${actionClass} lg:hidden`} onClick={() => setOpen(true)}><SlidersHorizontal size={17} />Filters{activeKeys.length ? ` (${activeKeys.length})` : ''}</button><button type="button" className={actionClass} onClick={copyLink}>{copyStatus.startsWith('Link copied') ? <Check size={17} /> : <Copy size={17} />}Copy filtered link</button></div><div className="w-full sm:w-60"><FilterSelect label="Sort by" value={filters.sort} options={Object.entries(sortLabels).filter(([value]) => value && (value !== 'stock' || showProducts && !showServices) && (value !== 'duration' || showServices && !showProducts)).map(([value,label]) => ({ value,label }))} placeholder="Recommended" onChange={v => change('sort', v)} /></div></div>
    {copyStatus && <p role="status" className="mb-3 text-sm text-[#147873]">{copyStatus}</p>}
    {manualLink && <input aria-label="Filtered store link" readOnly value={manualLink} onFocus={e => e.target.select()} className={`${controlClass} mb-4`} />}
    {activeKeys.length > 0 && <div className="mb-5 flex flex-wrap items-center gap-2" aria-label="Active filters">{activeKeys.map(key => <button type="button" key={key} onClick={() => change(key, '')} className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[#e6f3f1] px-3 text-xs font-semibold text-[#176861]" aria-label={`Remove ${label(key)}`}>{label(key)}<X size={13} aria-hidden /></button>)}<button type="button" onClick={clear} className="min-h-9 px-2 text-sm font-semibold text-[#b94e21] underline">Clear all</button></div>}
    {(filters.sort === 'price_asc' || filters.sort === 'price_desc') && showServices && <p className="mb-4 text-xs text-slate-500">Price sorting compares {filters.pricing ? pricingLabels[filters.pricing].toLowerCase() : 'fixed prices'} first. Other pricing types follow. Recurring fees are per their listed billing interval.</p>}
    <div className="flex flex-col gap-6 lg:flex-row"><aside className={`${styles.filterAside} hidden lg:block`}>{panel}</aside><div className={styles.catalogueResults}>{results.length ? <ul className={styles.catalogueGrid}>{results.map(item => <li key={item.id}><StorefrontListingCard item={item} service={item.isService} preview={preview} availableNow={availableNow} wishlisted={wishlistProductIds.includes(item.id)} /></li>)}</ul> : <div className={styles.emptyState}><ShoppingBag size={38} strokeWidth={1} aria-hidden /><h3>{items.length ? 'No matches just yet.' : mode === 'catalogue' ? 'A collection worth waiting for.' : 'Coming soon.'}</h3><p>{items.length ? 'Try a wider price range or remove a filter to see more.' : mode === 'catalogue' ? 'This store has not selected any published products or services for its catalogue yet.' : 'This store has not published any items here yet.'}</p>{activeKeys.length > 0 && <button type="button" onClick={clear} className={`${actionClass} mt-4`}>Clear all filters</button>}</div>}</div></div>
    <StoreMobileFilterSheet open={open} onClose={() => setOpen(false)} onReset={clear} resultCount={results.length} resultLabel="results">{panel}</StoreMobileFilterSheet>
  </section>;
}
