"use client";
import {FilterSelect} from "@/components/filters/FilterControls";
import {getServiceCategoryLabel} from "@/lib/categories";

const SERVICE_TYPE_FILTERS = [
  { value: "All", label: "All types" },
  { value: "BOOKABLE", label: "Bookable" },
  { value: "QUOTE", label: "Quote" },
  { value: "ON_DEMAND", label: "On Demand" },
  { value: "SUBSCRIPTION", label: "Subscription" },
  { value: "VIRTUAL", label: "Virtual" },
] as const;

type Props = {
  serviceSearch: string;
  setServiceSearch: (v: string) => void;
  serviceSort: string;
  setServiceSort: (v: string) => void;
  serviceType: string;
  setServiceType: (v: string) => void;
  servicePriceMin: string;
  setServicePriceMin: (v: string) => void;
  servicePriceMax: string;
  setServicePriceMax: (v: string) => void;
  serviceLocation: string;
  setServiceLocation: (v: string) => void;
  serviceCategory: string;
  setServiceCategory: (v: string) => void;
  categories: string[];
  onClear: () => void;
};

export default function StoreServiceFiltersPanel({
  serviceSearch,
  setServiceSearch,
  serviceSort,
  setServiceSort,
  serviceType,
  setServiceType,
  servicePriceMin,
  setServicePriceMin,
  servicePriceMax,
  setServicePriceMax,
  serviceLocation,
  setServiceLocation,
  serviceCategory,
  setServiceCategory,
  categories,
  onClear,
}: Props) {
  return <section className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm" aria-label="Store service filters"><header className="flex items-center justify-between border-t-4 border-[#e07838] bg-[#173f58] px-5 py-5"><div><h3 className="text-sm font-bold text-white">Find your kind of expert.</h3><p className="mt-1 text-xs text-sky-100/75">A service that fits your day.</p></div><button type="button" onClick={onClear} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white">Clear all</button></header>
  <div className="grid gap-5 p-5"><label className="grid gap-2 text-xs font-bold text-[#284f65]">Search services<input type="search" value={serviceSearch} onChange={e=>setServiceSearch(e.target.value)} placeholder="What do you need help with?" className="min-h-11 min-w-0 rounded-xl border border-sky-100 bg-slate-50 px-3 text-sm font-normal"/></label>
  <FilterSelect label="Category" value={serviceCategory==="All"?"":serviceCategory} options={categories.filter(c=>c!=="All").map(value=>({value,label:getServiceCategoryLabel(value)}))} onChange={v=>setServiceCategory(v||"All")} placeholder="Every kind of expertise"/>
  <FilterSelect label="How to book" value={serviceType==="All"?"":serviceType} options={SERVICE_TYPE_FILTERS.filter(t=>t.value!=="All")} onChange={v=>setServiceType(v||"All")} placeholder="All service types"/>
  <FilterSelect label="Where it happens" value={serviceLocation==="All"?"":serviceLocation} options={[{value:"AT_VENDOR",label:"At the provider"},{value:"AT_CUSTOMER",label:"At your location"},{value:"FLEXIBLE",label:"Flexible location"},{value:"VIRTUAL",label:"Online"}]} onChange={v=>setServiceLocation(v||"All")} placeholder="Any location"/>
  <FilterSelect label="Sort services" value={serviceSort==="default"?"":serviceSort} options={[{value:"price_asc",label:"Price: low to high"},{value:"price_desc",label:"Price: high to low"},{value:"name",label:"Name: A to Z"},{value:"name_desc",label:"Name: Z to A"},{value:"duration",label:"Shortest session"}]} onChange={v=>setServiceSort(v||"default")} placeholder="Recommended"/>
  <fieldset><legend className="mb-2 text-xs font-bold text-[#284f65]">Listed fee · TTD</legend><div className="flex items-center gap-2"><input aria-label="Minimum service price" type="number" min="0" step="0.01" value={servicePriceMin} onChange={e=>setServicePriceMin(e.target.value)} placeholder="Min" className="min-w-0 w-full rounded-xl border border-sky-100 bg-slate-50 px-3 py-3 text-sm"/><span>–</span><input aria-label="Maximum service price" type="number" min="0" step="0.01" value={servicePriceMax} onChange={e=>setServicePriceMax(e.target.value)} placeholder="Max" className="min-w-0 w-full rounded-xl border border-sky-100 bg-slate-50 px-3 py-3 text-sm"/></div>{servicePriceMin&&servicePriceMax&&Number(servicePriceMin)>Number(servicePriceMax)&&<p role="alert" className="mt-2 text-xs text-orange-800">Set a maximum that is at least the minimum.</p>}<p className="mt-3 text-xs leading-5 text-slate-500">Price filters use listed fees. Custom quotes are agreed with the provider.</p></fieldset><p className="text-xs text-slate-500">Results update as you refine.</p></div></section>;
}
