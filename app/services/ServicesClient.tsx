"use client";

import Link from "next/link";
import { useId, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownWideNarrow, Check, ChevronDown, ConciergeBell, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { DIRECTORY_LOCATIONS, DIRECTORY_SORTS, DIRECTORY_TYPES, type DirectoryQuery } from "@/lib/services/directory-query";
import type { DirectoryOptions } from "@/lib/services/directory";
import ServicesLaunchNotifyModal from "@/components/services/ServicesLaunchNotifyModal";
import base from "@/components/shop/shop.module.css";
import styles from "@/components/services/directory.module.css";

export function ServicesSearch({defaultValue}:{defaultValue:string}){
  const router=useRouter(),params=useSearchParams();
  const [query,setQuery]=useState(defaultValue),[pending,startTransition]=useTransition();
  return <form role="search" aria-label="Find a service" className={styles.search} onSubmit={event=>{event.preventDefault();const next=new URLSearchParams(params.toString());next.delete("page");if(query.trim())next.set("q",query.trim());else next.delete("q");startTransition(()=>router.push(`/services${next.size?`?${next}`:""}#service-results`,{scroll:false}));}}><Search size={19} aria-hidden/><input type="search" aria-label="Search services" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Photography, nails, home help…"/><button type="submit" disabled={pending}>{pending?"Finding…":"Search"}</button></form>;
}
export function ServicesEmpty({inventoryCount}:{inventoryCount:number}){
  const [notify,setNotify]=useState(false);
  return <><div className={base.empty}><ConciergeBell size={45} strokeWidth={1.3} aria-hidden/><h3>{inventoryCount?"Let’s find another match.":"Good people are on their way."}</h3><p>{inventoryCount?"Try a different search or clear a filter to explore more local talent.":"Service providers are joining LinkWe. Ask to hear when services become available."}</p>{inventoryCount?<Link href="/services#service-results">Explore all services</Link>:<button type="button" onClick={()=>setNotify(true)} className={styles.notify}>Notify me</button>}</div><ServicesLaunchNotifyModal open={notify} onClose={()=>setNotify(false)}/></>;
}
export default function ServicesClient({query,options,total,children}:{query:DirectoryQuery;options:DirectoryOptions;total:number;children:ReactNode}){
  const router=useRouter(),params=useSearchParams(),id=useId(),dialog=useRef<HTMLDialogElement>(null);
  const [draft,setDraft]=useState({category:query.category,serviceType:query.serviceType,region:query.region,location:query.location,pricing:query.pricing,minimumRating:String(query.minimumRating||""),minPrice:query.minPrice?.toString()??"",maxPrice:query.maxPrice?.toString()??""});
  const [pending,startTransition]=useTransition(),[error,setError]=useState("");
  const count=[query.category,query.serviceType,query.region,query.location,query.pricing,query.minimumRating,query.minPrice!==undefined||query.maxPrice!==undefined].filter(Boolean).length;
  function navigate(values:Record<string,string>){const next=new URLSearchParams(params.toString());next.delete("page");for(const [key,value] of Object.entries(values)){if(value)next.set(key,value);else next.delete(key);}dialog.current?.close();startTransition(()=>router.push(`/services${next.size?`?${next}`:""}#service-results`,{scroll:false}));}
  function reset(){navigate({category:"",serviceType:"",region:"",location:"",pricing:"",minimumRating:"",minPrice:"",maxPrice:""});}
  function fields(prefix:string){
    const select=(key:keyof typeof draft,label:string,values:{value:string;label:string}[],placeholder:string)=><label className={base.field} htmlFor={`${prefix}-${key}`}><span>{label}</span><div className={base.selectWrap}><select id={`${prefix}-${key}`} value={draft[key]} onChange={event=>setDraft({...draft,[key]:event.target.value})}><option value="">{placeholder}</option>{draft[key]&&!values.some(v=>v.value===draft[key])&&<option value={draft[key]}>{draft[key].replaceAll("_"," ")}</option>}{values.map(v=><option key={v.value} value={v.value}>{v.label}</option>)}</select><ChevronDown size={14} aria-hidden/></div></label>;
    return <form className={base.filterForm} onSubmit={event=>{event.preventDefault();if(draft.minPrice&&draft.maxPrice&&Number(draft.minPrice)>Number(draft.maxPrice)){setError("The maximum should be higher than the minimum.");return;}setError("");navigate(draft);}}>
      {select("category","Category",options.categories.map(c=>({value:c.value,label:`${c.label} (${c.count})` })),"Every kind of expertise")}
      {select("serviceType","How would you like to book?",DIRECTORY_TYPES,"Any service type")}
      {select("region","Provider’s area",options.regions,"Anywhere in T&T")}
      {select("location","Where it happens",DIRECTORY_LOCATIONS,"Any location")}
      {select("pricing","Pricing",[{value:"listed",label:"Has a listed fee"},{value:"quoted",label:"Price on request"}],"All pricing options")}
      <fieldset className={base.priceField}><legend>Listed fee <span>TTD</span></legend><div><label htmlFor={`${prefix}-min`}><span className="sr-only">Minimum price</span><input id={`${prefix}-min`} type="number" min="0" step="0.01" inputMode="decimal" placeholder="Min" value={draft.minPrice} onChange={event=>setDraft({...draft,minPrice:event.target.value})}/></label><span>—</span><label htmlFor={`${prefix}-max`}><span className="sr-only">Maximum price</span><input id={`${prefix}-max`} type="number" min="0" step="0.01" inputMode="decimal" placeholder="Max" value={draft.maxPrice} onChange={event=>setDraft({...draft,maxPrice:event.target.value})}/></label></div><p className={styles.feeHint}>Price filters apply to listed fees. Custom quotes are agreed with your provider.</p>{error&&<p role="alert" className={base.filterError}>{error}</p>}</fieldset>
      {select("minimumRating","Customer rating",[{value:"3",label:"3 stars & up"},{value:"4",label:"4 stars & up"},{value:"4.5",label:"4.5 stars & up"}],"Any rating")}
      <div className={base.filterActions}><button type="submit" disabled={pending}>{pending?"Updating…":"Apply filters"}<Check size={16} aria-hidden/></button><button type="button" onClick={reset} disabled={pending}><RotateCcw size={13} aria-hidden/>Reset filters</button></div>
    </form>;
  }
  return <div className={base.browseLayout} aria-busy={pending}><aside className={base.sidebar} aria-label="Service filters"><div className={base.filterHeading}><SlidersHorizontal size={18} aria-hidden/><div><h3>Your kind of expert.</h3><p>Find a service that fits.</p></div></div>{fields(`${id}-desktop`)}<div className={base.sidebarNote}><span>A LITTLE LOCAL KNOW-HOW</span><strong>Behind every skill,<br/>there’s a person.</strong><Link href="/stores">Get to know our stores ↗</Link></div></aside><div className={base.resultsColumn}><div className={base.toolbar}><button type="button" className={base.filterTrigger} onClick={()=>dialog.current?.showModal()} aria-haspopup="dialog"><SlidersHorizontal size={17} aria-hidden/>Filters{count>0&&<span>{count}</span>}</button><p className={base.resultCount} role="status">{pending?"Finding your matches…":`${total} ${total===1?"service":"services"} to explore`}</p><label className={base.sortLabel} htmlFor={`${id}-sort`}><ArrowDownWideNarrow size={17} aria-hidden/><span>Sort by</span><select id={`${id}-sort`} aria-label="Sort by" value={query.sort} disabled={pending} onChange={event=>navigate({sort:event.target.value==="featured"?"":event.target.value})}>{DIRECTORY_SORTS.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select><ChevronDown size={13} aria-hidden/></label></div><div className={base.resultsBody} data-pending={pending}>{children}</div></div><dialog ref={dialog} className={base.filterDialog} aria-labelledby={`${id}-title`} onClick={event=>{if(event.target===event.currentTarget){const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.current?.close();}}}><div className={base.dialogHeading}><div><span>FIND YOUR PERSON</span><h2 id={`${id}-title`}>Refine your services</h2></div><button type="button" aria-label="Close filters" onClick={()=>dialog.current?.close()}><X size={23} aria-hidden/></button></div>{fields(`${id}-mobile`)}</dialog></div>;
}
