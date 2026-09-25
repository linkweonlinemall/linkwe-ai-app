export type CouponKind = "product" | "service" | "event";
export type CouponLine={key:string;subtotalMinor:number;parentKey?:string};
export type CouponSnapshot = { code:string; storeId:string; couponId:string; subtotalMinor:number; discountMinor:number; totalMinor:number;eligibleSubtotalMinor?:number;eligibleKeys?:string[] };
export class CouponError extends Error {}
export function normalizeCoupon(code:string){return code.trim().toUpperCase();}
export function couponDiscount(subtotal:number,type:string,value:number){
 if(!Number.isSafeInteger(subtotal)||subtotal<0||!Number.isSafeInteger(value)||value<=0)throw new CouponError("Invalid discount amount.");
 if(type!=="PERCENT"&&type!=="FIXED"||type==="PERCENT"&&value>100)throw new CouponError("Invalid discount type.");
 return Math.min(subtotal,type==="PERCENT"?Math.round(subtotal*value/100):value);
}
export function originalCouponSubtotal(snapshot:unknown,fallback:number):number {
 if(snapshot&&typeof snapshot==="object"&&"subtotalMinor" in snapshot&&Number.isSafeInteger(snapshot.subtotalMinor)&&Number(snapshot.subtotalMinor)>=0)return Number(snapshot.subtotalMinor);
 return fallback;
}
/** Exact cents, proportional to each line, with stable largest-remainder allocation. */
export function allocateDiscount(totals:number[],discount:number):number[]{
 const sum=totals.reduce((a,b)=>a+b,0);
 if(totals.some(n=>!Number.isSafeInteger(n)||n<0)||!Number.isSafeInteger(discount)||discount<0||discount>sum)throw new CouponError("Invalid discount allocation.");
 if(!sum)return totals.map(()=>0);
 const allocations=totals.map(total=>Math.floor(total*discount/sum));
 let remainder=discount-allocations.reduce((a,b)=>a+b,0);
 const order=totals.map((total,index)=>({index,fraction:total*discount/sum-allocations[index]})).sort((a,b)=>b.fraction-a.fraction||a.index-b.index);
 for(const row of order){if(remainder--<=0)break;allocations[row.index]++;}
 return allocations;
}
/** At most two price groups preserve the exact total when quantity doesn't divide evenly. */
export function discountedUnits(priceMinor:number,quantity:number,discountMinor:number){
 if(!Number.isSafeInteger(quantity)||quantity<1||!Number.isSafeInteger(discountMinor)||discountMinor<0||discountMinor>priceMinor*quantity)throw new CouponError("Invalid discounted quantity.");
 const total=priceMinor*quantity-discountMinor;const base=Math.floor(total/quantity);const remainder=total%quantity;
 return [...(quantity-remainder?[{priceMinor:base,quantity:quantity-remainder}]:[]),...(remainder?[{priceMinor:base+1,quantity:remainder}]:[])];
}
