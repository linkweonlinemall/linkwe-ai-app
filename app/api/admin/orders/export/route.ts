import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { adminOrderWhere, type OrderQueue } from "@/lib/admin/order-workspace";
import { csvDownload, exportDateRange } from "@/lib/admin/csv-stream";
export async function GET(request: Request) {
  if ((await getSession())?.role !== "ADMIN") return Response.json({ error: "Administrator access required." }, { status: 403 });
  let where; try { const p = new URL(request.url).searchParams; exportDateRange(p); where = adminOrderWhere({search:p.get("q") ?? undefined, queue:(p.get("queue") ?? "all") as OrderQueue, from:p.get("from") ?? undefined, to:p.get("to") ?? undefined}); } catch(e) { return Response.json({ error: String(e) },{status:400}); }
  return csvDownload(`linkwe-orders-${new Date().toISOString().slice(0,10)}`, ["Order ID","Reference","Status","Customer","Email","Total TTD","Shipping TTD","Created"],async cursor => {
    const rows=await prisma.mainOrder.findMany({where,take:500,orderBy:{id:"asc"},...(cursor?{cursor:{id:cursor},skip:1}:{}),select:{id:true,referenceNumber:true,status:true,totalMinor:true,shippingMinor:true,createdAt:true,buyer:{select:{fullName:true,email:true}}}});
    return rows.map(r=>({id:r.id,cells:[r.id,r.referenceNumber,r.status,r.buyer.fullName,r.buyer.email,r.totalMinor/100,r.shippingMinor/100,r.createdAt.toISOString()]}));
  });
}
