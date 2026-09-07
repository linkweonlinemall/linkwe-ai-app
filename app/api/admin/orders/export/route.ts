import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { csvDownload, exportDateRange } from "@/lib/admin/csv-stream";
export async function GET(request: Request) {
  if ((await getSession())?.role !== "ADMIN") return Response.json({ error: "Administrator access required." }, { status: 403 });
  let createdAt; try { createdAt=exportDateRange(new URL(request.url).searchParams); } catch(e) { return Response.json({ error: String(e) },{status:400}); }
  return csvDownload(`linkwe-orders-${new Date().toISOString().slice(0,10)}`, ["Order ID","Reference","Status","Customer","Email","Total TTD","Shipping TTD","Created"],async cursor => {
    const rows=await prisma.mainOrder.findMany({where:{createdAt},take:500,orderBy:{id:"asc"},...(cursor?{cursor:{id:cursor},skip:1}:{}),select:{id:true,referenceNumber:true,status:true,totalMinor:true,shippingMinor:true,createdAt:true,buyer:{select:{fullName:true,email:true}}}});
    return rows.map(r=>({id:r.id,cells:[r.id,r.referenceNumber,r.status,r.buyer.fullName,r.buyer.email,r.totalMinor/100,r.shippingMinor/100,r.createdAt.toISOString()]}));
  });
}
