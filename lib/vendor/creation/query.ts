import "server-only";
import { prisma } from "@/lib/prisma";
import { getStorePlan } from "@/lib/finance/store-plan";
import { getPaidTicketSoldCountsForEvents } from "@/lib/tickets/sold-counts";
import { creationEditHref, ticketDisplayStatus, type CreationItem, type CreationLibraryData } from "./model";

export async function getCreationLibrary(userId: string): Promise<CreationLibraryData | null> {
  const store = await prisma.store.findUnique({where:{ownerId:userId},select:{id:true,name:true,status:true,subscriptionPlan:true,subscriptionStatus:true,owner:{select:{idVerificationStatus:true}}}});
  if (!store) return null;
  const [products, events] = await Promise.all([
    prisma.product.findMany({where:{storeId:store.id},orderBy:{updatedAt:"desc"},select:{id:true,name:true,slug:true,shortDescription:true,category:true,price:true,stock:true,images:true,isService:true,serviceType:true,isDigital:true,hasVariants:true,isPublished:true,isArchived:true,isFeatured:true,updatedAt:true}}),
    prisma.event.findMany({where:{storeId:store.id},orderBy:{updatedAt:"desc"},select:{id:true,title:true,slug:true,category:true,coverImage:true,startDate:true,endDate:true,venueName:true,isOnline:true,status:true,isPublished:true,updatedAt:true,ticketTypes:{select:{id:true,name:true,price:true,quantity:true,isVisible:true,saleStartDate:true,saleEnds:true,description:true,updatedAt:true}}}}),
  ]);
  const sold = await getPaidTicketSoldCountsForEvents(events.map(event => event.id));
  const items: CreationItem[] = products.map(product => {
    const kind = product.isService ? "service" : "product";
    const tips = [...(!product.images.length ? ["Add a photo"] : []),...(!product.category ? ["Choose a category"] : []),...(!product.isService && !product.isDigital && product.stock === 0 ? ["Out of stock"] : [])];
    return {id:product.id,kind,title:product.name,image:product.images[0]??null,description:product.shortDescription??"",category:product.category,subtype:product.isService?(product.serviceType??"Service").toLowerCase().replaceAll("_"," "):product.isDigital?"Digital download":product.hasVariants?"Product with options":"Physical product",status:product.isArchived?"Archived":product.isPublished?"Published":"Draft",published:product.isPublished&&!product.isArchived,archived:product.isArchived,price:product.price,stock:product.stock,featured:product.isFeatured,updatedAt:product.updatedAt.toISOString(),editHref:creationEditHref(kind,product.id),publicHref:product.isPublished&&!product.isArchived?`${product.isService?"/service":"/products"}/${product.slug}`:null,tips};
  });
  for (const event of events) {
    const eventSold = sold[event.id]?.total ?? 0;
    const visibleTickets = event.ticketTypes.filter(ticket => ticket.isVisible);
    const tips = [...(!event.coverImage?["Add a cover photo"]:[]),...(!visibleTickets.length?["Add a visible ticket"]:[])];
    items.push({id:event.id,kind:"event",title:event.title,image:event.coverImage,description:event.venueName??(event.isOnline?"Online event":""),category:event.category,subtype:event.isOnline?"Online event":"In-person event",status:event.status==="CANCELLED"?"Cancelled":event.status==="COMPLETED"?"Ended":event.isPublished?"Published":"Draft",published:event.isPublished&&event.status==="PUBLISHED",archived:false,price:visibleTickets.length?Math.min(...visibleTickets.map(t=>t.price)):null,stock:null,featured:false,date:event.startDate.toISOString(),sold:eventSold,quantity:event.ticketTypes.reduce((sum,t)=>sum+t.quantity,0),updatedAt:event.updatedAt.toISOString(),editHref:creationEditHref("event",event.id),publicHref:event.isPublished?`/events/${event.slug}`:null,tips});
    for (const ticket of event.ticketTypes) {
      const paid = sold[event.id]?.byTicketTypeId[ticket.id] ?? 0;
      const status = ticketDisplayStatus({eventStatus:event.status,eventPublished:event.isPublished,visible:ticket.isVisible,end:ticket.saleEnds,starts:ticket.saleStartDate,sold:paid,quantity:ticket.quantity});
      items.push({id:ticket.id,kind:"ticket",visible:ticket.isVisible,title:ticket.name,image:event.coverImage,description:ticket.description??"",category:event.category,subtype:"Ticket tier",status,published:ticket.isVisible&&event.status==="PUBLISHED"&&event.isPublished,archived:false,price:ticket.price,stock:null,featured:false,eventId:event.id,eventTitle:event.title,date:event.startDate.toISOString(),sold:paid,quantity:ticket.quantity,updatedAt:ticket.updatedAt.toISOString(),editHref:creationEditHref("ticket",ticket.id,event.id),publicHref:event.isPublished&&ticket.isVisible?`/events/${event.slug}`:null,tips:status==="Event draft"?["Publish the event when ready"]:[]});
    }
  }
  const {plan,limits}=getStorePlan(store);
  return {storeName:store.name,storeLive:store.status==="ACTIVE"&&store.owner.idVerificationStatus==="APPROVED",items,plan,productLimit:limits.productCap,serviceLimit:limits.serviceCap};
}
