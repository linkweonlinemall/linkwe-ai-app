import Link from "next/link";
import { ArrowUpRight, Download, MapPin, Star, Store, Truck } from "lucide-react";
import ShopImage from "./ShopImage";
import WishlistButton from "@/components/ui/WishlistButton";
import ShopProductCardActions from "./ShopProductCardActions";
import { formatTTDPrice } from "@/lib/format/price";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import type { ShopProduct } from "@/lib/shop/types";
import styles from "./shop.module.css";

export function shopProductHref(product: ShopProduct) { return `${product.preview ? "https://www.linkweonlinemall.com" : ""}/products/${product.slug}`; }
export default function ShopProductCard({ product, saved = false }: { product: ShopProduct; saved?: boolean }) {
  const href = shopProductHref(product);
  const discount = product.compareAtPrice && product.compareAtPrice > product.price ? Math.round((1 - product.price / product.compareAtPrice) * 100) : 0;
  const soldOut = product.hasVariants ? product.variants.length > 0 && product.variants.every(v => v.stock !== null && v.stock <= 0) : product.stock !== null && product.stock <= 0;
  return <article className={styles.card}>
    <div className={styles.cardPhoto}>
      <Link href={href} aria-label={`View ${product.name}`}><ShopImage src={product.images[0]} alt={product.name} /></Link>
      <div className={styles.badges}>{discount > 0 ? <span>Save {discount}%</span> : product.isFeatured ? <span>Featured find</span> : product.isDigital ? <span><Download size={12} aria-hidden />Digital</span> : null}</div>
      {!product.preview && <div className={styles.wishlist}><WishlistButton productId={product.id} initialWishlisted={saved} /></div>}
      <Link href={href} className={styles.photoArrow} aria-label={`Explore ${product.name}`}><ArrowUpRight size={20} aria-hidden /></Link>
    </div>
    <div className={styles.cardBody}>
      <Link href={`${product.preview ? "https://www.linkweonlinemall.com" : ""}/store/${product.store.slug}`} className={styles.cardStore}><Store size={13} aria-hidden /><span>{product.store.name}</span></Link>
      <h3><Link href={href}>{product.name}</Link></h3>
      {product.store.region && <p className={styles.cardLocation}><MapPin size={12} aria-hidden />{getRegionLabel(product.store.region)}</p>}
      {product.rating && product.rating.count > 0 && <p className={styles.rating}><Star size={13} fill="currentColor" aria-hidden /><strong>{product.rating.avg.toFixed(1)}</strong><span>({product.rating.count})</span></p>}
      <div className={styles.cardPrice}><strong>{formatTTDPrice(product.price)}</strong>{discount > 0 && <del>{formatTTDPrice(product.compareAtPrice!)}</del>}</div>
      <div className={styles.cardAvailability}>{soldOut ? <span>Out of stock</span> : !product.preview && !product.hasVariants && product.stock !== null && product.stock <= 5 ? <span className={styles.lowStock}>Only {product.stock} left</span> : product.isDigital ? <span><Download size={12} aria-hidden />Digital download</span> : product.allowDelivery ? <span><Truck size={13} aria-hidden />Delivery available</span> : product.allowPickup ? <span><Store size={13} aria-hidden />Collection available</span> : <span>Discover the details</span>}</div>
      <div className={styles.cardActions}>{product.preview ? <Link href={href}>View product <ArrowUpRight size={16} aria-hidden /></Link> : soldOut ? <Link href={href} className={styles.secondaryAction}>View details <ArrowUpRight size={16} aria-hidden /></Link> : <ShopProductCardActions hasVariants={product.hasVariants} isDigital={product.isDigital} slug={product.slug} productId={product.id} productName={product.name} />}</div>
    </div>
  </article>;
}
