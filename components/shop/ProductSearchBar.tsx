"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowUpRight, LoaderCircle, Package } from "lucide-react";
import { formatTTDPrice } from "@/lib/format/price";

type ProductResult = { id:string; name:string; slug:string; price:number; images:string[]; store:{name:string} };
export default function ProductSearchBar({ defaultValue = "", category = "", previewMode = false }: {defaultValue?:string;category?:string;previewMode?:boolean}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query,setQuery] = useState(defaultValue);
  const [result,setResult] = useState<{query:string;products:ProductResult[]}>({query:"",products:[]});
  const [focused,setFocused] = useState(false);
  const [pending,startTransition] = useTransition();
  const container = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const term = query.trim();
  useEffect(() => {
    if (!term || !focused || previewMode) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({q:term});
        if (category) params.set("category",category);
        const response = await fetch(`/api/products/search?${params}`,{signal:controller.signal});
        if (!response.ok) return;
        const data = await response.json();
        if (!controller.signal.aborted && Array.isArray(data)) setResult({query:term,products:data});
      } catch { /* Full catalogue search remains available when suggestions fail. */ }
    },300);
    return () => { clearTimeout(timer); controller.abort(); };
  },[term,category,focused,previewMode]);
  useEffect(() => {
    function focusSearch() { if (window.location.hash === "#shop-search") input.current?.focus(); }
    function clickAway(event:MouseEvent) { if (!container.current?.contains(event.target as Node)) setFocused(false); }
    focusSearch();
    window.addEventListener("hashchange",focusSearch);
    document.addEventListener("mousedown",clickAway);
    return () => {window.removeEventListener("hashchange",focusSearch);document.removeEventListener("mousedown",clickAway);};
  },[]);
  function search(event:React.FormEvent) {
    event.preventDefault();setFocused(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (term) params.set("q",term);else params.delete("q");
    startTransition(() => router.push(`/shop${params.size ? `?${params}` : ""}#shop-results`,{scroll:false}));
  }
  const suggestions = focused && !previewMode && term && result.query === term ? result.products.slice(0,5) : [];
  return <div id="shop-search" ref={container} className="relative w-full scroll-mt-24">
    <form onSubmit={search} role="search" aria-label="Shop products" className="flex gap-2"><input ref={input} type="search" aria-label="Search products" value={query} onChange={e => setQuery(e.target.value)} onFocus={() => setFocused(true)} onKeyDown={e => {if(e.key === "Escape") setFocused(false);}} placeholder="Find something you’ll love…" className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-base" /><button type="submit" disabled={pending} className="flex shrink-0 items-center gap-2 rounded-xl bg-[#D4450A] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">{pending ? <LoaderCircle size={17} className="animate-spin" aria-hidden /> : null}Search</button></form>
    {suggestions.length > 0 && <div className="absolute inset-x-0 top-full z-50 mt-3 overflow-hidden rounded-2xl border border-[#dce3d2] bg-[#fffefa] text-[#183d3d] shadow-2xl" aria-label="Suggested products"><p className="px-4 pt-4 pb-2 text-xs text-[#7b8a70]">A few matching finds</p>{suggestions.map(product => <Link key={product.id} href={`/products/${product.slug}`} onClick={() => setFocused(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-[#f1f5e8]"><div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#e9eddf]">{product.images[0] ? <Image src={product.images[0]} alt="" fill sizes="48px" className="object-cover" /> : <Package className="m-3" size={24} />}</div><span className="min-w-0 flex-1"><strong className="block truncate text-xs font-semibold">{product.name}</strong><span className="mt-1 block truncate text-[10px] text-[#738369]">{product.store.name}</span><span className="mt-1 block text-xs font-semibold text-[#d4450a]">{formatTTDPrice(product.price)}</span></span><ArrowUpRight size={15} aria-hidden /></Link>)}</div>}
  </div>;
}
