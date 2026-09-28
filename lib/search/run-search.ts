import type {Prisma} from "@prisma/client";
import {prisma} from "@/lib/prisma";
import {sellableStoreWhere} from "@/lib/store/sellable-store";
import {canonicalRegionValue} from "@/lib/regions/tt-regions";
import {canonicalStoreCategory} from "@/lib/catalog/categories";
import {COLOUR_OPTIONS,swatchPaint} from "@/lib/variant-options";
import {extractRegionFromQuery} from "@/lib/search/regions";
import {reviewStatsForProducts,reviewStatsForStores} from "@/lib/search/review-stats";
import {getEventOffer,eventDateRange} from "@/lib/events/directory-query";
import type {UniversalSearchResponse,SearchProductResult,SearchServiceResult,SearchStoreResult,SearchEventResult} from "./types";
export type SearchParams={q:string;region?:string;category?:string;type?:"all"|"products"|"services"|"stores"|"events";minPrice?:number;maxPrice?:number;rating?:number;page?:number;preview?:boolean;sort?:string;brand?:string;colour?:string;size?:string;condition?:string;inStock?:boolean;serviceType?:string;location?:string;date?:string;availability?:string};
const PAGE_SIZE=12;
export async function runUniversalSearch(params:SearchParams):Promise<UniversalSearchResponse>{
 const rawQ=params.q.trim().slice(0,160),parsed=extractRegionFromQuery(rawQ),region=params.region||parsed.detectedRegion||"",terms=parsed.searchTerms||(parsed.detectedRegion?"":rawQ),type=params.type??"all",sort=params.sort??"relevance";
 const productText:Prisma.ProductWhereInput=terms?{OR:[{name:{contains:terms,mode:"insensitive"}},{description:{contains:terms,mode:"insensitive"}},{shortDescription:{contains:terms,mode:"insensitive"}},{brand:{contains:terms,mode:"insensitive"}},{category:{contains:terms,mode:"insensitive"}},{store:{name:{contains:terms,mode:"insensitive"}}},{tags:{hasSome:terms.toLowerCase().split(/\s+/).slice(0,8)}}]}:{};
 const productWhere:Prisma.ProductWhereInput={isPublished:true,isArchived:false,store:sellableStoreWhere(),...productText,...(type==="products"?{isService:false}:type==="services"?{isService:true}:{})};
 const [inventoryRows,storeRows,eventRows]=await Promise.all([
  type==="all"||type==="products"||type==="services"?prisma.product.findMany({where:productWhere,select:{id:true,name:true,slug:true,price:true,images:true,category:true,brand:true,condition:true,stock:true,hasVariants:true,isService:true,isAvailable:true,isFeatured:true,createdAt:true,durationMinutes:true,serviceDuration:true,serviceType:true,serviceLocation:true,quotePriceType:true,store:{select:{name:true,slug:true,region:true}},variants:{select:{attributes:true,stock:true,price:true}}}}):[],
  type==="all"||type==="stores"?prisma.store.findMany({where:{...sellableStoreWhere(),AND:[{OR:[{products:{some:{isPublished:true,isArchived:false}}},{listings:{some:{status:"PUBLISHED"}}},{events:{some:{status:"PUBLISHED"}}}]},...(terms?[{OR:[{name:{contains:terms,mode:"insensitive" as const}},{description:{contains:terms,mode:"insensitive" as const}},{categoryId:{contains:terms,mode:"insensitive" as const}},{tags:{hasSome:terms.toLowerCase().split(/\s+/)}}]}]:[])]},select:{id:true,name:true,slug:true,logoUrl:true,coverPhotoUrl:true,categoryId:true,region:true,tags:true,createdAt:true,_count:{select:{products:{where:{isPublished:true,isArchived:false,isService:false}}}}}}):[],
  type==="all"||type==="events"?prisma.event.findMany({where:{status:"PUBLISHED",store:sellableStoreWhere(),...(terms?{OR:[{title:{contains:terms,mode:"insensitive"}},{description:{contains:terms,mode:"insensitive"}},{venueName:{contains:terms,mode:"insensitive"}},{store:{name:{contains:terms,mode:"insensitive"}}}]}:{})},select:{id:true,title:true,slug:true,category:true,region:true,coverImage:true,isOnline:true,startDate:true,endDate:true,isFeatured:true,store:{select:{name:true}},ticketTypes:{select:{price:true,quantity:true,quantitySold:true,isVisible:true,saleStartDate:true,saleEnds:true}}}}):[],
 ]);
 const [reviews,storeReviews]=await Promise.all([reviewStatsForProducts(inventoryRows.map(p=>p.id)),reviewStatsForStores(storeRows.map(p=>p.id))]);
 const normal=(value:string|null|undefined)=>(value??"").trim().toLowerCase();
 const attributes=(value:unknown):{name:string;value:string;hex?:string}[]=>Array.isArray(value)?value.filter((a):a is {name:string;value:string;hex?:string}=>!!a&&typeof a==="object"&&"name"in a&&"value"in a&&typeof a.name==="string"&&typeof a.value==="string"):[];
 const inventory=inventoryRows.map(p=>{
  if(p.isService||!p.hasVariants||!p.variants.length)return {...p,priceFrom:false};
  const candidates=p.variants.filter(v=>{const a=attributes(v.attributes);return (!params.inStock||v.stock===null||v.stock>0)&&(!params.colour||a.some(x=>["colour","color"].includes(normal(x.name))&&normal(x.value)===normal(params.colour)))&&(!params.size||a.some(x=>normal(x.name)==="size"&&normal(x.value)===normal(params.size)));});
  const prices=candidates.map(v=>v.price??p.price);
  return {...p,price:prices.length?Math.min(...prices):p.price,priceFrom:new Set(prices).size>1};
 });
 const colourMap=new Map<string,string>(),sizes=new Set<string>(),brands=new Set<string>();
 for(const p of inventory.filter(p=>!p.isService)){if(p.brand)brands.add(p.brand);for(const variant of p.variants)for(const a of attributes(variant.attributes)){if(["colour","color"].includes(normal(a.name)))colourMap.set(normal(a.value),swatchPaint(a.value,a.hex));if(normal(a.name)==="size")sizes.add(a.value);}}
 const min=params.minPrice,max=params.maxPrice;
 const fitsPrice=(price:number|null)=>((min===undefined&&max===undefined)||(price!==null&&(min===undefined||price>=min)&&(max===undefined||price<=max)));
 const productFiltered=inventory.filter(p=>{
  if(region&&canonicalRegionValue(p.store.region)!==canonicalRegionValue(region))return false;
  if(params.category&&normal(p.category)!==normal(params.category))return false;
  if(params.rating&&(reviews.get(p.id)?.average??0)<params.rating)return false;
  const quoteOnly=p.isService&&p.serviceType==="QUOTE"&&(p.quotePriceType==="FREE_QUOTE"||(!p.quotePriceType&&p.price===0));
  if(!fitsPrice(quoteOnly?null:p.price))return false;
  if(p.isService){if(params.serviceType&&p.serviceType!==params.serviceType)return false;if(params.location&&(p.serviceType==="VIRTUAL"?"VIRTUAL":p.serviceLocation)!==params.location)return false;return p.isAvailable;}
  if(params.brand&&normal(p.brand)!==normal(params.brand)||params.condition&&p.condition!==params.condition)return false;
  if(params.colour||params.size){if(!p.variants.some(v=>{const attrs=attributes(v.attributes);return (!params.inStock||v.stock===null||v.stock>0)&&(!params.colour||attrs.some(a=>["colour","color"].includes(normal(a.name))&&normal(a.value)===normal(params.colour)))&&(!params.size||attrs.some(a=>normal(a.name)==="size"&&normal(a.value)===normal(params.size)));}))return false;}
  if(params.inStock&&!(p.hasVariants?p.variants.some(v=>v.stock===null||v.stock>0):p.stock===null||p.stock>0))return false;
  return true;
 });
 const orderProducts=(a:typeof inventory[number],b:typeof inventory[number])=>{let diff=0;if(sort==="price_asc"||sort==="price_desc")diff=(a.price-b.price)*(sort==="price_asc"?1:-1);else if(sort==="name")diff=a.name.localeCompare(b.name);else if(sort==="rating")diff=(reviews.get(b.id)?.average??0)-(reviews.get(a.id)?.average??0);else if(sort==="newest")diff=b.createdAt.getTime()-a.createdAt.getTime();else diff=Number(b.isFeatured)-Number(a.isFeatured)||(reviews.get(b.id)?.average??0)-(reviews.get(a.id)?.average??0);return diff||a.id.localeCompare(b.id);};
 const products=productFiltered.filter(p=>!p.isService).sort(orderProducts),services=productFiltered.filter(p=>p.isService).sort(orderProducts);
 const stores=storeRows.filter(p=>(!region||canonicalRegionValue(p.region)===canonicalRegionValue(region))&&(!params.category||canonicalStoreCategory(p.categoryId)===canonicalStoreCategory(params.category))&&(!params.rating||(storeReviews.get(p.id)?.average??0)>=params.rating)).sort((a,b)=>{const diff=sort==="name"?a.name.localeCompare(b.name):sort==="newest"?b.createdAt.getTime()-a.createdAt.getTime():(storeReviews.get(b.id)?.average??0)-(storeReviews.get(a.id)?.average??0);return diff||a.id.localeCompare(b.id);});
 const range=eventDateRange(params.date??"upcoming");
 const events=eventRows.map(e=>({...e,offer:getEventOffer(e)})).filter(e=>(!region||canonicalRegionValue(e.region??"")===canonicalRegionValue(region))&&(!params.category||e.category===params.category)&&(params.date!=="past"||!e.endDate||e.endDate<=new Date())&&(!range.start||e.startDate>=range.start)&&(!range.end||e.startDate<=range.end)&&(!params.availability||e.offer.state===params.availability)&&fitsPrice(e.offer.price)).sort((a,b)=>{let diff=0;if(sort==="name")diff=a.title.localeCompare(b.title);else if(sort==="price_asc"||sort==="price_desc"){if(a.offer.price===null&&b.offer.price!==null)return 1;if(b.offer.price===null&&a.offer.price!==null)return -1;diff=((a.offer.price??0)-(b.offer.price??0))*(sort==="price_asc"?1:-1);}else diff=a.startDate.getTime()-b.startDate.getTime();return diff||a.id.localeCompare(b.id);});
 const counts={products:products.length,services:services.length,stores:stores.length,events:events.length},pages=Math.max(1,Math.ceil(Math.max(...Object.values(counts))/PAGE_SIZE)),page=Math.min(pages,Math.max(1,Math.floor(params.page??1)||1));
 const slice=<T,>(rows:T[],previewLimit:number)=>params.preview?rows.slice(0,previewLimit):rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
 const review=(id:string,map=reviews)=>({averageRating:map.get(id)?.average??null,reviewCount:map.get(id)?.count??0});
 const productResults:SearchProductResult[]=slice(products,3).map(p=>({type:"product",isService:false,id:p.id,name:p.name,slug:p.slug,price:p.price,priceFrom:p.priceFrom,images:p.images,category:p.category,store:p.store,...review(p.id)}));
 const serviceResults:SearchServiceResult[]=slice(services,2).map(p=>({type:"service",id:p.id,title:p.name,slug:p.slug,price:p.price,images:p.images,category:p.category,store:p.store,durationMinutes:p.durationMinutes||p.serviceDuration||0,serviceType:p.serviceType,serviceLocation:p.serviceLocation,quotePriceType:p.quotePriceType,...review(p.id)}));
 const storeResults:SearchStoreResult[]=slice(stores,2).map(p=>({type:"store",id:p.id,name:p.name,slug:p.slug,logoUrl:p.logoUrl,coverPhotoUrl:p.coverPhotoUrl,category:canonicalStoreCategory(p.categoryId),region:p.region,tags:p.tags,productCount:p._count.products,...review(p.id,storeReviews)}));
 const eventResults:SearchEventResult[]=slice(events,2).map(e=>({type:"event",id:e.id,title:e.title,slug:e.slug,image:e.coverImage,region:e.region,startDate:e.startDate.toISOString(),isOnline:e.isOnline,category:e.category,price:e.offer.price,priceLabel:e.offer.label,availability:e.offer.state,storeName:e.store.name}));
 return {query:rawQ,detectedRegion:parsed.detectedRegion,page,pages,facets:{brands:[...brands].sort(),sizes:[...sizes].sort(),colours:[...colourMap].map(([value,hex])=>({value,hex}))},results:{products:productResults,services:serviceResults,stores:storeResults,events:eventResults,total:Object.values(counts).reduce((a,b)=>a+b,0)},counts};
}
