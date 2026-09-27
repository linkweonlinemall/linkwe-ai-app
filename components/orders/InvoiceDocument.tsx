import InvoiceTemplate from "./InvoiceTemplate";
type OrderItem = {
  id: string;
  titleSnapshot: string;
  priceMinor: number;
  quantity: number;
  product: {
    name: string;
    images: string[];
    store: { name: string };
  } | null;
};

type InvoiceOrder = {
  id: string;
  referenceNumber?: string | null;
  status: string;
  createdAt: Date;
  totalMinor: number;
  subtotalMinor: number;
  shippingMinor: number;
  region: string;
  buyer: { fullName: string; email: string };
  items: OrderItem[];
};

type Props = {
  order: InvoiceOrder;
  qrCodeDataUrl: string;
  logoDataUrl: string | null;
  waveDataUrl: string | null;
};

export function InvoiceDocument({order,qrCodeDataUrl,logoDataUrl}:Props){
 const reference=order.referenceNumber ?? `LW-${order.id.slice(-8).toUpperCase()}`;
 const unpaid=["DRAFT","PENDING_PAYMENT"].includes(order.status);
 const status=unpaid?"PAYMENT PENDING":order.status==="REFUNDED"?"REFUNDED":order.status==="CANCELLED"?"CANCELLED":"PAID";
 const discount=order.subtotalMinor+order.shippingMinor-order.totalMinor;
 return <InvoiceTemplate data={{brand:"LinkWe Online Mall",logo:logoDataUrl,reference,date:order.createdAt,status,buyer:order.buyer,region:order.region,from:["LinkWe Online Mall","Trinidad & Tobago","admin@linkwemall.com"],items:order.items.map(i=>({id:i.id,title:i.titleSnapshot,store:i.product?.store.name,image:i.product?.images[0],quantity:i.quantity,unit:i.priceMinor,total:i.priceMinor*i.quantity})),totals:[{label:"Subtotal",amount:order.subtotalMinor},...(discount>0?[{label:"Discount",amount:-discount}]:[]),{label:"Shipping",amount:order.shippingMinor}],finalLabel:status==="PAID"?"Total paid":"Order total",finalAmount:order.totalMinor,note:"Keep this invoice for your records. Delivery arrangements and the latest order status are available in your account.",information:[{title:"Payment information",lines:[`Status: ${status}`,`Reference: ${reference}`,"Currency: Trinidad & Tobago dollars"]},{title:"Delivery information",lines:[`Location: ${order.region.replaceAll("_"," ")}`,"See your order for delivery or pickup updates."]}],qr:qrCodeDataUrl}}/>;
}
