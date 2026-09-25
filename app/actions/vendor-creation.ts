"use server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getCreationLibrary } from "@/lib/vendor/creation/query";
import { CREATION_ROOT, isCreationKind, type CreationKind } from "@/lib/vendor/creation/model";
import { publishEvent, unpublishEvent } from "@/app/actions/events";
import { getStorePlan } from "@/lib/finance/store-plan";
import { PRODUCT_CATEGORIES } from "@/lib/categories";

export async function refreshCreationLibrary() {
  const session=await getSession();
  if(!session || session.role!=="VENDOR") return {error:"Sign in to your vendor account."} as const;
  const data=await getCreationLibrary(session.userId);
  return data?{data}:{error:"Set up your store to start creating."};
}
export type CreationOperation="publish"|"hide"|"archive"|"restore"|"feature"|"unfeature"|"stock"|"category";
export async function updateCreations(input:{items:{id:string;kind:CreationKind}[];operation:CreationOperation;value?:string}) {
  const session=await getSession();
  if(!session || session.role!=="VENDOR") return {error:"Sign in to your vendor account."} as const;
  if(!input || !Array.isArray(input.items) || input.items.length<1 || input.items.length>100 || !["publish","hide","archive","restore","feature","unfeature","stock","category"].includes(input.operation)) return {error:"Choose between 1 and 100 items and a valid action."} as const;
  if(input.items.some(item=>!item||typeof item.id!=="string"||!isCreationKind(item.kind)))return {error:"Invalid selection."} as const;
  const store=await prisma.store.findUnique({where:{ownerId:session.userId},select:{id:true,subscriptionPlan:true,subscriptionStatus:true}});
  if(!store)return {error:"Store not found."} as const;
  const {limits}=getStorePlan(store);
  const results:{key:string;ok:boolean;error?:string}[]=[];
  for(const item of [...new Map(input.items.map(item=>[`${item.kind}:${item.id}`,item])).values()]){
    const key=`${item.kind}:${item.id}`;
    try {
      if(item.kind==="event") {
        if(!["publish","hide"].includes(input.operation))throw new Error("Open the event editor for event-specific actions.");
        const event=await prisma.event.findFirst({where:{id:item.id,storeId:store.id},select:{status:true}});
        if(!event)throw new Error("Event not found.");
        if(event.status==="CANCELLED"||event.status==="COMPLETED")throw new Error("This event has ended or been cancelled.");
        const result=input.operation==="publish"?await publishEvent(item.id):await unpublishEvent(item.id);
        if("error"in result)throw new Error(result.error);
      } else if(item.kind==="ticket") {
        if(!["publish","hide"].includes(input.operation))throw new Error("Open ticket setup to manage this ticket tier.");
        const ticket=await prisma.eventTicketType.findFirst({where:{id:item.id,event:{storeId:store.id}},select:{id:true,event:{select:{id:true,status:true,slug:true}}}});
        if(!ticket)throw new Error("Ticket not found.");
        if(ticket.event.status==="CANCELLED"||ticket.event.status==="COMPLETED")throw new Error("This event has ended or been cancelled.");
        await prisma.eventTicketType.update({where:{id:ticket.id},data:{isVisible:input.operation==="publish"}});
        revalidatePath(`/events/${ticket.event.slug}`);
        revalidatePath(`${CREATION_ROOT}/event/${ticket.event.id}`);
      } else {
        const row=await prisma.product.findFirst({where:{id:item.id,storeId:store.id,isService:item.kind==="service"},select:{id:true,slug:true,isArchived:true,isDigital:true,digitalFileUrl:true,price:true,stock:true,hasVariants:true}});
        if(!row)throw new Error("Listing not found.");
        const operation=input.operation;
        if(row.isArchived&&operation!=="restore")throw new Error("Restore this listing before changing it.");
        if(operation==="publish"&&row.isDigital&&!row.digitalFileUrl)throw new Error("Add a downloadable file before publishing.");
        if(operation==="publish"&&item.kind==="service"&&limits.serviceMaxPriceMinor!==null&&Math.round(row.price*100)>limits.serviceMaxPriceMinor)throw new Error("This service price is above your current plan limit.");
        if(operation==="restore") {
          if(!row.isArchived)throw new Error("This listing is already active.");
          const cap=item.kind==="service"?limits.serviceCap:limits.productCap;
          if(cap!==null&&await prisma.product.count({where:{storeId:store.id,isService:item.kind==="service",isArchived:false}})>=cap)throw new Error("Your plan’s listing limit has been reached.");
        }
        if(["stock","category","feature","unfeature"].includes(operation)&&item.kind!=="product")throw new Error("This action is for products only.");
        const quantity=Number(input.value);
        if(operation==="stock"&&(!Number.isSafeInteger(quantity)||quantity<1||quantity>100000))throw new Error("Enter a whole stock quantity between 1 and 100,000.");
        if(operation==="stock"&&(row.isDigital||row.hasVariants||row.stock===null))throw new Error("Use the editor for digital, unlimited-stock or variant products.");
        if(operation==="category"&&!PRODUCT_CATEGORIES.some(category=>category.value===input.value))throw new Error("Choose a valid product category.");
        await prisma.product.update({where:{id:row.id},data:operation==="publish"?{isPublished:true}:operation==="hide"?{isPublished:false}:operation==="archive"?{isPublished:false,isArchived:true}:operation==="restore"?{isArchived:false,isPublished:false}:operation==="feature"?{isFeatured:true}:operation==="unfeature"?{isFeatured:false}:operation==="stock"?{stock:{increment:quantity}}:{category:input.value}});
        revalidatePath(`/${item.kind==="service"?"service":"products"}/${row.slug}`);
      }
      results.push({key,ok:true});
    }catch(error){results.push({key,ok:false,error:error instanceof Error?error.message:"Could not update this item."});}
  }
  revalidatePath(CREATION_ROOT);
  revalidatePath("/dashboard/vendor/products");revalidatePath("/dashboard/vendor/services");revalidatePath("/dashboard/vendor/events");
  revalidatePath("/shop");revalidatePath("/services");revalidatePath("/events");
  return {results};
}
