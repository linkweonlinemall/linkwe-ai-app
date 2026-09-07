import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { csvDownload, exportDateRange } from "@/lib/admin/csv-stream";
export async function GET(request: Request) {
  if ((await getSession())?.role !== "ADMIN") return Response.json({ error: "Administrator access required." }, { status: 403 });
  const params = new URL(request.url).searchParams;
  let createdAt; try { createdAt=exportDateRange(params); } catch(e) { return Response.json({error:String(e)},{status:400}); }
  const conversationId=params.get("conversationId") || undefined;
  const hide=params.get("hideContacts")==="1";
  return csvDownload(`linkwe-messages-${new Date().toISOString().slice(0,10)}`,["Message ID","Conversation ID","Store ID","Date UTC","Sender role","Sender name","Customer","Customer email","Store","Message","Read at UTC"],async cursor => {
    const rows=await prisma.message.findMany({where:{createdAt,...(conversationId?{conversationId}:{})},orderBy:{id:"asc"},take:500,...(cursor?{cursor:{id:cursor},skip:1}:{}),select:{id:true,conversationId:true,createdAt:true,readAt:true,senderRole:true,content:true,sender:{select:{fullName:true}},conversation:{select:{storeId:true,customer:{select:{fullName:true,email:true}},store:{select:{name:true}}}}}});
    return rows.map(m=>({id:m.id,cells:[m.id,m.conversationId,m.conversation.storeId,m.createdAt.toISOString(),m.senderRole,hide?"":m.sender.fullName,hide?"":m.conversation.customer.fullName,hide?"":m.conversation.customer.email,m.conversation.store.name,m.content,m.readAt?.toISOString() ?? ""]}));
  });
}
