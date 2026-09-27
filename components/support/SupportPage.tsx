import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import SupportCentre from "./SupportCentre";
export default async function SupportPage({admin=false,selectedId}:{admin?:boolean;selectedId?:string}){
 const session=await getSession();if(!session)redirect("/login");if(session.role!==(admin?"ADMIN":"VENDOR"))notFound();
 const store=admin?null:await prisma.store.findFirst({where:{ownerId:session.userId},select:{id:true}});if(!admin&&!store)redirect("/onboarding/business/step-3");
 const rows=await prisma.vendorSupportTicket.findMany({where:store?{storeId:store.id}:{},orderBy:{updatedAt:"desc"},take:200,include:{messages:{where:selectedId?{ticketId:selectedId}:{id:"__none__"},orderBy:{createdAt:"asc"}}}});
 // A selected older ticket remains accessible beyond the recent inbox window.
 if(selectedId&&!rows.some(t=>t.id===selectedId)){const selected=await prisma.vendorSupportTicket.findFirst({where:{id:selectedId,...(store?{storeId:store.id}:{})},include:{messages:{orderBy:{createdAt:"asc"}}}});if(!selected)notFound();rows.push(selected);}
 const stores=await prisma.store.findMany({where:{id:{in:[...new Set(rows.map(t=>t.storeId))]}},select:{id:true,name:true}});
 return <SupportCentre admin={admin} selectedId={selectedId} tickets={rows.map(t=>({...t,storeName:stores.find(s=>s.id===t.storeId)?.name??"Vendor",createdAt:t.createdAt.toISOString(),updatedAt:t.updatedAt.toISOString(),messages:t.messages.map(m=>({...m,createdAt:m.createdAt.toISOString()}))}))}/>;
}
