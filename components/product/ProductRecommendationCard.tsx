"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import StorefrontImage from "@/components/storefront/StorefrontImage";
import { listingHref, type StorefrontListing } from "@/components/storefront/StorefrontListingCard";
import WishlistButton from "@/components/ui/WishlistButton";
import AddToCartButton from "./AddToCartButton";
import { formatTTDPrice } from "@/lib/format/price";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { productLabel } from "@/lib/product/display";
import styles from "./recommendation.module.css";

export type ProductRecommendation = StorefrontListing & { store?: { name: string; slug: string; logoUrl?: string | null; region?: string } };

export default function ProductRecommendationCard({ item, preview = false, wishlisted = false }: { item: ProductRecommendation; preview?: boolean; wishlisted?: boolean }) {
  const href = listingHref(item, false, preview);
  const storeHref = item.store ? `${preview ? "https://www.linkweonlinemall.com" : ""}/store/${item.store.slug}` : null;
  const saving = !item.hasVariants && item.compareAtPrice != null && item.compareAtPrice > item.price ? Math.round((1 - item.price / item.compareAtPrice) * 100) : 0;
  return <article className={styles.card}>
    <div className={styles.media}>
      <Link href={href} aria-label={`View ${item.name}`}><StorefrontImage src={item.images[0]} alt={item.name} /></Link>
      {(saving > 0 || item.isFeatured) && <span className={styles.badge}>{saving > 0 ? `Save ${saving}%` : "Store pick"}</span>}
      {!preview && <div className={styles.save}><WishlistButton productId={item.id} initialWishlisted={wishlisted} /></div>}
      <Link className={styles.explore} href={href} aria-label={`Explore ${item.name}`}><ArrowUpRight size={21} aria-hidden /></Link>
    </div>
    <div className={styles.info}>
      {item.category && <span className={styles.category}>{productLabel(item.category)}</span>}
      <h3><Link href={href}>{item.name}</Link></h3>
      <div className={styles.price}><strong>{item.hasVariants ? "From " : ""}{formatTTDPrice(item.price)}</strong>{saving > 0 && <del>{formatTTDPrice(item.compareAtPrice!)}</del>}</div>
      {item.store && storeHref && <Link href={storeHref} className={styles.store}><span className={styles.logo}><StorefrontImage src={item.store.logoUrl} alt="" /></span><span><strong>{item.store.name}</strong>{item.store.region && <span><MapPin size={11} aria-hidden />{getRegionLabel(item.store.region)}</span>}</span><ArrowUpRight size={14} aria-hidden /></Link>}
      {!item.hasVariants && item.stock != null && item.stock <= 5 && <p className={styles.stock}>{item.stock === 0 ? "Out of stock" : `Only ${item.stock} left`}</p>}
      <div className={styles.action}>{preview || item.hasVariants ? <Link href={href}>{item.hasVariants ? "Choose options" : "View product"}<ArrowUpRight size={17} aria-hidden /></Link> : <AddToCartButton productId={item.id} productName={item.name} stock={item.stock ?? null} />}</div>
    </div>
  </article>;
}
