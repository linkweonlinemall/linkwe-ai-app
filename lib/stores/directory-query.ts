import { STORE_CATEGORIES } from "@/lib/categories";

export const STORE_PAGE_SIZE = 12;
export const STORE_SORTS = [{value:"recommended",label:"Recommended"},{value:"newest",label:"Newest stores"},{value:"popular",label:"Most to explore"},{value:"rating",label:"Highest rated"},{value:"nearest",label:"Nearest to me"},{value:"name",label:"Name: A to Z"}];
export const STORE_KINDS = [{value:"products",label:"Shop products"},{value:"services",label:"Find a service"},{value:"events",label:"Discover events"}];
export type StoreParams = Record<string,string|string[]|undefined>;
export type StoreQuery = {q:string;category:string;region:string;tag:string;kind:string;sort:string;page:number;lat:number|null;lng:number|null};
export type DirectoryStore = {id:string;slug:string;name:string;tagline:string|null;description:string|null;coverPhotoUrl:string|null;logoUrl:string|null;categoryId:string;region:string;tags:string[];latitude:number|null;longitude:number|null;createdAt:Date;productCount:number|null;serviceCount:number|null;eventCount:number|null;listingCount:number|null;reviewCount:number;averageRating:number|null;distanceKm:number|null;offers:string[];preview?:boolean};
export const storeRegion = (value:string) => value.trim().replaceAll("_"," ").toLowerCase().replace(/\s+/g," ");
const LEGACY_CATEGORIES:Record<string,string>={beauty_cosmetics:"Beauty & Cosmetics",photography_media:"Photography & Media",fashion_clothing:"Fashion & Clothing",health_pharmacy:"Health & Pharmacy",fast_food_takeaway:"Fast Food & Takeaway",music_entertainment:"Music & Entertainment"};
export function storeCategory(value:string){return LEGACY_CATEGORIES[value] ?? STORE_CATEGORIES.find(c=>c.value===value)?.label ?? value.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());}
export function validCoordinates(lat:unknown,lng:unknown):boolean{return typeof lat==="number"&&Number.isFinite(lat)&&Math.abs(lat)<=90&&typeof lng==="number"&&Number.isFinite(lng)&&Math.abs(lng)<=180;}
export function parseStoreQuery(params:StoreParams):StoreQuery{
  const pick=(key:string)=>{const value=params[key];return (Array.isArray(value)?value[0]:value)?.trim().slice(0,200)??"";};
  const lat=pick("lat")?Number(pick("lat")):null,lng=pick("lng")?Number(pick("lng")):null;
  const page=Number(pick("page"));
  return {q:pick("q"),category:pick("category")==="all"?"":pick("category"),region:storeRegion(pick("region")),tag:pick("tag"),kind:STORE_KINDS.some(k=>k.value===pick("kind"))?pick("kind"):"",sort:STORE_SORTS.some(s=>s.value===pick("sort"))?pick("sort"):"recommended",page:Number.isFinite(page)?Math.min(100000,Math.max(1,Math.floor(page))):1,lat:validCoordinates(lat,lng)?lat:null,lng:validCoordinates(lat,lng)?lng:null};
}
export function storesHref(params:StoreParams,updates:Record<string,string|undefined>={}){const next=new URLSearchParams();for(const [key,raw] of Object.entries({...params,...updates})){const value=Array.isArray(raw)?raw[0]:raw;if(value&&!(key==="page"&&value==="1"))next.set(key,value);}return "/stores"+(next.size?"?"+next:"")+"#store-results";}
export function storeHref(store:Pick<DirectoryStore,"slug"|"preview">){return (store.preview?"https://www.linkweonlinemall.com":"")+"/store/"+store.slug;}
export function storeDistance(lat:number,lng:number,storeLat:number,storeLng:number){const rad=(x:number)=>x*Math.PI/180;const a=Math.sin(rad(storeLat-lat)/2)**2+Math.cos(rad(lat))*Math.cos(rad(storeLat))*Math.sin(rad(storeLng-lng)/2)**2;return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));}
export function selectStores(inventory:DirectoryStore[],query:StoreQuery){
  const stores=inventory.filter(s=>(!query.q||[s.name,s.tagline,s.description,s.region,storeCategory(s.categoryId),...s.tags].join(" ").toLowerCase().includes(query.q.toLowerCase()))&&(!query.category||s.categoryId===query.category)&&(!query.region||storeRegion(s.region)===query.region)&&(!query.tag||s.tags.some(t=>t.toLowerCase()===query.tag.toLowerCase()))&&(!query.kind||s.offers.includes(query.kind))).map(s=>({...s,distanceKm:validCoordinates(query.lat,query.lng)&&validCoordinates(s.latitude,s.longitude)?storeDistance(query.lat!,query.lng!,s.latitude!,s.longitude!):null}));
  const count=(s:DirectoryStore)=>(s.productCount??0)+(s.serviceCount??0)+(s.eventCount??0)+(s.listingCount??0);
  const score=(s:DirectoryStore)=>(s.averageRating??0)*Math.min(s.reviewCount,12)*5+[s.logoUrl,s.coverPhotoUrl,s.tagline,s.description].filter(Boolean).length*4+Math.min(count(s),20);
  stores.sort((a,b)=>{
    let difference=0;
    if(query.sort==="rating")difference=(b.averageRating??0)-(a.averageRating??0)||b.reviewCount-a.reviewCount;
    else if(query.sort==="popular")difference=count(b)-count(a);
    else if(query.sort==="name")difference=a.name.localeCompare(b.name);
    else if(query.sort==="newest")difference=b.createdAt.getTime()-a.createdAt.getTime();
    else if(query.sort==="nearest"&&validCoordinates(query.lat,query.lng))difference=(a.distanceKm??Infinity)-(b.distanceKm??Infinity);
    else difference=score(b)-score(a);
    return difference||a.name.localeCompare(b.name)||a.id.localeCompare(b.id);
  });
  const total=stores.length,pages=Math.max(1,Math.ceil(total/STORE_PAGE_SIZE)),page=Math.min(query.page,pages);
  return {stores:stores.slice((page-1)*STORE_PAGE_SIZE,page*STORE_PAGE_SIZE),matches:stores,total,page,pages};
}
