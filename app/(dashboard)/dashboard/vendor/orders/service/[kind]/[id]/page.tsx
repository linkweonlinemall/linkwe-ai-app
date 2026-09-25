import { deskHref } from "@/lib/vendor/service-desk";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarDays, Mail, Phone, Sparkles, Wallet } from "lucide-react";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { kindLabels, orderBucket, orderDate, orderMoney, orderNextStep, orderStatusLabel, safeOrderLink, type OrderKind } from "@/lib/vendor/order-workspace";
import { MessageCustomerButton } from "../../../[splitOrderId]/message-customer-button";
import s from "@/components/vendor/orders/orders.module.css";

type Props = { params: Promise<{ kind: string; id: string }> };
type DetailRow = { label: string; value: string; href?: string | null };
const date = (value: Date | null) => value ? orderDate(value) : "Not scheduled";
const dollars = (value: number | null) => value == null ? "No payment recorded" : orderMoney(Math.round(value*100));

export default async function VendorServiceOrderDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session,"VENDOR");
  const { kind, id } = await params;
  const store = await prisma.store.findFirst({where:{ownerId:session.userId},select:{id:true,name:true}});
  if (!store) redirect("/onboarding/business/step-3");
  let title="", slug="", customer="Customer", email="", phone:string|null=null, customerId="", status="", amount="", createdAt:Date=new Date();
  let manageHref="", manageLabel="", prefix="", orderKind:OrderKind="booking", customerNotes:string|null=null, vendorNotes:string|null=null;
  let rows:DetailRow[]=[], photos:string[]=[], directions:string|null=null, amountNote="";

  if (kind === "booking") {
    const booking=await prisma.productBooking.findFirst({where:{id,product:{storeId:store.id,isService:true}},select:{bookingDate:true,startTime:true,endTime:true,status:true,totalPrice:true,amountPaid:true,guestCount:true,customerNotes:true,vendorNotes:true,meetingLink:true,cancellationReason:true,cancelledAt:true,createdAt:true,customerId:true,staffMember:{select:{name:true}},product:{select:{name:true,serviceType:true,slug:true}}}});
    if(!booking) notFound();
    const buyer=await prisma.user.findUnique({where:{id:booking.customerId},select:{fullName:true,email:true,phone:true}});
    title=booking.product.name;slug=booking.product.slug;customer=buyer?.fullName??"Customer";email=buyer?.email??"";phone=buyer?.phone??null;customerId=booking.customerId;
    status=booking.status;amount=dollars(booking.totalPrice);createdAt=booking.createdAt;prefix="BK";
    manageHref=deskHref("booking",id);manageLabel="Manage booking";customerNotes=booking.customerNotes;vendorNotes=booking.vendorNotes;
    const balance=Math.max(0,booking.totalPrice-(booking.amountPaid??0));
    rows=[{label:"Appointment",value:date(booking.bookingDate)},{label:"Time",value:`${booking.startTime}–${booking.endTime}`},{label:"Service type",value:orderStatusLabel(booking.product.serviceType??"BOOKABLE")},{label:"Guests",value:String(booking.guestCount)},{label:"Paid online",value:dollars(booking.amountPaid)},{label:status==="CANCELLED"?"Unpaid balance at cancellation":"Unpaid balance",value:dollars(balance)},...(booking.staffMember?[{label:"Staff member",value:booking.staffMember.name}]:[]),...(booking.meetingLink?[{label:"Online meeting",value:booking.meetingLink,href:safeOrderLink(booking.meetingLink)}]:[]),...(booking.cancellationReason?[{label:"Cancellation reason",value:booking.cancellationReason}]:[]),...(booking.cancelledAt?[{label:"Cancelled on",value:date(booking.cancelledAt)}]:[])];
    amountNote="Booking total. Payment details reflect online payments recorded on LinkWe.";
  } else if(kind === "request") {
    const request=await prisma.onDemandRequest.findFirst({where:{id,storeId:store.id},select:{description:true,photos:true,customerAddress:true,customerLat:true,customerLng:true,status:true,requestType:true,quotedPrice:true,amountPaid:true,estimatedArrival:true,vendorNotes:true,declineReason:true,vendorCompletedAt:true,createdAt:true,service:{select:{name:true,slug:true}},customer:{select:{id:true,fullName:true,email:true,phone:true}}}});
    if(!request) notFound();
    title=request.service.name;slug=request.service.slug;customer=request.customer.fullName??"Customer";email=request.customer.email;phone=request.customer.phone;customerId=request.customer.id;
    status=request.status==="CONFIRMED" && request.vendorCompletedAt?"AWAITING_CUSTOMER_CONFIRMATION":request.status;amount=orderMoney(request.quotedPrice==null?null:Math.round(request.quotedPrice*100));createdAt=request.createdAt;
    orderKind=request.requestType==="QUOTE"?"quote":"request";prefix=orderKind==="quote"?"QT":"RQ";manageHref=deskHref("request",id);manageLabel=orderKind==="quote"?"Manage quote":"Manage request";
    customerNotes=request.description;vendorNotes=request.vendorNotes;photos=request.photos.filter(photo=>safeOrderLink(photo));
    const destination=request.customerLat!=null && request.customerLng!=null?`${request.customerLat},${request.customerLng}`:request.customerAddress;
    if(destination) directions=`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    rows=[{label:"Request type",value:kindLabels[orderKind]},{label:"Service address",value:request.customerAddress??"Not provided"},{label:"Estimated arrival",value:request.estimatedArrival??"Not confirmed"},{label:"Paid online",value:dollars(request.amountPaid)},...(request.vendorCompletedAt?[{label:"Vendor marked complete",value:date(request.vendorCompletedAt)}]:[]),...(request.declineReason?[{label:"Decline reason",value:request.declineReason}]:[])];
    amountNote=request.quotedPrice==null?"Review the customer’s request before setting a price.":"Quoted service price. The payment record is shown in the details.";
  } else if(kind === "subscription") {
    const sub=await prisma.customerServiceSubscription.findFirst({where:{id,storeId:store.id},select:{status:true,cancelAtPeriodEnd:true,currentPeriodEnd:true,canceledAt:true,priceMinor:true,interval:true,createdAt:true,sessionsIncluded:true,sessionsRemaining:true,pausedAt:true,pauseEndsAt:true,trialEndsAt:true,product:{select:{name:true,slug:true}},customer:{select:{id:true,fullName:true,email:true,phone:true}}}});
    if(!sub) notFound();
    title=sub.product.name;slug=sub.product.slug;customer=sub.customer.fullName??"Customer";email=sub.customer.email;phone=sub.customer.phone;customerId=sub.customer.id;
    status=sub.status==="ACTIVE"&&sub.cancelAtPeriodEnd?"ENDING_SOON":sub.status;amount=orderMoney(sub.priceMinor);createdAt=sub.createdAt;prefix="SU";orderKind="subscription";
    manageHref=deskHref("subscription",id);manageLabel="Manage subscriber";
    rows=[{label:"Billing interval",value:orderStatusLabel(sub.interval)},{label:"Current period ends",value:date(sub.currentPeriodEnd)},{label:"Cancellation scheduled",value:sub.cancelAtPeriodEnd?"Yes, at period end":"No"},...(sub.sessionsIncluded!=null?[{label:"Sessions included",value:String(sub.sessionsIncluded)},{label:"Sessions remaining",value:sub.sessionsRemaining==null?"Not recorded":String(sub.sessionsRemaining)}]:[]),...(sub.pausedAt?[{label:"Paused since",value:date(sub.pausedAt)}]:[]),...(sub.pauseEndsAt?[{label:"Pause ends",value:date(sub.pauseEndsAt)}]:[]),...(sub.trialEndsAt?[{label:"Trial ends",value:date(sub.trialEndsAt)}]:[]),...(sub.canceledAt?[{label:"Cancelled on",value:date(sub.canceledAt)}]:[])];
    amountNote=`Recurring price · ${sub.interval}. This is not your available payout balance.`;
  } else notFound();
  const row={kind:orderKind,status,detail:""};
  const bucket=orderBucket(row);
  const reference=`${prefix}-${id.slice(-8).toUpperCase()}`;

  return <div className={s.page}>
    <Link href="/dashboard/vendor/orders?view=services" className={s.back}><ArrowLeft size={15}/> All service orders</Link>
    <header className={s.detailHeader}><div><p className={s.eyebrow}>{kindLabels[orderKind]} · {reference}</p><h1>{title}</h1><p>Received {orderDate(createdAt)} · {store.name}</p><div className={s.detailTags}><span className={s.badge} data-tone={bucket}>{orderStatusLabel(status)}</span><span className={s.badge}>{kindLabels[orderKind]}</span></div></div><div className={s.headerActions}><Link className={s.secondary} href={`/service/${slug}`}>View service <ArrowUpRight size={15}/></Link></div></header>
    <section className={s.actionPanel}><p className={s.eyebrow}>{bucket==="cancelled"||bucket==="completed"?"THE SERVICE RECORD":"YOUR NEXT STEP"}</p><h2>{orderNextStep(row)}</h2><p>{bucket==="action"?"Everything you need to respond is below. Open your service tools to update this booking or request.":"Keep the customer’s details and your service record together. Use your service tools to make updates."}</p><Link style={{marginTop:18}} className={s.primary} href={manageHref}>{manageLabel}<ArrowUpRight size={16}/></Link></section>
    <div className={s.detailGrid}>
      <main className={s.detailMain}>
        <section className={s.panel}><div className={s.panelHeading}><h2>The details, all together.</h2><CalendarDays size={20}/></div><dl className={s.detailRows}>{rows.map(row=><div key={row.label}><dt>{row.label}</dt><dd>{row.href?<a href={row.href} target="_blank" rel="noopener noreferrer">{row.value} ↗</a>:row.value}</dd></div>)}</dl>{directions&&<a style={{marginTop:18}} className={s.secondary} href={directions} target="_blank" rel="noopener noreferrer">Get directions <ArrowUpRight size={15}/></a>}</section>
        <section className={s.panel}><div className={s.panelHeading}><h2>A personal touch.</h2><Sparkles size={20}/></div><div className={s.subpanel}><h3>CUSTOMER NOTES / REQUEST</h3><p>{customerNotes||"No customer notes were provided."}</p></div><div className={s.subpanel}><h3>YOUR VENDOR NOTES</h3><p>{vendorNotes||"No vendor notes recorded."}</p></div>{photos.length>0&&<div style={{marginTop:20}}><p className={s.eyebrow} style={{marginBottom:12}}>CUSTOMER PHOTOS · {photos.length}</p><div className={s.attachments}>{photos.map((photo,i)=><a key={`${photo}-${i}`} href={photo} target="_blank" rel="noopener noreferrer" aria-label={`Open customer photo ${i+1}`}><Image src={photo} width={100} height={110} unoptimized alt={`Customer reference ${i+1}`}/></a>)}</div></div>}</section>
      </main>
      <aside className={s.detailAside}>
        <section className={s.panel}><h2>A little customer care.</h2><div className={s.customerName}><span className={s.avatar}>{customer.slice(0,1).toUpperCase()}</span><strong>{customer}</strong></div><div className={s.contact}>{email&&<a href={`mailto:${email}`}><Mail size={14}/>{email}</a>}{phone&&<a href={`tel:${phone}`}><Phone size={14}/>{phone}</a>}</div><MessageCustomerButton customerId={customerId} storeId={store.id}/></section>
        <section className={s.panel}><div className={s.panelHeading}><h2>{orderKind==="subscription"?"Recurring price":"Order value"}</h2><Wallet size={19}/></div><p className={s.bigAmount}>{amount}</p><p className={s.caption}>{amountNote}</p><Link style={{marginTop:17,width:"100%"}} className={s.secondary} href="/dashboard/vendor/finance">View your finances <ArrowUpRight size={15}/></Link></section>
        <section className={s.panel}><h2>Your service tools</h2><p className={s.caption}>Manage appointments, respond to requests and keep your subscribers up to date.</p><div style={{display:"grid",gap:9,marginTop:17}}>{[{label:"Open Service Desk",path:"service-desk"}].map(tool=><Link className={s.secondary} key={tool.path} href={`/dashboard/vendor/${tool.path}`}>{tool.label}<ArrowUpRight size={15}/></Link>)}</div></section>
      </aside>
    </div>
  </div>;
}
