"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { SUPPORT_CATEGORIES, SUPPORT_STATUSES, supportText } from "@/lib/support/policy";
import { createNotification } from "@/lib/notifications/create";

async function access() {
 const session=await getSession();
 if (!session || !["VENDOR","ADMIN"].includes(session.role)) throw new Error("Sign in to your business account.");
 const store=session.role === "VENDOR" ? await prisma.store.findFirst({where:{ownerId:session.userId},select:{id:true}}) : null;
 if(session.role === "VENDOR" && !store) throw new Error("Create your store first.");
 return {session,store,where:store ? {storeId:store.id} : {}};
}
function refresh(){revalidatePath("/dashboard/vendor/support");revalidatePath("/dashboard/admin/support");}
async function notify(ticketId:string, storeId:string, adminReply:boolean){
 try {
 const recipients=adminReply ? await prisma.store.findUnique({where:{id:storeId},select:{ownerId:true}}).then(s=>s?[{id:s.ownerId}]:[]) : await prisma.user.findMany({where:{role:"ADMIN",isActive:true},select:{id:true}});
 await Promise.all(recipients.map(user=>createNotification({userId:user.id,type:"GENERAL",title:adminReply?"Support ticket updated":"Vendor support needs attention",body:"Open your support centre to review the latest update.",linkUrl:`/dashboard/${adminReply?"vendor":"admin"}/support?ticket=${ticketId}`})));
 } catch { /* Tickets remain saved if notification delivery is unavailable. */ }
}
export async function createSupportTicket(data:FormData){
 try{
 const {session,store}=await access();if(!store)return {error:"Create tickets from a vendor account."};
 const subject=supportText(data.get("subject"),140),body=supportText(data.get("body"),5000),category=supportText(data.get("category"),60),reference=supportText(data.get("reference"),100);
 if(!subject || body.length<10 || !SUPPORT_CATEGORIES.some(c=>c===category))return {error:"Add a subject, category and at least 10 characters describing the issue."};
 const ticket=await prisma.$transaction(async tx=>{
  const recent=await tx.vendorSupportTicket.count({where:{storeId:store.id,createdAt:{gte:new Date(Date.now()-60*60*1000)}}});
  if(recent>=5)throw new Error("You have opened several tickets recently. Please reply to an existing ticket or try again later.");
  return tx.vendorSupportTicket.create({data:{storeId:store.id,subject,category,reference:reference||null,priority:data.get("priority")==="HIGH"?"HIGH":"NORMAL",messages:{create:{authorId:session.userId,authorRole:"VENDOR",body}}}});
 },{isolationLevel:"Serializable"});
 refresh();await notify(ticket.id,store.id,false);return {ok:true,id:ticket.id};
 }catch(e){return {error:e instanceof Error&& !e.message.includes("prisma")?e.message:"Could not save the ticket. Please try again."};}
}
export async function updateSupportTicket(id:string,data:FormData){
 try{
 const {session,where}=await access();const body=supportText(data.get("body"),5000);const status=supportText(data.get("status"),30);
 if(!body && !status)return {error:"Add a reply or choose a status."};
 if(status && (!Object.hasOwn(SUPPORT_STATUSES, status) || (session.role!=="ADMIN" && !["OPEN","RESOLVED"].includes(status)))) return {error:"Choose an available status."};
 const ticket=await prisma.$transaction(async tx=>{
 const current=await tx.vendorSupportTicket.findFirst({where:{id,...where}});if(!current)throw new Error("Ticket not found.");
 if(body)await tx.vendorSupportMessage.create({data:{ticketId:id,authorId:session.userId,authorRole:session.role,body}});
 return tx.vendorSupportTicket.update({where:{id},data:{updatedAt:new Date(),status:status || (session.role==="ADMIN"?"WAITING_VENDOR":"OPEN")}});
 });refresh();await notify(ticket.id,ticket.storeId,session.role==="ADMIN");return {ok:true};
 }catch{return {error:"Could not update this ticket. Refresh and try again."};}
}
