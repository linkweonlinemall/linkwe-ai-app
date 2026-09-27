"use client";
import Link from "next/link";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {ArrowRight,ShoppingBag,Store,Trash2,X,Minus,Plus,Truck,Download,ShieldCheck} from "lucide-react";
import {getCart,removeFromCart,updateCartQuantity} from "@/app/actions/cart";
import {useCartStore,type CartItem} from "@/lib/cart/cart-store";
import {formatTTDPrice} from "@/lib/format/price";
import {toast} from "sonner";
import s from "./cart-drawer.module.css";
function mapRows(rows: Awaited<ReturnType<typeof getCart>>): CartItem[] {
  return rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    quantity: row.quantity,
    product: {
      id: row.product.id,
      name: row.product.name,
      slug: row.product.slug,
      price: row.product.price,
      images: row.product.images,
      stock: row.product.stock,
      isDigital: row.product.isDigital,
      store: row.product.store,
    },
    variant: row.variant
      ? {
          id: row.variant.id,
          name: row.variant.name,
          stock: row.variant.stock,
          images: row.variant.images,
          price: row.variant.price,
          attributes: row.variant.attributes as { name: string; value: string; hex?: string }[],
        }
      : null,
  }));
}

export default function CartDrawer(){
 const items=useCartStore(s=>s.items),isOpen=useCartStore(s=>s.isOpen),close=useCartStore(s=>s.closeDrawer),setItems=useCartStore(s=>s.setItems);
 const dialog=useRef<HTMLDialogElement>(null),[busy,setBusy]=useState<string|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState("");
 const refresh=useCallback(async()=>{setItems(mapRows(await getCart()));},[setItems]);
 useEffect(()=>{if(!isOpen){dialog.current?.close();return;}dialog.current?.showModal();const previous=document.body.style.overflow;document.body.style.overflow="hidden";let active=true;setLoading(true);setError("");void refresh().catch(()=>{if(active)setError("Couldn’t refresh your cart. Please reopen it to try again.");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;document.body.style.overflow=previous;};},[isOpen,refresh]);
 const count=items.reduce((n,i)=>n+i.quantity,0),subtotal=items.reduce((n,i)=>n+(i.variant?.price??i.product.price)*i.quantity,0),allDigital=items.length>0&&items.every(i=>i.product.isDigital);
 const groups=useMemo(()=>{const groups=new Map<string,CartItem[]>();for(const item of items)groups.set(item.product.store.slug,[...(groups.get(item.product.store.slug)??[]),item]);return [...groups.values()];},[items]);
 async function change(item:CartItem,qty:number|null){if(busy)return;setBusy(item.id);setError("");try{if(qty===null){await removeFromCart(item.id);toast.success("Removed from your cart");}else{const result=await updateCartQuantity(item.id,qty);if(!result.ok){setError(result.error);return;}}await refresh();}catch{setError("Couldn’t update your cart. Please try again.");}finally{setBusy(null);}}
 return <dialog ref={dialog} className={s.dialog} aria-labelledby="cart-drawer-title" onClose={close} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}}}><div className={s.panel}><header><div><span>GOOD FINDS. GREAT CHOICES.</span><h2 id="cart-drawer-title">Your <em>shopping bag.</em></h2><p>{count} {count===1?"item":"items"} · {groups.length} local {groups.length===1?"store":"stores"}</p></div><button aria-label="Close cart" onClick={close}><X size={21}/></button></header><div className={s.body} aria-busy={loading||!!busy}>{error&&<p role="alert" className={s.error}>{error}</p>}{!items.length?<div className={s.empty}><ShoppingBag size={44}/><h3>Make room for a little local.</h3><p>Your next favourite is waiting to be discovered.</p><Link href="/shop" onClick={close}>Explore the marketplace <ArrowRight size={17}/></Link></div>:groups.map(group=><section key={group[0].product.store.slug} className={s.group}><Link className={s.store} href={`/store/${group[0].product.store.slug}`} onClick={close}><Store size={15}/>{group[0].product.store.name}<ArrowRight size={13}/></Link>{group.map(item=>{const price=item.variant?.price??item.product.price,stock=item.variant?.stock===undefined?item.product.stock:item.variant.stock,img=item.variant?.images?.[0]??item.product.images[0];return <article key={item.id} className={s.item} data-busy={busy===item.id}><Link className={s.image} href={`/products/${item.product.slug}`} onClick={close}>{img?<img src={img} alt={item.product.name}/>:<ShoppingBag size={27}/>}</Link><div className={s.details}><Link href={`/products/${item.product.slug}`} onClick={close}>{item.product.name}</Link>{item.variant&&<p>{item.variant.attributes.map(a=>a.value).join(" / ")}</p>}<small>{formatTTDPrice(price)} each{item.product.isDigital?" · Digital download":""}</small><div className={s.itemBottom}><div className={s.quantity}><button aria-label={`Decrease ${item.product.name} quantity`} disabled={!!busy||loading||item.quantity<=1} onClick={()=>void change(item,item.quantity-1)}><Minus size={13}/></button><span aria-live="polite">{item.quantity}</span><button aria-label={`Increase ${item.product.name} quantity`} disabled={!!busy||loading||(stock!==null&&item.quantity>=stock)} onClick={()=>void change(item,item.quantity+1)}><Plus size={13}/></button></div><strong>{formatTTDPrice(price*item.quantity)}</strong><button className={s.remove} aria-label={`Remove ${item.product.name}`} disabled={!!busy||loading} onClick={()=>void change(item,null)}><Trash2 size={15}/></button></div>{stock!==null&&item.quantity>=stock&&<small className={s.stock}>All available stock is in your bag</small>}</div></article>;})}</section>)}</div>{!!items.length&&<footer><div className={s.total}><span>Subtotal</span><strong>{formatTTDPrice(subtotal)}</strong></div><p>{allDigital?<Download size={15}/>:<Truck size={15}/>} {allDigital?"Digital delivery · no shipping fee":"Delivery options and fees shown at checkout"}</p><Link className={s.checkout} href="/checkout" onClick={close}>Continue to checkout <ArrowRight size={18}/></Link><Link className={s.view} href="/cart" onClick={close}>Review your cart</Link><small><ShieldCheck size={13}/> Your items and availability are checked at checkout</small></footer>}</div></dialog>;
}
