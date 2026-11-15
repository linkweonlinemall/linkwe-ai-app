'use client';

import { useEffect, useState, useTransition } from 'react';
import { saveVendorCollections } from '@/app/actions/vendor-catalogue';
import { MAX_COLLECTIONS, MAX_COLLECTION_ITEMS, type CatalogueCollection } from '@/lib/vendor/catalogue/collections';
import type { CatalogueListing } from '@/lib/vendor/catalogue/model';

const button = 'min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700 disabled:opacity-50';
const input = 'w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-700';
export default function CollectionsWorkspace({ storeId, slug, initial, initialRevision, listings, preview = false }: {
  storeId: string; slug: string; initial: CatalogueCollection[]; initialRevision: number; listings: CatalogueListing[]; preview?: boolean;
}) {
  const [collections, setCollections] = useState(initial);
  const [baseline, setBaseline] = useState(JSON.stringify(initial));
  const [revision, setRevision] = useState(initialRevision);
  const [selectedId, setSelectedId] = useState(initial[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, startTransition] = useTransition();
  const [link, setLink] = useState('');
  const selected = collections.find(c => c.id === selectedId);
  const dirty = JSON.stringify(collections) !== baseline;
  const eligible = listings.filter(item => !item.isArchived);
  const visible = eligible.filter(item => (kind === 'all' || item.isService === (kind === 'services')) && item.name.toLowerCase().includes(query.trim().toLowerCase()));
  const eligibleIds = new Set(eligible.map(item => item.id));
  const unavailableIds = selected?.productIds.filter(id => !eligibleIds.has(id)) ?? [];
  const published = new Set(eligible.filter(item => item.isPublished).map(item => item.id));
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function patch(change: Partial<CatalogueCollection>) {
    setCollections(prev => prev.map(c => c.id === selectedId ? { ...c, ...change } : c));
    setMessage(''); setError(''); setLink('');
  }
  function add() {
    const id = crypto.randomUUID();
    let suffix = collections.length + 1;
    while (collections.some(c => c.name.toLowerCase() === `collection ${suffix}`)) suffix++;
    setCollections(prev => [...prev, { id, name: `Collection ${suffix}`, description: '', productIds: [] }]);
    setSelectedId(id); setQuery(''); setMessage(''); setError(''); setLink('');
  }
  function remove() {
    if (!selected || !window.confirm(`Remove “${selected.name}” from your catalogue? Your listings will not be deleted. Save collections to apply.`)) return;
    setCollections(prev => prev.filter(c => c.id !== selected.id));
    setSelectedId(collections.find(c => c.id !== selected.id)?.id ?? ''); setMessage(''); setError(''); setLink('');
  }
  function save() {
    setError(''); setMessage('');
    if (preview) { setMessage('Preview only: no collections or listings are saved.'); return; }
    startTransition(async () => {
      try {
        const result = await saveVendorCollections({ storeId, expectedRevision: revision, collections });
        if (!result.ok) { setError(result.error); return; }
        setRevision(result.revision); setBaseline(JSON.stringify(collections));
        setMessage('Collections saved. Published listings are visible; drafts stay private. Listing prices, stock and featured selections are unchanged.');
      } catch { setError('Save could not be confirmed. Reload to check the latest collections before trying again.'); }
    });
  }
  async function copy() {
    if (!selected) return;
    const url = new URL(preview ? '/dev/store-catalogue' : `/store/${encodeURIComponent(slug)}`, window.location.origin);
    url.searchParams.set('tab', 'catalogue'); url.searchParams.set('c_collection', selected.id); url.hash = 'store-content';
    try { await navigator.clipboard.writeText(url.toString()); setMessage('Collection link copied.'); }
    catch { setLink(url.toString()); setMessage('Select and copy your collection link below.'); }
  }
  return <section aria-labelledby="collections-heading" className="mb-10 rounded-3xl border border-teal-100 bg-[#f2f8f7] p-5 sm:p-7">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">Make room for every collection</p><h2 id="collections-heading" className="mt-2 text-2xl font-bold text-slate-900">Your named catalogues</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Create New Collection, Party Collection or any theme you like. A listing can appear in more than one collection. Your original Store picks stay below.</p></div><button type="button" className={button} onClick={add} disabled={busy || collections.length >= MAX_COLLECTIONS}>+ New collection</button></div>
    <fieldset disabled={busy} className="min-w-0"><legend className="sr-only">Edit named collections</legend>
    <div className="grid min-w-0 gap-5 md:grid-cols-[240px_minmax(0,1fr)]">
      <nav aria-label="Choose a collection" className="space-y-2">{collections.map(c => <button type="button" key={c.id} onClick={() => { setSelectedId(c.id); setQuery(''); setLink(''); }} aria-pressed={selectedId === c.id} className={`${button} block w-full text-left ${selectedId === c.id ? '!border-teal-700 !bg-teal-50' : ''}`}><span className="block break-words">{c.name || 'Untitled collection'}</span><span className="text-xs font-normal text-slate-500">{c.productIds.filter(id => published.has(id)).length} visible · {c.productIds.length} selected</span></button>)}{!collections.length && <p className="rounded-2xl border border-dashed border-teal-200 p-5 text-sm leading-6 text-slate-600">No named collections yet. Create your first above; your existing catalogue is unchanged.</p>}</nav>
      {selected ? <div className="min-w-0 rounded-2xl bg-white p-5 shadow-sm"><div className="grid gap-4"><label className="text-sm font-semibold text-slate-800">Collection name<input className={`${input} mt-1`} maxLength={80} value={selected.name} onChange={e => patch({ name: e.target.value })} /></label><label className="text-sm font-semibold text-slate-800">Short description <span className="font-normal">(optional)</span><textarea className={`${input} mt-1`} maxLength={240} rows={2} value={selected.description} onChange={e => patch({ description: e.target.value })} /></label></div>
        <div className="my-4 flex flex-wrap gap-2"><button type="button" className={button} disabled={dirty} onClick={copy}>Copy collection link</button><button type="button" className={button} onClick={remove}>Remove collection</button></div>{dirty && <p className="mb-4 text-xs text-slate-500">Save your changes before sharing the collection link.</p>}
        {unavailableIds.length > 0 && <div role="alert" className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{unavailableIds.length} selected listing(s) are archived or no longer available. They are hidden from customers. Remove them before saving this collection.<button type="button" className={`${button} mt-2 block`} onClick={() => patch({ productIds: selected.productIds.filter(id => eligibleIds.has(id)) })}>Remove unavailable selections</button></div>}
        <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_160px]"><label className="text-sm font-semibold text-slate-800">Find listings<input type="search" maxLength={120} value={query} onChange={e => setQuery(e.target.value)} className={`${input} mt-1`} /></label><label className="text-sm font-semibold text-slate-800">Listing type<select value={kind} onChange={e => setKind(e.target.value)} className={`${input} mt-1`}><option value="all">All listings</option><option value="products">Products</option><option value="services">Services</option></select></label></div>
        <p className="mb-3 text-xs leading-5 text-slate-500">Choose up to {MAX_COLLECTION_ITEMS} listings. Drafts can be organised now, but only published listings appear publicly. Empty collections display an honest empty state.</p>
        <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200">{visible.map(item => <label key={item.id} className="flex min-h-14 cursor-pointer items-center gap-3 border-b border-slate-100 p-3 text-sm hover:bg-slate-50"><input type="checkbox" checked={selected.productIds.includes(item.id)} disabled={!selected.productIds.includes(item.id) && selected.productIds.length >= MAX_COLLECTION_ITEMS} onChange={e => patch({ productIds: e.target.checked ? [...selected.productIds, item.id] : selected.productIds.filter(id => id !== item.id) })} className="size-4 shrink-0 accent-teal-700" /><span className="min-w-0 break-words">{item.name}<span className="block text-xs text-slate-500">{item.isService ? 'Service' : 'Product'} · {item.isPublished ? 'Published' : 'Draft · private'}</span></span></label>)}{!visible.length && <p className="p-5 text-sm text-slate-500">No matching listings. Try another search or listing type.</p>}</div>
      </div> : <div className="grid place-content-center rounded-2xl border border-dashed border-teal-200 p-8 text-center text-slate-600">Choose or create a collection to select its products and services.</div>}
    </div></fieldset>
    <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={save} disabled={busy || !dirty} className={`${button} !border-teal-700 !bg-teal-700 !text-white`}>{busy ? 'Saving…' : 'Save collections'}</button><button type="button" disabled={busy || !dirty} className={button} onClick={() => { const original = JSON.parse(baseline) as CatalogueCollection[]; setCollections(original); setSelectedId(original[0]?.id ?? ''); setError(''); setMessage('Changes discarded.'); }}>Discard changes</button></div>
    {message && <p role="status" className="mt-4 text-sm text-teal-800">{message}</p>}{error && <p role="alert" className="mt-4 text-sm text-red-800">{error}</p>}{link && <input aria-label="Collection link" className={`${input} mt-3`} readOnly value={link} onFocus={e => e.target.select()} />}
  </section>;
}
