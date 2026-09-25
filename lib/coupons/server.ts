import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { CouponError, couponDiscount, normalizeCoupon, type CouponKind, type CouponSnapshot, type CouponLine } from "./pricing";
export async function priceCoupon(storeId:string,kind:CouponKind,code:string|undefined,input:number|CouponLine[],db:Pick<Prisma.TransactionClient,"storeCoupon">=prisma):Promise<CouponSnapshot|null>{
 if(!code?.trim())return null;
 const row=await db.storeCoupon.findUnique({where:{storeId_code:{storeId,code:normalizeCoupon(code)}}});
 if(!row||!row.active||row.expiresAt&&row.expiresAt<=new Date()||!row.scopes.includes(kind))throw new CouponError("This coupon isn’t valid for this creation.");
 const lines=typeof input==="number"?[{key:"",subtotalMinor:input}]:input;
 const subtotalMinor=lines.reduce((sum,line)=>sum+line.subtotalMinor,0);
 const eligible=lines.filter(line=>!row.targets.length||row.targets.includes(line.key)||!!line.parentKey&&row.targets.includes(line.parentKey));
 if(!eligible.length)throw new CouponError("This coupon applies only to the vendor’s selected creations.");
 const eligibleSubtotalMinor=eligible.reduce((sum,line)=>sum+line.subtotalMinor,0);
 if(eligibleSubtotalMinor<row.minimumMinor)throw new CouponError(`Spend at least TTD ${(row.minimumMinor/100).toFixed(2)} on eligible creations from this store.`);
 const discountMinor=couponDiscount(eligibleSubtotalMinor,row.discountType,row.discountValue);
 if(!discountMinor)throw new CouponError("These eligible creations are already free. No coupon is needed.");
 return {couponId:row.id,storeId,code:row.code,subtotalMinor,eligibleSubtotalMinor,eligibleKeys:[...new Set(eligible.map(line=>line.key))],discountMinor,totalMinor:subtotalMinor-discountMinor};
}
