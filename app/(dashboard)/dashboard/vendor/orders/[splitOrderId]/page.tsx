import CouponSummary from "@/components/checkout/CouponSummary";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check, Download, Mail, MapPin, Package, Phone, QrCode, Route, Truck, Wallet } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { calculateEarningsMinor, getCommissionRate } from "@/lib/finance/commission";
import { resolveVendorPlan } from "@/lib/finance/vendor-plan";
import { getCourierPickupFeeMinor } from "@/lib/fulfillment/courier-pickup-rates";
import { prisma } from "@/lib/prisma";
import { generateOrderReceiptQRCodeDataURL } from "@/lib/orders/qr-code";
import { vendorSplitOrderDetailSelect } from "@/lib/vendor/vendor-split-order-query";
import { effectiveOrderStatus, orderBucket, orderDate, orderMoney, orderNextStep, orderProgress, orderStatusLabel, safeOrderLink } from "@/lib/vendor/order-workspace";
import { StoreMapBox } from "@/components/storefront/StorefrontMapAndProducts";
import OrderFulfilmentActions from "@/components/vendor/orders/OrderFulfilmentActions";
import s from "@/components/vendor/orders/orders.module.css";
import { MessageCustomerButton } from "./message-customer-button";
import { parseCheckoutFields, type CheckoutResponses } from "@/lib/checkout/custom-fields";

