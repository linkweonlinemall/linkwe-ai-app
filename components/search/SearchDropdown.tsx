"use client";
import Link from "next/link";
import {ArrowUpRight,MapPin,Search,Store,Sparkles} from "lucide-react";
import {getRegionLabel} from "@/lib/regions/tt-regions";
import {formatTTDPrice} from "@/lib/format/price";
import type {UniversalSearchResponse} from "@/lib/search/types";
import s from "@/components/layout/main-search.module.css";
export default function SearchDropdown({query,results,isLoading,error,detectedRegion,onNavigate,selectedType="all"}:{query:string;results:UniversalSearchResponse|null;isLoading:boolean;error:string|null;detectedRegion:string|null;onNavigate?:()=>void;selectedType?:string}){
 const groups=[
 {label:"Products",rows:(results?.results.products??[]).map(p=>({id:p.id,title:p.name,href:`/products/${p.slug}`,image:p.images[0],detail:`${p.store.name} · ${getRegionLabel(p.store.region)}`,price:formatTTDPrice(p.price)}))},
 {label:"Services",rows:(results?.results.services??[]).map(p=>({id:p.id,title:p.title,href:`/service/${p.slug}`,image:p.images[0],detail:`${p.store.name} · ${getRegionLabel(p.store.region)}`,price:p.serviceType==="QUOTE"&&(p.quotePriceType==="FREE_QUOTE"||(!p.quotePriceType&&!p.price))?"Price on request":formatTTDPrice(p.price)}))},
 {label:"Stores",rows:(results?.results.stores??[]).map(p=>({id:p.id,title:p.name,href:`/store/${p.slug}`,image:p.logoUrl,detail:getRegionLabel(p.region),price:"Visit store"}))},
 {label:"Events & tickets",rows:(results?.results.events??[]).map(p=>({id:p.id,title:p.title,href:`/events/${p.slug}`,image:p.image,detail:`${p.storeName} · ${new Date(p.startDate).toLocaleDateString("en-TT",{day:"numeric",month:"short",timeZone:"America/Port_of_Spain"})}`,price:p.priceLabel}))},
 ];
 return <div className={s.suggestions} role="region" aria-label="Search suggestions" aria-busy={isLoading}>{detectedRegion&&<p className={s.location}><MapPin size={13}/>Looking around {getRegionLabel(detectedRegion)}</p>}{isLoading?<div className={s.suggestionLoading}>{[1,2,3].map(n=><span key={n}/>)}</div>:error?<p className={s.suggestionEmpty} role="alert">{error}</p>:<>{groups.filter(group=>group.rows.length).map(group=><section key={group.label}><h3>{group.label}<span>{group.rows.length} quick picks</span></h3>{group.rows.map(p=><Link key={p.id} href={p.href} onClick={onNavigate} className={s.suggestion}><span className={s.suggestionImage}>{p.image?<img src={p.image} alt=""/>:<Store size={19}/>}</span><span><strong>{p.title}</strong><small>{p.detail}</small></span><span className={s.suggestionPrice}>{p.price}<ArrowUpRight size={14}/></span></Link>)}</section>)}{results&&!results.results.total&&<div className={s.suggestionEmpty}><Search size={28}/><strong>No matches for “{query}” yet.</strong><span>Try another word or explore a different collection.</span></div>}<Link href={`/search?q=${encodeURIComponent(query)}${selectedType!=="all"?`&type=${selectedType}`:""}`} onClick={onNavigate} className={s.allResults}><Sparkles size={16}/><span>Explore all results{results?` · ${results.results.total}`:""}</span><ArrowUpRight size={17}/></Link></>}</div>;
}
