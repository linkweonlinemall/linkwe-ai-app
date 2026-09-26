import type { Prisma } from "@prisma/client";
export type ReviewFilter={type?:"product"|"service"|"store"|"all";rating?:number;unanswered?:boolean;search?:string;skip?:number;take?:number};
export function vendorReviewWhere(storeId:string,filter:ReviewFilter={}):Prisma.ReviewWhereInput{
 const ownership:Prisma.ReviewWhereInput={OR:[{product:{storeId}},{storeId},{booking:{product:{storeId}}}]};
 const type:Prisma.ReviewWhereInput=filter.type==="store"?{storeId}:filter.type==="service"?{storeId:null,OR:[{bookingId:{not:null}},{product:{isService:true}}]}:filter.type==="product"?{storeId:null,bookingId:null,product:{isService:false}}:{};
 const search=filter.search?.trim().slice(0,200);
 return {AND:[ownership,type,...(filter.unanswered?[{OR:[{vendorReply:null},{vendorReply:""}]}]:[]),...(search?[{OR:[{title:{contains:search,mode:"insensitive" as const}},{body:{contains:search,mode:"insensitive" as const}},{user:{fullName:{contains:search,mode:"insensitive" as const}}},{product:{name:{contains:search,mode:"insensitive" as const}}},{booking:{product:{name:{contains:search,mode:"insensitive" as const}}}}]}]:[])],...(filter.rating&&Number.isInteger(filter.rating)&&filter.rating>=1&&filter.rating<=5?{rating:filter.rating}:{})};
}
