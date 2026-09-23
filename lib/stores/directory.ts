import "server-only";
import { prisma } from "@/lib/prisma";
import { sellableStoreWhere } from "@/lib/store/sellable-store";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { parseStoreQuery, selectStores, storeCategory, storeRegion, type DirectoryStore, type StoreQuery } from "./directory-query";

export async function getStoreDirectory(query:StoreQuery){
  const rows=await prisma.store.findMany({where:{...sellableStoreWhere(),OR:[{products:{some:{isPublished:true,isArchived:false}}},{listings:{some:{status:"PUBLISHED"}}},{events:{some:{status:"PUBLISHED"}}}]},select:{id:true,slug:true,name:true,tagline:true,description:true,coverPhotoUrl:true,logoUrl:true,categoryId:true,region:true,tags:true,latitude:true,longitude:true,createdAt:true,products:{where:{isPublished:true,isArchived:false},select:{isService:true}},_count:{select:{listings:{where:{status:"PUBLISHED"}},events:{where:{status:"PUBLISHED"}}}}}});
  let inventory:DirectoryStore[]=[];
  const preview=false;
  {
    const ids=rows.map(s=>s.id);
    // A review connected to both a legacy listing and its store is counted once.
    const reviews=ids.length?await prisma.review.findMany({where:{OR:[{storeId:{in:ids},productId:null},{listing:{storeId:{in:ids}}}]},select:{rating:true,storeId:true,listing:{select:{storeId:true}}}}):[];
    const stats=new Map<string,{sum:number;count:number}>();
    for(const r of reviews){const id=r.listing?.storeId??r.storeId;if(!id)continue;const current=stats.get(id)??{sum:0,count:0};stats.set(id,{sum:current.sum+r.rating,count:current.count+1});}
    inventory=rows.map(({products,_count,...store})=>{const rating=stats.get(store.id),productCount=products.filter(p=>!p.isService).length,serviceCount=products.filter(p=>p.isService).length;return {...store,description:store.description?.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim()??null,productCount,serviceCount,eventCount:_count.events,listingCount:_count.listings,offers:[...(productCount?["products"]:[]),...(serviceCount?["services"]:[]),...(_count.events?["events"]:[])],reviewCount:rating?.count??0,averageRating:rating?rating.sum/rating.count:null,distanceKm:null};});
  }
  const categories=new Map<string,number>(),tags=new Map<string,string>();
  for(const s of inventory){categories.set(s.categoryId,(categories.get(s.categoryId)??0)+1);for(const t of s.tags)if(t.trim())tags.set(t.toLowerCase(),t);}
  const options={categories:[...categories].map(([value,count])=>({value,count,label:storeCategory(value)})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label)),regions:[...new Set(inventory.map(s=>storeRegion(s.region)).filter(Boolean))].map(value=>({value,label:getRegionLabel(value)})).sort((a,b)=>a.label.localeCompare(b.label)),tags:[...tags.values()].sort((a,b)=>a.localeCompare(b))};
  const ranked=selectStores(inventory,parseStoreQuery({})).matches.filter(s=>s.coverPhotoUrl);
  const seen=new Set<string>(),diverse=ranked.filter(s=>{if(seen.has(s.categoryId))return false;seen.add(s.categoryId);return true;});
  return {...selectStores(inventory,query),options,highlights:[...new Map([...diverse,...ranked].map(s=>[s.id,s])).values()].slice(0,3),inventoryCount:inventory.length,preview};
}
export type StoreDirectoryOptions=Awaited<ReturnType<typeof getStoreDirectory>>["options"];
