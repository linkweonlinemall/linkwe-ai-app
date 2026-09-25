export type CartAvailabilityInput = { quantity:number; product:{ stock:number|null; hasVariants:boolean; isPublished:boolean; isArchived:boolean; isService:boolean; store:{status:string;owner:{idVerificationStatus:string}} }; variant:{stock:number|null}|null };
export function cartStock(item: Pick<CartAvailabilityInput,"product"|"variant">) { return item.variant ? item.variant.stock : item.product.stock; }
export function cartIssue(item: CartAvailabilityInput) {
 if(!item.product.isPublished||item.product.isArchived||item.product.isService||item.product.store.status!=="ACTIVE"||item.product.store.owner.idVerificationStatus!=="APPROVED")return "This item is no longer available. Remove it to continue.";
 if(item.product.hasVariants&&!item.variant)return "Choose your options again on the product page.";
 const stock=cartStock(item);
 if(stock!==null&&stock<1)return "Currently out of stock. Remove it to continue.";
 if(stock!==null&&item.quantity>stock)return `Only ${stock} available. Reduce the quantity to continue.`;
 return null;
}
export function variantLabel(attributes: unknown, fallback="") {
 if(!Array.isArray(attributes))return fallback;
 const values=attributes.flatMap(value=>value&&typeof value==="object"&&typeof value.value==="string"?[value.value]:[]);
 return values.join(" / ")||fallback;
}
