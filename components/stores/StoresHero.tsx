import Link from "next/link";
import { ArrowDown, ArrowUpRight, Heart, MapPin } from "lucide-react";
import ShopImage from "@/components/shop/ShopImage";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { storeHref, type DirectoryStore } from "@/lib/stores/directory-query";
import styles from "./directory.module.css";

export default function StoresHero({stores}:{stores:DirectoryStore[]}){
  return <section className={styles.hero} aria-labelledby="stores-title"><div className={styles.heroCopy}><p className={styles.eyebrow}><span/>THE PEOPLE BEHIND YOUR NEXT FAVOURITE</p><h1 id="stores-title">Big on passion.<br/><em>Brilliantly local.</em></h1><p>Independent stores. Familiar faces. Fresh discoveries.<br/>Find the people making something special, right here in T&amp;T.</p><div className={styles.heroActions}><a href="#store-results">Meet your next favourite <ArrowDown size={17} aria-hidden/></a><Link href="/saved-stores"><Heart size={16} aria-hidden/>Stores you follow</Link></div><div className={styles.heroFoot}><span>WE PEOPLE.</span><span>WE BUSINESS.</span><strong>WE LOCAL.</strong></div></div>
    {stores.length>0?<div className={styles.heroGallery}><div className={styles.galleryCaption}><span>A FEW PEOPLE TO KNOW</span><ArrowUpRight size={19} aria-hidden/></div>{stores.map((store,index)=><Link key={store.id} href={storeHref(store)} className={styles.heroStore} data-position={index}><div className={styles.heroPhoto}><ShopImage src={store.coverPhotoUrl} alt={store.name+" cover"} hero/></div><div className={styles.heroIdentity}><div className={styles.heroLogo}><ShopImage src={store.logoUrl} alt="" hero/></div><div><strong>{store.name}</strong><span><MapPin size={11} aria-hidden/>{getRegionLabel(store.region)}</span></div><ArrowUpRight size={19} aria-hidden/></div></Link>)}</div>:<div className={styles.heroEmpty}><Heart size={72} strokeWidth={1} aria-hidden/><strong>Small businesses.<br/>A world of possibility.</strong></div>}
  </section>;
}
