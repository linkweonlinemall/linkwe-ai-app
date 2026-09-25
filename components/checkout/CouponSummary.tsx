import { Tag } from "lucide-react";
export default function CouponSummary({snapshot,storeId}:{snapshot:unknown;storeId?:string}){
 if(!snapshot||typeof snapshot!=="object")return null;
 let row=snapshot as Record<string,unknown>;
 if(storeId&&Array.isArray(row.stores)){const selected=row.stores.find(value=>value&&typeof value==="object"&&value.storeId===storeId);if(!selected)return null;row=selected;}
 if(typeof row.code!=="string"||typeof row.discountMinor!=="number"||row.discountMinor<=0)return null;
 return <div className="my-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800"><Tag size={14}/><strong>{row.code}</strong><span>Saved TTD {(row.discountMinor/100).toFixed(2)} · included in the prices shown</span></div>;
}
