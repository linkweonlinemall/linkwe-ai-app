import type { MainOrderStatus } from "@prisma/client";
export type CustomerOrderItem = { id: string; titleSnapshot: string; quantity: number; product: { name: string; images: string[]; isDigital: boolean } | null; store: { name: string; slug: string } };
export type CustomerOrder = { id: string; referenceNumber: string | null; createdAt: Date | string; status: MainOrderStatus; region: string | null; shippingAddressId: string | null; subtotalMinor: number; shippingMinor: number; totalMinor: number; items: CustomerOrderItem[]; splitOrders: { status: string }[] };
export type OrderView = "all" | "active" | "delivered" | "closed";
export const paidOrderStatuses = ["PAID", "PROCESSING", "PARTIALLY_IN_HOUSE", "READY_TO_SHIP", "PACKING_COMPLETE", "SHIPPED", "DELIVERED", "CUSTOMER_RECEIVED", "COMPLETED"];
export const hasConfirmedPayment = (status: string) => paidOrderStatuses.includes(status);
export const orderReference = (order: { id: string; referenceNumber: string | null }) => order.referenceNumber ?? `LW-${order.id.slice(-8).toUpperCase()}`;
export const customerDate = (date: Date | string) => new Date(date).toLocaleDateString("en-TT", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Port_of_Spain" });
export function customerOrderBucket(status: string): Exclude<OrderView,"all"> {
  if (["CANCELLED", "REFUNDED"].includes(status)) return "closed";
  if (["DELIVERED", "CUSTOMER_RECEIVED", "COMPLETED"].includes(status)) return "delivered";
  return "active";
}
export function customerOrderState(order: Pick<CustomerOrder,"status"|"shippingAddressId"|"items"|"splitOrders">) {
  const digital = order.items.length > 0 && order.items.every(item => item.product?.isDigital);
  const pickup = !digital && !order.shippingAddressId;
  const states: Record<string,{label:string;detail:string;step:number;tone:string}> = {
    DRAFT:{label:"Not placed yet",detail:"This order has not been placed.",step:-1,tone:"neutral"},
    PENDING_PAYMENT:{label:"Awaiting payment",detail:"Your payment has not been confirmed yet.",step:-1,tone:"amber"},
    PAID:{label:"Order confirmed",detail:"Payment received. Your stores are getting started.",step:0,tone:"mint"},
    PROCESSING:{label:"Being prepared",detail:"Your local stores are preparing your finds.",step:1,tone:"amber"},
    PARTIALLY_IN_HOUSE:{label:"Coming together",detail:"Some parcels have arrived at LinkWe. Others are still being prepared.",step:1,tone:"amber"},
    READY_TO_SHIP:{label:"Preparing for handover",detail:"Your parcels are being prepared for the next step.",step:1,tone:"mint"},
    PACKING_COMPLETE:{label:"Packed and ready",detail:"Your order is packed. Check each parcel below for the next step.",step:1,tone:"mint"},
    SHIPPED:{label:pickup?"Handover in progress":"On the way",detail:pickup?"Check the parcel updates for collection details.":"Your order is out for delivery.",step:2,tone:"orange"},
    DELIVERED:{label:pickup?"Collected":"Delivered",detail:"Everything arrived? You can confirm receipt of your complete order.",step:3,tone:"mint"},
    CUSTOMER_RECEIVED:{label:"Received",detail:"You confirmed your order arrived. Thank you for shopping local.",step:3,tone:"mint"},
    COMPLETED:{label:"Complete",detail:"All done. A little local happiness, delivered.",step:3,tone:"mint"},
    CANCELLED:{label:"Cancelled",detail:"This order has been cancelled.",step:-1,tone:"rose"},
    REFUNDED:{label:"Refunded",detail:"A refund has been processed for this order.",step:-1,tone:"rose"},
  };
  const state = states[order.status] ?? {label:"Order update",detail:"Open your order for the latest details.",step:-1,tone:"neutral"};
  if (digital && hasConfirmedPayment(order.status)) return {...state,label:"Digital order",detail:"Open your order to find your available downloads.",step:1,steps:["Payment confirmed","Your digital items"],digital,pickup};
  const ready = pickup && customerOrderBucket(order.status)==="active" && hasConfirmedPayment(order.status) && order.splitOrders.length>0 && order.splitOrders.every(split=>["READY_FOR_CUSTOMER_PICKUP","DELIVERED","COMPLETED"].includes(split.status));
  return {...state,...(ready?{label:"Ready for pickup",detail:"Your parcels are ready for collection at LinkWe.",step:2,tone:"orange"}:{}),steps:["Confirmed","Preparing",pickup?"Ready for pickup":"On the way",pickup?"Collected":"Delivered"],digital,pickup};
}
export function filterCustomerOrders(orders: CustomerOrder[], filters: {search:string;view:OrderView;status:string;sort:string;days:number}, now=Date.now()) {
 const words=filters.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
 return orders.filter(order => (filters.view==="all"||customerOrderBucket(order.status)===filters.view) && (filters.status==="all"||order.status===filters.status) && (!filters.days||new Date(order.createdAt).getTime()>=now-filters.days*86400000) && words.every(word=>[orderReference(order),order.id,order.region??"",customerOrderState(order).label,...order.items.flatMap(item=>[item.titleSnapshot,item.product?.name??"",item.store.name])].join(" ").toLowerCase().includes(word))).sort((a,b)=>{
 const date=new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime();
 return filters.sort==="oldest"?-date:filters.sort==="highest"?b.totalMinor-a.totalMinor||date:filters.sort==="lowest"?a.totalMinor-b.totalMinor||date:date;
 });
}
export function customerParcelProgress(status:string, mainStatus:string, pickup:boolean) {
 if(!hasConfirmedPayment(mainStatus)||status==="CANCELLED")return null;
 const stages:Record<string,number>={AWAITING_VENDOR_ACTION:0,PREPARING:1,VENDOR_PREPARING:1,READY_FOR_LINKWE:1,AWAITING_COURIER_PICKUP:1,COURIER_ASSIGNED:1,COURIER_PICKED_UP:1,VENDOR_DROPPED_OFF:1,AT_WAREHOUSE:2,PACKAGED:2,BUNDLED_FOR_DISPATCH:2,READY_FOR_CUSTOMER_PICKUP:3,SHIPPED:3,OUT_FOR_DELIVERY:3,DISPATCHED:3,DELIVERED:4,COMPLETED:4};
 if(!(status in stages))return null;
 // A parcel in transit must never be described as ready for collection.
 const handover=pickup&&["SHIPPED","OUT_FOR_DELIVERY","DISPATCHED"].includes(status)?"In transit":pickup?"Ready for pickup":"On the way";
 return {steps:["Confirmed","Preparing","At LinkWe",handover,pickup?"Collected":"Delivered"],current:stages[status]};
}
export function safeDownloadUrl(value:string,filename?:string) {
 try{const url=new URL(value);if(!["http:","https:"].includes(url.protocol))return null;
 if(url.hostname==="res.cloudinary.com")url.pathname=url.pathname.replace("/upload/",`/upload/fl_attachment${filename?":"+filename.replace(/[^a-zA-Z0-9._-]/g,"_"):""}/`);
 return url.toString();}catch{return value.startsWith("/")&&!value.startsWith("//")&&!value.includes("\\")?value:null;}
}
