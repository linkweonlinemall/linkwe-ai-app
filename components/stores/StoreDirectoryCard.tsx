import Link from "next/link";
import { ArrowUpRight, CalendarDays, ConciergeBell, MapPin, Package, ShieldCheck, Star, Store } from "lucide-react";
import ShopImage from "@/components/shop/ShopImage";
import SaveStoreButton from "@/components/ui/SaveStoreButton";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { storeCategory, storeHref, type DirectoryStore } from "@/lib/stores/directory-query";
import styles from "./directory.module.css";

export default function StoreDirectoryCard({store,index,saved=false}:{store:DirectoryStore;index:number;saved?:boolean}){
  const href=storeHref(store),initials=store.name.split(/\s+/).map(w=>w[0]).join("").slice(0,2);
  return <article className={styles.card} data-tone={index%4}>
    <div className={styles.cover}><Link href={href} aria-label={"Explore "+store.name}>{store.coverPhotoUrl?<ShopImage src={store.coverPhotoUrl} alt={store.name+" store cover"}/>:<div className={styles.coverFallback}><Store size={43} strokeWidth={1} aria-hidden/><span>{store.name}</span></div>}</Link>{!store.preview&&<SaveStoreButton storeId={store.id} initialSaved={saved} variant="iconOverlay"/>}<span className={styles.coverLabel}>{storeCategory(store.categoryId)}</span></div>
    <div className={styles.cardBody}><div className={styles.identity}><Link href={href} className={styles.logo} aria-label={store.name+" storefront"}>{store.logoUrl?<ShopImage src={store.logoUrl} alt=""/>:<span>{initials}</span>}</Link><span className={styles.localLabel}>{store.preview?"MEET YOUR NEXT FAVOURITE":<><ShieldCheck size={13} aria-hidden/>VERIFIED BUSINESS</>}</span></div>
      <h3><Link href={href}>{store.name}<ArrowUpRight size={22} aria-hidden/></Link></h3><p className={styles.tagline}>{store.tagline||store.description||"A local business with something for you. Step inside and explore."}</p>
      <div className={styles.cardMeta}><span><MapPin size={14} aria-hidden/>{getRegionLabel(store.region)}</span>{store.reviewCount>0&&store.averageRating!==null&&<span className={styles.rating}><Star size={13} fill="currentColor" aria-hidden/>{store.averageRating.toFixed(1)} <small>({store.reviewCount})</small></span>}</div>
      <div className={styles.offers}>{(store.productCount??0)>0&&<span><Package size={13} aria-hidden/>{store.productCount} {store.productCount===1?"product":"products"}</span>}{(store.serviceCount??0)>0&&<span><ConciergeBell size={13} aria-hidden/>{store.serviceCount} {store.serviceCount===1?"service":"services"}</span>}{(store.eventCount??0)>0&&<span><CalendarDays size={13} aria-hidden/>{store.eventCount} {store.eventCount===1?"event":"events"}</span>}{(store.listingCount??0)>0&&<span>{store.listingCount} {store.listingCount===1?"listing":"listings"}</span>}{store.preview&&<span>{store.offers.includes("products")?"Explore the collection":"Discover their services"}</span>}</div>
      {store.distanceKm!==null&&<p className={styles.distance}>About {store.distanceKm<10?store.distanceKm.toFixed(1):Math.round(store.distanceKm)} km away</p>}
      <Link href={href} className={styles.visit}>Step inside <span><ArrowUpRight size={19} aria-hidden/></span></Link>
    </div>
  </article>;
}