type Props = { params: Promise<{ splitOrderId: string }> };
export default async function VendorOrderDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "VENDOR") redirect("/");
  const { splitOrderId } = await params;
  const order = await prisma.splitOrder.findFirst({ where: { id: splitOrderId, store: { ownerId: session.userId } }, select: vendorSplitOrderDetailSelect });
  if (!order) notFound();

  const main = order.mainOrder;
  const buyer = main.buyer;
  const ownItems = main.items.filter(item => item.storeId === order.storeId);
  const digital = ownItems.length > 0 && ownItems.every(item => item.product?.isDigital);
  const pickup = !main.shippingAddress;
  const status = effectiveOrderStatus(order.status, main.status);
  const row = {kind:"product" as const, status, inboundMethod:order.vendorInboundMethod, detail:digital ? "Digital delivery" : pickup ? "Warehouse pickup" : "LinkWe delivery"};
  const bucket = orderBucket(row);
  const actionable = bucket === "action";
  const progress = orderProgress(status, digital, pickup);
  const mainRef = main.referenceNumber ?? `LW-${main.id.slice(-8).toUpperCase()}`;
  const splitRef = order.referenceNumber ?? `SP-${order.id.slice(-8).toUpperCase()}`;
  const money = (amount: number) => orderMoney(amount, order.currency);
  const plan = resolveVendorPlan(order.store.subscriptionPlan);
  const { commissionMinor, netMinor } = calculateEarningsMinor(order.subtotalMinor, "product", plan);
  const collectionFee = getCourierPickupFeeMinor(order.store.region ?? "", 1);
  const pickupFee = order.vendorInboundMethod === "PICKUP_REQUESTED" ? collectionFee : 0;
  const address = main.shippingAddress;
  const lat = address?.latitude != null ? Number(address.latitude) : null;
  const lng = address?.longitude != null ? Number(address.longitude) : null;
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const addressText = address ? [address.line1, address.line2, address.city, address.region].filter(Boolean).join(", ") : "";
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat !== null && lng !== null ? `${lat},${lng}` : addressText)}`;
  const shipment = order.legacyInboundShipment;
  const fields = [...new Map([...parseCheckoutFields(order.store.checkoutFields), ...ownItems.flatMap(item => parseCheckoutFields(item.product?.checkoutFields))].map(field=>[field.id,field])).values()];
  const responses = ((main.checkoutResponses ?? {}) as CheckoutResponses)[order.storeId] ?? {};
  const responseIds = [...new Set([...fields.map(field=>field.id), ...Object.keys(responses)])];
  const qr = await generateOrderReceiptQRCodeDataURL(main.id, order.id);

  return <div className={s.page}>
    <Link className={s.back} href="/dashboard/vendor/orders"><ArrowLeft size={15}/> All orders</Link>
    <header className={s.detailHeader}><div><p className={s.eyebrow}>PRODUCT ORDER · {order.store.name}</p><h1>{mainRef}</h1><p>Placed {orderDate(main.createdAt)} · Your store reference: {splitRef}</p><div className={s.detailTags}><span className={s.badge} data-tone={bucket}>{orderStatusLabel(status)}</span><span className={s.badge}>{row.detail}</span></div></div><div className={s.headerActions}><a className={s.secondary} href={`/api/vendor-invoice/${order.id}`}><Download size={16}/> Download invoice</a></div></header>
    {actionable ? <OrderFulfilmentActions id={order.id} digital={digital} pickupFeeMinor={collectionFee}/> : <div className={s.notice} data-closed={bucket==="cancelled"}><Route size={23}/><div><strong>{orderNextStep(row)}</strong><p>{bucket==="cancelled" ? "This order is closed. Its details remain available for your records." : status==="PENDING_PAYMENT" ? "Fulfilment will become available once payment has been confirmed." : order.vendorInboundMethod==="VENDOR_DROPOFF" && status==="VENDOR_PREPARING" ? "Your drop-off plan is confirmed. LinkWe will update the order after receiving your parcel." : "The order status updates as it moves through fulfilment. Contact the customer below if you need to clarify anything."}</p></div></div>}
    <div className={s.detailGrid}>
      <main className={s.detailMain}>
        {progress && <section className={s.panel} data-tour="order-progress"><div className={s.panelHeading}><h2>Order progress</h2><Route size={20}/></div><ol className={s.steps} aria-label="Order progress">{progress.steps.map((step,index)=><li key={step} data-current={index===progress.current} data-past={index<progress.current} aria-current={index===progress.current ? "step" : undefined}><span>{index<progress.current ? <Check size={13}/> : index+1}</span>{step}</li>)}</ol></section>}
        <section className={s.panel} data-tour="order-items"><div className={s.panelHeading}><h2>The order, at a glance.</h2><span>{order.items.reduce((n,item)=>n+item.quantity,0)} {order.items.reduce((n,item)=>n+item.quantity,0)===1?"item":"items"}</span></div><div className={s.items}>{order.items.map(item=><div className={s.item} key={item.id}><div className={s.thumbnail}>{item.listing?.imageUrl ? <Image src={item.listing.imageUrl} alt={item.titleSnapshot} fill sizes="57px" unoptimized/> : <Package size={23}/>}</div><div><h3>{item.titleSnapshot}</h3><p>Quantity {item.quantity} · {money(item.unitPriceMinor)} each</p></div><strong>{money(item.lineTotalMinor)}</strong></div>)}</div><CouponSummary snapshot={order.mainOrder.couponSnapshot} storeId={order.storeId}/><div className={s.subtotal}><span>Your store’s item subtotal</span><span>{money(order.subtotalMinor)}</span></div></section>
        {responseIds.length>0 && <section className={s.panel}><div className={s.panelHeading}><h2>Made just for this customer.</h2><Package size={20}/></div><p className={s.caption} style={{margin:"-8px 0 17px"}}>Requirements and files supplied at checkout.</p><dl className={s.responses}>{responseIds.map((id,index)=>{const field=fields.find(field=>field.id===id);const value=responses[id];const values=Array.isArray(value) ? value.filter(entry=>typeof entry==="string") : typeof value==="string" && value ? [value] : [];return <div key={id} className={s.response}><dt>{field?.label ?? `Additional checkout response ${index+1}`}</dt><dd>{values.length ? values.map((entry,i)=><div key={i}>{field?.type==="upload" && safeOrderLink(entry) ? <a href={safeOrderLink(entry)!} target="_blank" rel="noopener noreferrer">Open customer file {values.length>1 ? i+1 : ""} ↗</a> : entry}</div>) : "Not provided"}</dd></div>;})}</dl></section>}
        <section className={s.panel}><div className={s.panelHeading}><h2>Fulfilment details</h2><Truck size={20}/></div><dl className={s.definition}><div><dt>Delivery method</dt><dd>{row.detail}</dd></div><div><dt>Vendor handover</dt><dd>{digital ? "Digital content" : order.vendorInboundMethod==="PICKUP_REQUESTED" ? "Courier collection" : order.vendorInboundMethod==="VENDOR_DROPOFF" ? "Warehouse drop-off" : "Not selected yet"}</dd></div><div><dt>Customer region</dt><dd>{main.region.replaceAll("_"," ")}</dd></div>{!digital && order.vendorInboundMethod==="PICKUP_REQUESTED" && <div><dt>Collection address</dt><dd>{[order.store.address,order.store.region].filter(Boolean).join(", ") || "Contact LinkWe to confirm"}</dd></div>}{shipment && <><div><dt>Collection status</dt><dd>{orderStatusLabel(shipment.status)}</dd></div>{shipment.courier && <div><dt>Courier</dt><dd>{shipment.courier.fullName}{shipment.courier.phone && <><br/><a href={`tel:${shipment.courier.phone}`}>{shipment.courier.phone}</a></>}</dd></div>}{shipment.claimedAt && <div><dt>Assigned</dt><dd>{orderDate(shipment.claimedAt)}</dd></div>}{shipment.pickedUpAt && <div><dt>Collected</dt><dd>{orderDate(shipment.pickedUpAt)}</dd></div>}</>}</dl>{!digital && <p className={s.caption}>Physical orders go through LinkWe. Warehouse staff confirm receipt, dispatch and customer collection.</p>}</section>
        <section className={s.panel}><div className={s.panelHeading}><h2>Order record</h2><Package size={20}/></div><dl className={s.definition}><div><dt>Main reference</dt><dd>{mainRef}</dd></div><div><dt>Your store reference</dt><dd>{splitRef}</dd></div><div><dt>Main order status</dt><dd>{orderStatusLabel(main.status)}</dd></div><div><dt>Stores in this order</dt><dd>{main._count.splitOrders}</dd></div></dl><p className={s.caption}>This view contains your store’s items. LinkWe coordinates any other stores in the customer’s order.</p></section>
      </main>
      <aside className={s.detailAside}>
        <section className={s.panel}><h2>A little customer care.</h2><div className={s.customerName}><span className={s.avatar}>{buyer.fullName.slice(0,1).toUpperCase()}</span><strong>{buyer.fullName}</strong></div><div className={s.contact}><a href={`mailto:${buyer.email}`}><Mail size={14}/>{buyer.email}</a>{address?.phone && <a href={`tel:${address.phone}`}><Phone size={14}/>{address.phone}</a>}</div><MessageCustomerButton customerId={buyer.id} storeId={order.storeId}/></section>
        <section className={s.panel}><div className={s.panelHeading}><h2>The numbers</h2><Wallet size={19}/></div><dl className={s.definition}><div><dt>Item subtotal</dt><dd>{money(order.subtotalMinor)}</dd></div><div><dt>Commission ({Math.round(getCommissionRate("product",plan)*100)}%)</dt><dd>−{money(commissionMinor)}</dd></div>{pickupFee>0 && <div><dt>Courier collection</dt><dd>−{money(pickupFee)}</dd></div>}<div className={s.net}><dt>Estimated earnings</dt><dd>{money(netMinor-pickupFee)}</dd></div></dl><p className={s.caption}>Estimate based on your current plan. Payment settlement, refunds and adjustments can affect your final payout.</p><dl className={s.definition} style={{marginTop:16}}><div><dt>Customer shipping allocation</dt><dd>{money(order.shippingMinor)}</dd></div></dl><p className={s.caption}>Shipping is handled by LinkWe and is not included in your estimated earnings.</p><Link className={s.secondary} style={{marginTop:15,width:"100%"}} href="/dashboard/vendor/finance">View your finances <ArrowUpRight size={15}/></Link></section>
        {!digital && address && <section className={s.panel} data-tour="order-delivery-location"><div className={s.panelHeading}><h2>Delivery location</h2><MapPin size={19}/></div><p className={s.address}>{addressText}</p><a className={s.secondary} href={directions} target="_blank" rel="noopener noreferrer">Open directions <ArrowUpRight size={15}/></a>{lat!==null && lng!==null && token && <div className={s.map}><StoreMapBox latitude={lat} longitude={lng} mapboxAccessToken={token}/></div>}</section>}
        <details className={`${s.panel} ${s.qrDetails}`} data-tour="order-receipt-qr"><summary>Customer receipt QR <QrCode size={20}/></summary><div className={s.qrContent}><p className={s.caption}>The customer scans this code, signs in and confirms receipt on their own phone.</p><Image src={qr} alt="Customer order receipt confirmation QR code" width={180} height={180} unoptimized/><p className={s.caption}>Only the customer can confirm receipt.</p></div></details>
      </aside>
    </div>
  </div>;
}
