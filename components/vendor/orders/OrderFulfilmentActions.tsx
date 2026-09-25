"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Check, Download, Truck, Warehouse } from "lucide-react";
import { submitOrderHandover } from "@/app/actions/vendor-order-workflow";
import { orderMoney } from "@/lib/vendor/order-workspace";
import s from "./orders.module.css";

export default function OrderFulfilmentActions({ id, digital, pickupFeeMinor }: { id: string; digital: boolean; pickupFeeMinor: number }) {
  const [method, setMethod] = useState(digital ? "digital" : "");
  const [confirmed, setConfirmed] = useState(false);
  const [state, action, pending] = useActionState(submitOrderHandover, { error: "" });
  return <section data-tour="order-fulfilment-action" className={s.actionPanel} aria-labelledby="handover-heading">
    <p className={s.eyebrow}>YOUR NEXT STEP</p>
    <h2 id="handover-heading">{digital ? "Ready to deliver something good?" : "Packed. Labelled. Ready to go."}</h2>
    <p>{digital ? "Make sure the customer can access everything they purchased, then confirm that you’ve fulfilled their order." : "Check the items and customer requirements below. Label your parcel with the order reference, then choose how it gets to LinkWe."}</p>
    <form action={action}>
      <input type="hidden" name="splitOrderId" value={id}/><input type="hidden" name="method" value={method}/>
      {!digital && <div className={s.actionChoices} role="group" aria-label="Choose order handover">
        {[{value:"dropoff", title:"I’ll drop it off", price:"No collection fee", Icon:Warehouse, note:"Bring your packed parcel to the LinkWe warehouse."}, {value:"pickup", title:"Collect from my store", price:orderMoney(pickupFeeMinor), Icon:Truck, note:"LinkWe arranges a courier. The collection fee is deducted from this order’s earnings."}].map(option=><button type="button" key={option.value} data-selected={method===option.value} aria-pressed={method===option.value} disabled={pending} onClick={()=>{setMethod(option.value);setConfirmed(false);}}><strong><option.Icon size={19}/><span style={{flex:1}}>{option.title}</span>{method===option.value && <Check size={17}/>}</strong><small><b>{option.price}</b><br/>{option.note}</small></button>)}
      </div>}
      {!!method && <div className={s.actionConfirm}>
        <label style={{display:"flex",gap:10,alignItems:"flex-start"}}><input style={{marginTop:5,accentColor:"#d4450a",width:17,height:17,flexShrink:0}} type="checkbox" name="confirmed" value="yes" checked={confirmed} disabled={pending} onChange={e=>setConfirmed(e.target.checked)}/><span>{digital ? "I have provided the purchased digital content to the customer." : method==="pickup" ? `My parcel is ready. I agree to the ${orderMoney(pickupFeeMinor)} collection fee.` : "My parcel is packed and labelled for warehouse drop-off."}</span></label>
        <button className={s.primary} disabled={!confirmed||pending} type="submit">{pending ? "Updating order…" : digital ? "Confirm fulfilment" : method==="pickup" ? "Request collection" : "Confirm drop-off plan"}{digital ? <Download size={16}/> : <ArrowRight size={16}/>}</button>
      </div>}
      {state.error && <p className={s.error} role="alert">{state.error}</p>}
    </form>
  </section>;
}
