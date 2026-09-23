import "server-only";
import { prisma } from "@/lib/prisma";
import { sellableStoreWhere } from "@/lib/store/sellable-store";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { directoryCategory, selectDirectory, type DirectoryQuery, type DirectoryService } from "./directory-query";

export async function getServiceDirectory(query:DirectoryQuery){
  const rows=await prisma.product.findMany({where:{isService:true,isPublished:true,isArchived:false,store:sellableStoreWhere()},select:{id:true,name:true,slug:true,price:true,images:true,category:true,serviceType:true,quotePriceType:true,serviceLocation:true,serviceDuration:true,durationMinutes:true,isFeatured:true,requiresDeposit:true,depositAmount:true,subscriptionInterval:true,responseTime:true,isAvailable:true,shortDescription:true,tags:true,sessionsIncluded:true,store:{select:{name:true,slug:true,region:true,logoUrl:true}}},orderBy:[{isFeatured:"desc"},{createdAt:"desc"}]});
  let services:DirectoryService[]=[];
  const preview=false;
  {
    const ratings=rows.length?await prisma.review.groupBy({by:["productId"],where:{productId:{in:rows.map(s=>s.id)}},_avg:{rating:true},_count:{rating:true}}):[];
    const byId=new Map(ratings.map(r=>[r.productId,r]));
    services=rows.map(s=>{const rating=byId.get(s.id);return {...s,reviewAvg:rating?._avg.rating??0,reviewCount:rating?._count.rating??0};});
  }
  const categoryCounts=new Map<string,number>();
  for(const service of services)if(service.category)categoryCounts.set(service.category,(categoryCounts.get(service.category)??0)+1);
  const options={categories:[...categoryCounts].map(([value,count])=>({value,count,label:directoryCategory(value)})).sort((a,b)=>b.count-a.count),regions:[...new Set(services.map(s=>s.store.region).filter((s):s is string=>!!s))].map(value=>({value,label:getRegionLabel(value)})).sort((a,b)=>a.label.localeCompare(b.label))};
  const photographed=services.filter(s=>s.images[0]);
  const seen=new Set<string>();
  const diverse=photographed.filter(s=>{if(seen.has(s.store.slug))return false;seen.add(s.store.slug);return true;});
  const highlights=[...new Map([...diverse,...photographed].map(s=>[s.id,s])).values()].slice(0,3);
  return {...selectDirectory(services,query),options,highlights,inventoryCount:services.length,preview};
}
export type DirectoryOptions=Awaited<ReturnType<typeof getServiceDirectory>>["options"];
