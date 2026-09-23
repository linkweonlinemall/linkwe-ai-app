import Link from "next/link";
import { ArrowDown, ArrowUpRight, Heart, Sparkles, Store } from "lucide-react";
import type { ShopProduct } from "@/lib/shop/types";
import ShopImage from "./ShopImage";
import { formatTTDPrice } from "@/lib/format/price";
import { shopProductHref } from "./ShopProductCard";
import styles from "./shop.module.css";

export default function ShopHero({ products }: { products: ShopProduct[] }) {
  return <section className={styles.hero} aria-labelledby="shop-title">
    <div className={styles.heroCopy}>
      <p className={styles.eyebrow}><span />THE LINKWE MARKETPLACE</p>
      <h1 id="shop-title">Good finds.<br /><em>Great local energy.</em></h1>
      <p>A little style. A little self-care. Something that’s so you.<br className={styles.desktopBreak} /> Discover your next favourite from our local stores.</p>
      <div className={styles.heroActions}><a href="#shop-results" className={styles.primaryButton}>Find your something <ArrowDown size={17} aria-hidden /></a><Link href="/stores">Meet the stores <ArrowUpRight size={17} aria-hidden /></Link></div>
      <div className={styles.heroFoot}><span><Store size={15} aria-hidden />Local stores. Real people.</span><span><Heart size={15} aria-hidden />A little more connection.</span></div>
    </div>
    {products.length > 0 && <div className={styles.heroGallery}>
      <div className={styles.galleryLabel}><Sparkles size={16} aria-hidden /><span>A LITTLE LOCAL INSPIRATION</span></div>
      {products.slice(0,3).map((product,index) => <Link href={shopProductHref(product)} key={product.id} className={styles.heroFind} data-position={index}>
        <div className={styles.heroPhoto}><ShopImage src={product.images[0]} alt={product.name} hero /></div>
        <div className={styles.heroCaption}><span><small>{product.store.name}</small><strong>{product.name}</strong></span><ArrowUpRight size={17} aria-hidden /></div>
        <span className={styles.heroPrice}>{formatTTDPrice(product.price)}</span>
      </Link>)}
      <span className={styles.galleryNote}>Found here. Loved everywhere.</span>
    </div>}
  </section>;
}
