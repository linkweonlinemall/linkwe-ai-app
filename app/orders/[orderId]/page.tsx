import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, CheckCheck, Download, MapPin, Package, PackageCheck, QrCode, ReceiptText } from "lucide-react";
import MarkReceivedButton from "@/app/orders/components/mark-received-button";
import PublicNav from "@/components/layout/PublicNav";
import CouponSummary from "@/components/checkout/CouponSummary";
import OrderProgress from "@/components/customer/OrderProgress";
import styles from "@/components/customer/customer.module.css";
import { customerDate, customerOrderState, customerParcelProgress, hasConfirmedPayment, orderReference, safeDownloadUrl } from "@/lib/customer/orders";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getSplitOrderStatusLabel } from "@/lib/orders/order-status";
import { computeSplitWeightLbs, formatWeightLbs } from "@/lib/orders/split-weight";
import { generateOrderQRCodeDataURL } from "@/lib/orders/qr-code";
import { prisma } from "@/lib/prisma";
import { formatTTDMinor } from "@/lib/format/price";
export const metadata:Metadata={title:"Your order"};
type Props={params:Promise<{orderId:string}>;searchParams:Promise<{confirmReceipt?:string}>};
export default async function OrderDetailPage({ params, searchParams }: Props) {
  const { orderId } = await params;
  const { confirmReceipt } = await searchParams;
  if (!orderId?.trim()) {
    notFound();
  }

  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const order = await prisma.mainOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      buyerId: true,
      referenceNumber: true,
      status: true,
      createdAt: true,
      region: true,
      couponSnapshot: true,
      subtotalMinor: true,
      shippingMinor: true,
      totalMinor: true,
      shippingAddressId: true,
      buyer: { select: { fullName: true, email: true } },
      shippingAddress: {
        select: {
          line1: true,
          line2: true,
          city: true,
          region: true,
          postalCode: true,
          country: true,
          phone: true,
        },
      },
      items: {
        select: {
          id: true,
          listingId: true,
          titleSnapshot: true,
          quantity: true,
          priceMinor: true,
          weightLbs: true,
          store: { select: { name: true, slug: true } },
          product: {
            select: {
              name: true,
              slug: true,
              images: true,
              isDigital: true,
              digitalFileUrl: true,
              store: { select: { name: true, slug: true } },
            },
          },
        },
      },
      splitOrders: {
        select: {
          id: true,
          status: true,
          subtotalMinor: true,
          deliveredAt: true,
          warehouseReceivedAt: true,
          earningsReleased: true,
          store: {
            select: { name: true, slug: true, shippingMode: true },
          },
          items: {
            select: {
              id: true,
              listingId: true,
              titleSnapshot: true,
              quantity: true,
              unitPriceMinor: true,
              lineTotalMinor: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const isBuyer = order.buyerId === session.userId;
  const isAdmin = session.role === "ADMIN";
  if (!isBuyer && !isAdmin) {
    notFound();
  }

  const state=customerOrderState(order);
  const paid=hasConfirmedPayment(order.status);
  const closed=["CANCELLED","REFUNDED"].includes(order.status);
  const digitalItems=order.items.filter(item=>item.product?.isDigital);
  const dashboardHref=getRoleDashboardPath(session.role);
  const qr=!state.digital?await generateOrderQRCodeDataURL(order.id):null;
  const reference=orderReference(order);
  const itemCount=order.items.reduce((sum,item)=>sum+item.quantity,0);
  const matchItem=(item:{listingId:string;titleSnapshot:string})=>order.items.find(row=>row.titleSnapshot===item.titleSnapshot && row.listingId===item.listingId)??order.items.find(row=>row.listingId===item.listingId)??order.items.find(row=>row.titleSnapshot===item.titleSnapshot);
  const renderItem=(item:{id:string;titleSnapshot:string;quantity:number;priceMinor:number;weightLbs?:number;product:typeof order.items[number]["product"]})=><li className={styles.detailItem} key={item.id}><div className={styles.detailImage}>{item.product?.images[0]?<img src={item.product.images[0]} alt=""/>:<Package size={25}/>}</div><div><h3>{item.product?<Link href={`/products/${item.product.slug}`}>{item.titleSnapshot}</Link>:item.titleSnapshot}</h3><p>{item.quantity} × {formatTTDMinor(item.priceMinor)}</p>{item.product?.isDigital?<small>Digital item</small>:item.weightLbs&&item.weightLbs>0?<small>{formatWeightLbs(item.weightLbs)} lb each</small>:null}</div><strong>{formatTTDMinor(item.priceMinor*item.quantity)}</strong></li>;
  return <div className={`${styles.page} pb-mobile-public lg:pb-0`}><PublicNav user={{name:session.fullName??"Account",href:dashboardHref}} dashboardHref={dashboardHref}/><main className={styles.container}><Link href="/orders" className={styles.back}><ArrowLeft size={15}/>All your orders</Link><header className={styles.detailHead}><div><span className={styles.eyebrow}>THE STORY OF YOUR ORDER</span><h1>{reference}</h1><p>Placed {customerDate(order.createdAt)} · {itemCount} {itemCount===1?"item":"items"}</p></div><div><span className={styles.status} data-tone={state.tone}><span/>{state.label}</span><a href={`/api/invoice/${order.id}`} className={styles.secondary}><ReceiptText size={16}/>Download invoice</a></div></header>
  <div className={styles.detailLayout}><div className={styles.detailMain}><section className={styles.panel}><h2><PackageCheck size={21}/>Your order, at a glance.</h2><p>{state.detail}</p><OrderProgress steps={state.steps} current={state.step}/>{!state.digital&&order.splitOrders.length>1&&<p>Your order includes {order.splitOrders.length} store parcels. Follow each one below.</p>}{!state.digital&&isBuyer&&order.status==="DELIVERED"&&<div id="confirm-receipt" className="scroll-mt-40"><MarkReceivedButton orderId={order.id} initiallyConfirming={Boolean(confirmReceipt)}/></div>}</section>
  {digitalItems.length>0&&<section className={styles.panel}><h2><Download size={21}/>Your digital finds.</h2>{paid?<><p>Download available files below. Keep this order handy whenever you need them.</p>{digitalItems.map(item=>{const url=item.product?.digitalFileUrl?safeDownloadUrl(item.product.digitalFileUrl,item.product.name):null;return url?<a key={item.id} href={url} download rel="noopener noreferrer" className={styles.download}>{item.titleSnapshot}<Download size={17}/></a>:<p key={item.id} className={styles.download}>{item.titleSnapshot} · File not yet available. Please contact the store.</p>;})}</>:<p>{closed?"Downloads are unavailable for this closed order.":"Your download links will appear once payment is confirmed."}</p>}</section>}
  <section className={styles.panel}><header><h2><ShoppingIcon/>The good things inside.</h2></header><div>{order.splitOrders.length?order.splitOrders.map(split=>{const physical=split.items.some(item=>!matchItem(item)?.product?.isDigital);const progress=physical?customerParcelProgress(split.status,order.status,state.pickup):null;const badge=closed?state.label:!paid?"Payment pending":split.status==="CANCELLED"?"Cancelled":physical?getSplitOrderStatusLabel(split.status).label:"Digital items";const weight=computeSplitWeightLbs(split.items,order.items.map(item=>({titleSnapshot:item.titleSnapshot,weightLbs:item.product?.isDigital?0:item.weightLbs,quantity:item.quantity})));return <section key={split.id} className={styles.parcel} aria-label={`Parcel from ${split.store.name}`}><div className={styles.parcelHead}><Link href={`/store/${split.store.slug}`}>{split.store.name}<ArrowUpRight size={14}/></Link><span className={styles.status}>{badge}</span></div>{progress&&<OrderProgress steps={progress.steps} current={progress.current}/>}<ul>{split.items.map(item=>{const original=matchItem(item);return renderItem({...item,priceMinor:item.unitPriceMinor,product:original?.product??null,weightLbs:original?.weightLbs});})}</ul><div className={styles.parcelFoot}><div><p>{!physical?"Digital delivery":state.pickup?"Pickup from LinkWe warehouse":"Delivery via LinkWe"}</p>{weight.totalLbs>0&&<p>Parcel weight · {formatWeightLbs(weight.totalLbs)} lb</p>}</div><strong>{formatTTDMinor(split.subtotalMinor)}</strong></div></section>;}):<ul>{order.items.map(renderItem)}</ul>}</div></section>
  <div className={styles.helpStrip}><CheckCheck size={25}/><div><strong>Need a hand with this order?</strong><p>Have your order number ready so we can help.</p></div><Link href="/contact">Contact us<ArrowUpRight size={16}/></Link></div></div>
  <aside className={styles.detailAside}><section className={styles.summary}><span className={styles.eyebrow}>THE DETAILS, ALL HERE</span><h2>Order summary.</h2><dl className={styles.summaryRows}><div><dt>Item subtotal</dt><dd>{formatTTDMinor(order.subtotalMinor)}</dd></div><div><dt>{state.digital?"Shipping":state.pickup?"Pickup":"Delivery"}</dt><dd>{state.digital&&order.shippingMinor===0?"No shipping charge":formatTTDMinor(order.shippingMinor)}</dd></div></dl><CouponSummary snapshot={order.couponSnapshot}/><div className={styles.summaryTotal}><span>Order total</span><strong>{formatTTDMinor(order.totalMinor)}</strong></div><p className={styles.summaryNote}>{!paid&&!closed?"Payment has not been confirmed.":closed?state.detail:"All prices in Trinidad & Tobago dollars."}</p></section>
  <section className={styles.panel}><h2>{state.digital?<Download size={20}/>:state.pickup?<PackageCheck size={20}/>:<MapPin size={20}/>} {state.digital?"Digital delivery":state.pickup?"Collection details":"Delivering to"}</h2><div className={styles.address}><strong>{order.buyer.fullName}</strong><span>{order.buyer.email}</span>{order.shippingAddress?<><hr/><strong>{order.shippingAddress.line1}</strong>{order.shippingAddress.line2&&<div>{order.shippingAddress.line2}</div>}<div>{[...new Set([order.shippingAddress.city,order.shippingAddress.region].filter(Boolean))].join(", ")} {order.shippingAddress.postalCode}</div><div>{order.shippingAddress.country==="TT"?"Trinidad & Tobago":order.shippingAddress.country}</div>{order.shippingAddress.phone&&<div>{order.shippingAddress.phone}</div>}</>:<p className="mt-3">{state.digital?"Find your available files in the download section.":"Collection is from the LinkWe warehouse. Please wait until your parcels are marked ready for pickup."}</p>}</div></section>
  {qr&&<section className={styles.panel}><h2><QrCode size={20}/>Keep your order close.</h2><div className={styles.qr}><img src={qr} alt={`QR code for order ${reference}`} width={95} height={95}/><div><p>Scan to open this order.<br/>Sign in to view its details.</p><Link href={`/orders/${order.id}`}>Your order link<ArrowRight size={12} className="inline ml-1"/></Link></div></div></section>}</aside></div><footer className={styles.footer}>We people. We business. We local.</footer></main></div>;
}
function ShoppingIcon(){return <Package size={21}/>;}
