import InvoiceTemplate from "./InvoiceTemplate";
import { calculateEarningsMinor, type CommissionPlan } from "@/lib/finance/commission";
export type SplitOrderItem = {
  id: string;
  titleSnapshot: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
};

export type VendorSplitOrder = {
  id: string;
  mainOrderId: string;
  referenceNumber: string | null;
  subtotalMinor: number;
  earningsReleased?: boolean;
  ledgerEntries?: {grossMinor:number|null;commissionMinor:number|null;netMinor:number|null}[];
  createdAt: Date;
  store: {
    name: string;
    slug: string;
    tagline: string | null;
    logoUrl: string | null;
    region: string;
    address: string | null;
    owner: {
      fullName: string;
      email: string;
      bankDetails: { bankName: string; accountName: string } | null;
    };
  };
  items: SplitOrderItem[];
  mainOrder: {
    referenceNumber: string | null;
    region: string;
    createdAt: Date;
    buyer: { fullName: string; email: string };
  };
};

type Props = {
  splitOrder: VendorSplitOrder;
  qrCodeDataUrl: string;
  waveDataUrl: string | null;
  plan: CommissionPlan;
};

export function VendorInvoiceDocument({splitOrder:s,qrCodeDataUrl,plan}:Props){
 const reference=s.referenceNumber??`SP-${s.id.slice(-8).toUpperCase()}`;
 const settled=s.ledgerEntries?.[0];
 const estimate=calculateEarningsMinor(s.subtotalMinor,"product",plan);
 const commission=settled?.commissionMinor??estimate.commissionMinor;
 const net=settled?.netMinor??estimate.netMinor;
 const final=Boolean(settled);
 return <InvoiceTemplate data={{vendor:true,brand:s.store.name,logo:s.store.logoUrl,reference,parentReference:s.mainOrder.referenceNumber??`LW-${s.mainOrderId.slice(-8).toUpperCase()}`,date:s.mainOrder.createdAt,status:final?"EARNINGS RELEASED":"EARNINGS ESTIMATE",buyer:s.mainOrder.buyer,region:s.mainOrder.region,from:[s.store.name,[s.store.address,s.store.region.replaceAll("_"," ")].filter(Boolean).join(", "),s.store.owner.email],items:s.items.map(i=>({id:i.id,title:i.titleSnapshot,quantity:i.quantity,unit:i.unitPriceMinor,total:i.lineTotalMinor})),totals:[{label:"Subtotal",amount:s.subtotalMinor},{label:"Platform commission",amount:-commission}],finalLabel:final?"Net earnings":"Estimated earnings",finalAmount:net,note:final?"Your portion of the order after platform commission. Separate collection fees, refunds, adjustments and payouts appear in Finance.":"An estimate using your current plan. Final earnings are recorded when released. Separate collection fees and adjustments appear in Finance.",information:[{title:"Settlement details",lines:s.store.owner.bankDetails?[`Bank: ${s.store.owner.bankDetails.bankName}`,`Account name: ${s.store.owner.bankDetails.accountName}`,"Manage bank details securely in Finance."]:["Add your payout account in Finance.","Payout eligibility is shown in your dashboard."]},{title:"Order reference",lines:[`Store order: ${reference}`,`Main order: ${s.mainOrder.referenceNumber??s.mainOrderId}`,"This document is not a payout confirmation."]}],qr:qrCodeDataUrl}}/>;
}
