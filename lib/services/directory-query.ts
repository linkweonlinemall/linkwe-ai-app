import type { Product } from "@prisma/client";
import { getServiceCategoryLabel } from "@/lib/categories";

export const SERVICE_PAGE_SIZE = 18;
export const DIRECTORY_TYPES = [
  { value:"BOOKABLE", label:"Book a time", detail:"Appointments that fit your day" },
  { value:"QUOTE", label:"Get a quote", detail:"Something made around you" },
  { value:"SUBSCRIPTION", label:"Make it regular", detail:"Ongoing services & plans" },
  { value:"ON_DEMAND", label:"Request a service", detail:"Send a request to a provider" },
  { value:"VIRTUAL", label:"Meet online", detail:"Connect from wherever you are" },
];
export const DIRECTORY_SORTS = [
  {value:"featured",label:"Recommended"},{value:"rating",label:"Customer rating"},
  {value:"price_asc",label:"Price: low to high"},{value:"price_desc",label:"Price: high to low"},
  {value:"name",label:"Name: A to Z"},{value:"name_desc",label:"Name: Z to A"},{value:"duration",label:"Shortest session"},
];
export const DIRECTORY_LOCATIONS = [
  {value:"AT_CUSTOMER",label:"At my location"},{value:"AT_VENDOR",label:"At the provider"},
  {value:"FLEXIBLE",label:"Flexible location"},{value:"VIRTUAL",label:"Online"},
];
export type DirectoryService = Pick<Product,"id"|"name"|"slug"|"price"|"images"|"category"|"serviceType"|"quotePriceType"|"serviceLocation"|"serviceDuration"|"durationMinutes"|"isFeatured"|"requiresDeposit"|"depositAmount"|"subscriptionInterval"|"responseTime"|"isAvailable"|"shortDescription"|"tags"|"sessionsIncluded"> & {
  store:{name:string;slug:string;region:string|null;logoUrl:string|null};
  reviewAvg:number;reviewCount:number;preview?:boolean;
};
export type DirectoryParams = Record<string,string|string[]|undefined>;
export function parseDirectoryQuery(params:DirectoryParams) {
  const text=(key:string)=>(Array.isArray(params[key])?params[key][0]:params[key])?.trim()??"";
  const selection=(key:string,values:string[])=>values.includes(text(key))?text(key):"";
  const price=(key:string)=>{const raw=text(key),value=Number(raw);return raw&&Number.isFinite(value)&&value>=0?value:undefined;};
  let minPrice=price("minPrice"),maxPrice=price("maxPrice");
  if(minPrice!==undefined&&maxPrice!==undefined&&minPrice>maxPrice)[minPrice,maxPrice]=[maxPrice,minPrice];
  return {q:text("q"),category:text("category")==="all"?"":text("category"),region:text("region")==="all"?"":text("region"),serviceType:selection("serviceType",DIRECTORY_TYPES.map(t=>t.value)),location:selection("location",DIRECTORY_LOCATIONS.map(l=>l.value)),sort:selection("sort",DIRECTORY_SORTS.map(s=>s.value))||"featured",minPrice,maxPrice,minimumRating:[3,4,4.5].includes(Number(text("minimumRating")))?Number(text("minimumRating")):0,pricing:selection("pricing",["quoted","listed"]),page:Math.min(100000,Math.max(1,Math.floor(Number(text("page")))||1))};
}
export type DirectoryQuery=ReturnType<typeof parseDirectoryQuery>;
export function directoryHref(params:DirectoryParams,overrides:Record<string,string|undefined>={}){
  const query=new URLSearchParams();
  for(const [key,value] of Object.entries(params)){const v=Array.isArray(value)?value[0]:value;if(v)query.set(key,v);}
  for(const [key,value] of Object.entries(overrides)){if(value)query.set(key,value);else query.delete(key);}
  return `/services${query.size?`?${query}`:""}#service-results`;
}
export function directoryCategory(value:string){const label=getServiceCategoryLabel(value);return label.charAt(0).toUpperCase()+label.slice(1);}
export function hasListedFee(service:DirectoryService){return service.serviceType!=="QUOTE" || (service.quotePriceType!=="FREE_QUOTE" && (service.quotePriceType==="CALLOUT_FEE"||service.quotePriceType==="STARTING_FROM"||service.price>0));}
export function directoryDuration(service:DirectoryService){return service.serviceType==="BOOKABLE"||service.serviceType==="VIRTUAL" ? service.durationMinutes||service.serviceDuration||null : service.serviceDuration;}
export function directoryLocation(service:DirectoryService){return service.serviceType==="VIRTUAL"?"VIRTUAL":service.serviceLocation;}
export function selectDirectory(services:DirectoryService[],query:DirectoryQuery){
  const filtered=services.filter(service=>{
    if(query.q && !`${service.name} ${service.store.name} ${service.shortDescription??""} ${service.tags.join(" ")}`.toLowerCase().includes(query.q.toLowerCase()))return false;
    if(query.category&&service.category!==query.category)return false;
    if(query.serviceType&&service.serviceType!==query.serviceType)return false;
    if(query.region&&service.store.region!==query.region)return false;
    if(query.location&&directoryLocation(service)!==query.location)return false;
    if(query.minimumRating&&(service.reviewCount===0||service.reviewAvg<query.minimumRating))return false;
    const listed=hasListedFee(service);
    if(query.pricing==="quoted"&&listed || query.pricing==="listed"&&!listed)return false;
    if(query.minPrice!==undefined||query.maxPrice!==undefined){if(!listed)return false;if(query.minPrice!==undefined&&service.price<query.minPrice)return false;if(query.maxPrice!==undefined&&service.price>query.maxPrice)return false;}
    return true;
  }).sort((a,b)=>{
    let difference=0;
    if(query.sort==="price_asc"||query.sort==="price_desc"){
      const listedA=hasListedFee(a),listedB=hasListedFee(b);if(listedA!==listedB)return listedA?-1:1;
      difference=listedA?(a.price-b.price)*(query.sort==="price_asc"?1:-1):0;
    }else if(query.sort==="name"||query.sort==="name_desc")difference=a.name.localeCompare(b.name)*(query.sort==="name"?1:-1);
    else if(query.sort==="duration")difference=(directoryDuration(a)??Number.MAX_SAFE_INTEGER)-(directoryDuration(b)??Number.MAX_SAFE_INTEGER);
    else if(query.sort==="rating")difference=b.reviewAvg-a.reviewAvg||b.reviewCount-a.reviewCount;
    else difference=Number(b.isFeatured)-Number(a.isFeatured)||(b.reviewAvg*Math.min(b.reviewCount,12))-(a.reviewAvg*Math.min(a.reviewCount,12))||b.reviewCount-a.reviewCount;
    return difference||a.name.localeCompare(b.name)||a.id.localeCompare(b.id);
  });
  const total=filtered.length,pages=Math.max(1,Math.ceil(total/SERVICE_PAGE_SIZE)),page=Math.min(query.page,pages);
  return {services:filtered.slice((page-1)*SERVICE_PAGE_SIZE,page*SERVICE_PAGE_SIZE),total,pages,page};
}
