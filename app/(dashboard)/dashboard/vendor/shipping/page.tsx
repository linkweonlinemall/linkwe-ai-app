import { redirect } from "next/navigation";
import Link from "next/link";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { vendorSplitOrderListSelect } from "@/lib/vendor/vendor-split-order-query";
import { productOrderRow } from "@/lib/vendor/order-workspace";
import WorkspacePage from "@/components/vendor/WorkspacePage";
import s from "@/components/vendor/business-workspace.module.css";
import ShippingWorkspace from "./ShippingWorkspace";
export default async function VendorShippingPage(){
 const session=await getSession();if(!session)redirect("/login");assertDashboardRole(session,"VENDOR");
 const store=await prisma.store.findFirst({where:{ownerId:session.userId},select:{id:true,address:true,region:true}});if(!store)redirect("/onboarding/business/step-3");
 const [orders,products]=await Promise.all([
  prisma.splitOrder.findMany({where:{storeId:store.id,status:{notIn:["CANCELLED","DELIVERED","COMPLETED"]},mainOrder:{status:{notIn:["DRAFT","PENDING_PAYMENT","CANCELLED","REFUNDED"]}}},orderBy:{createdAt:"asc"},select:{...vendorSplitOrderListSelect,referenceNumber:true,storeId:true,mainOrder:{select:{...vendorSplitOrderListSelect.mainOrder.select,referenceNumber:true,status:true,shippingAddressId:true,items:{where:{storeId:store.id},select:{storeId:true,product:{select:{isDigital:true}}}}}}}}),
  prisma.product.findMany({where:{storeId:store.id,isPublished:true,isArchived:false,isDigital:false,isService:false},select:{id:true,name:true,weight:true,length:true,width:true,height:true,allowDelivery:true,allowPickup:true},orderBy:{name:"asc"}}),
 ]);
 const rows=orders.map(productOrderRow).filter(row=>row.detail!=="Digital delivery");
 const issues=products.flatMap(p=>{const missing:string[]=[];if(p.allowDelivery){if(!p.weight||p.weight<=0)missing.push("packaged weight");if(!p.length||p.length<=0||!p.width||p.width<=0||!p.height||p.height<=0)missing.push("parcel dimensions");}if(!p.allowDelivery&&!p.allowPickup)missing.push("delivery or pickup option");return missing.length?[{id:p.id,name:p.name,missing:missing.join(" + ")}]:[];});
 return <WorkspacePage eyebrow="Orders & fulfilment" title="Keep every parcel moving." description="See paid physical orders, prepare the next handover and keep your product delivery details ready." action={<Link href="/dashboard/vendor/orders" className={s.secondary}>All orders ↗</Link>}><ShippingWorkspace rows={rows} issues={issues} productCount={products.length} addressReady={!!store.address?.trim()&&!!store.region}/></WorkspacePage>;
}
