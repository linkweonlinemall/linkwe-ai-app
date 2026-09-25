"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowUpRight, Package, Plus, Check } from "lucide-react";
import { addToCart, getCart } from "@/app/actions/cart";
import { useCartStore, type CartItem } from "@/lib/cart/cart-store";
import { formatTTDPrice } from "@/lib/format/price";
import styles from "@/components/customer/customer.module.css";
export type CartRecommendation={id:string;name:string;slug:string;price:number;images:string[];store:{name:string;slug:string}};
export default function CartRecommendationsRow({products}:{products:CartRecommendation[]}) {
 const router=useRouter();const setItems=useCartStore(s=>s.setItems);const bump=useCartStore(s=>s.bumpCartIcon);const [pending,startTransition]=useTransition();const [pendingId,setPendingId]=useState<string|null>(null);const [added,setAdded]=useState<string|null>(null);const [error,setError]=useState("");
 if(!products.length)return null;
 function add(id:string){setPendingId(id);setError("");startTransition(async()=>{try{const result=await addToCart(id,1);if(!result.ok){if(result.error==="not_logged_in"){router.push("/login?callbackUrl=%2Fcart");return;}setError("This item couldn’t be added. Open its product page to check availability.");return;}const rows=await getCart();setItems(rows.map(item=>({...item,variant:item.variant?{...item.variant,attributes:Array.isArray(item.variant.attributes)?item.variant.attributes as NonNullable<CartItem["variant"]>["attributes"]:[]}:null})));bump();setAdded(id);router.refresh();}catch{setError("We couldn’t add that item. Please try again.");}finally{setPendingId(null);}});}
 return <section className={styles.recommendations}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>A LITTLE MORE TO LOVE</span><h2>Good finds have <em>good company.</em></h2></div><Link href="/shop" className={styles.secondary}>Explore<ArrowUpRight size={16}/></Link></div>{error&&<p className={styles.error} role="alert">{error}</p>}<div className={styles.recommendGrid}>{products.map(product=><article className={styles.recommendCard} key={product.id}><Link href={`/products/${product.slug}`} className={styles.recommendImage} aria-label={`View ${product.name}`}>{product.images[0]?<img src={product.images[0]} alt={product.name}/>:<Package size={35}/>}</Link><div className={styles.recommendBody}><Link href={`/store/${product.store.slug}`}>{product.store.name}</Link><h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3><strong>{formatTTDPrice(product.price)}</strong><button className={styles.primary} disabled={pending} onClick={()=>add(product.id)}>{pending&&pendingId===product.id?"Adding…":added===product.id?"Added to cart":"Add to cart"}{added===product.id?<Check size={15}/>:<Plus size={15}/>}</button></div></article>)}</div></section>;
}
