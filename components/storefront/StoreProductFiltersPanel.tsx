"use client";
import {ColourSwatches,FilterSelect,FilterChoices} from "@/components/filters/FilterControls";
import {getProductCategoryLabel} from "@/lib/categories";

type Props = {
  search: string;
  setSearch: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  categories: string[];
  priceMin: string;
  setPriceMin: (v: string) => void;
  priceMax: string;
  setPriceMax: (v: string) => void;
  inStockOnly: boolean;
  setInStockOnly: (v: boolean | ((prev: boolean) => boolean)) => void;
  onClear: () => void;
  colour: string;
  setColour: (v: string) => void;
  size: string;
  setSize: (v: string) => void;
  availableColours: { value: string; hex: string }[];
  availableSizes: string[];
};

export default function StoreProductFiltersPanel({
  search,
  setSearch,
  sortBy,
  setSortBy,
  category,
  setCategory,
  categories,
  priceMin,
  setPriceMin,
  priceMax,
  setPriceMax,
  inStockOnly,
  setInStockOnly,
  onClear,
  colour,
  setColour,
  size,
  setSize,
  availableColours,
  availableSizes,
}: Props) {
  return <section className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm" aria-label="Store product filters">
    <header className="flex items-center justify-between border-t-4 border-[#e07838] bg-[#173f58] px-5 py-5"><div><h3 className="text-sm font-bold text-white">Make it your find.</h3><p className="mt-1 text-xs text-sky-100/75">Refine this store’s collection.</p></div><button type="button" onClick={onClear} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white">Clear all</button></header>
    <div className="grid gap-5 p-5"><label className="grid gap-2 text-xs font-bold text-[#284f65]">Search this store<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name or product category…" className="min-h-11 min-w-0 rounded-xl border border-sky-100 bg-slate-50 px-3 text-sm font-normal"/></label>
    <FilterSelect label="Category" value={category==="All"?"":category} options={categories.filter(c=>c!=="All").map(value=>({value,label:getProductCategoryLabel(value)}))} onChange={v=>setCategory(v||"All")} placeholder="All categories"/>
    <FilterSelect label="Sort products" value={sortBy==="default"?"":sortBy} options={[{value:"price_asc",label:"Price: low to high"},{value:"price_desc",label:"Price: high to low"},{value:"name",label:"Name: A to Z"},{value:"name_desc",label:"Name: Z to A"},{value:"newest",label:"Newest first"},{value:"stock",label:"Most in stock"}]} onChange={v=>setSortBy(v||"default")} placeholder="Recommended"/>
    {availableColours.length>0&&<ColourSwatches value={colour} options={availableColours} onChange={setColour}/>}
    {availableSizes.length>0&&<FilterChoices label="Size" value={size} options={availableSizes.map(value=>({value,label:value}))} onChange={setSize}/>}
    <fieldset><legend className="mb-2 text-xs font-bold text-[#284f65]">Price range · TTD</legend><div className="flex items-center gap-2"><input aria-label="Minimum product price" type="number" min="0" step="0.01" value={priceMin} onChange={e=>setPriceMin(e.target.value)} placeholder="Min" className="min-w-0 w-full rounded-xl border border-sky-100 bg-slate-50 px-3 py-3 text-sm"/><span>–</span><input aria-label="Maximum product price" type="number" min="0" step="0.01" value={priceMax} onChange={e=>setPriceMax(e.target.value)} placeholder="Max" className="min-w-0 w-full rounded-xl border border-sky-100 bg-slate-50 px-3 py-3 text-sm"/></div>{priceMin&&priceMax&&Number(priceMin)>Number(priceMax)&&<p role="alert" className="mt-2 text-xs text-orange-800">Set a maximum that is at least the minimum.</p>}</fieldset>
    <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={inStockOnly} onChange={e=>setInStockOnly(e.target.checked)} className="size-4 accent-[#d1551c]"/>In stock only</label><p className="text-xs leading-5 text-slate-500">Results update as you refine.</p></div>
  </section>;
}
