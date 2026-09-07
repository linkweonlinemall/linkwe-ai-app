import { getSession } from "@/lib/auth/session";
import { getDockBayData } from "@/app/actions/admin-bays";
import { escapeCsvCell } from "@/lib/csv/escape-cell";
export async function GET() {
  if ((await getSession())?.role !== "ADMIN") return Response.json({ error: "Administrator access required." }, { status: 403 });
  const data = await getDockBayData();
  const rows: (string|number|null)[][] = [["Bay","Vendor","Vendor order","Customer order","Customer","Status"]];
  for(const b of data.bays) {
    if(!b.occupants.length) rows.push([b.bayNumber,"","","","",b.blocked?"Reserved":"Available"]);
    for(const p of b.occupants) rows.push([b.bayNumber,p.store.name,p.referenceNumber ?? p.id,p.mainOrder.referenceNumber ?? p.mainOrderId,p.mainOrder.buyer.fullName,p.status]);
  }
  for(const p of data.unassigned) rows.push(["Unassigned",p.store.name,p.referenceNumber ?? p.id,p.mainOrder.referenceNumber ?? p.mainOrderId,p.mainOrder.buyer.fullName,p.status]);
  return new Response(`\ufeff${rows.map(r=>r.map(escapeCsvCell).join(",")).join("\r\n")}`,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=linkwe-bays.csv","Cache-Control":"private, no-store"}});
}
