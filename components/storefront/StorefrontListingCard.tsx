"use client";
import Link from "next/link";
import { ArrowUpRight, Clock3, MapPin, ShoppingBag } from "lucide-react";
import AddToCartButton from "@/components/product/AddToCartButton";
import WishlistButton from "@/components/ui/WishlistButton";
import { formatTTDPrice } from "@/lib/format/price";
import StorefrontImage from "./StorefrontImage";
import { storefrontServicePrice, storefrontServiceLocation } from "@/lib/storefront/service-display";
import styles from "./storefront.module.css";
export type StorefrontListing = {
  id: string; name: string; slug: string; price: number; images: string[];
  category: string | null; isFeatured?: boolean; stock?: number | null;
  quotePriceType?: string | null; subscriptionInterval?: string | null; isAvailable?: boolean;
  hasVariants?: boolean; compareAtPrice?: number | null;
  serviceType?: string | null; serviceDuration?: number | null; serviceLocation?: string | null;
};
export function listingHref(item: StorefrontListing, service: boolean, preview = false) {
  return `${preview ? "https://www.linkweonlinemall.com" : ""}/${service ? "service" : "products"}/${item.slug}`;
}
export default function StorefrontListingCard({ item, service = false, preview = false, wishlisted = false, availableNow }: { item: StorefrontListing; service?: boolean; preview?: boolean; wishlisted?: boolean; availableNow?: boolean }) {
  const serviceLocation = storefrontServiceLocation(item.serviceLocation);
  const href = listingHref(item, service, preview);
  const typeLabels: Record<string, string> = { QUOTE: "Made for your brief", BOOKABLE: "Book an appointment", SUBSCRIPTION: "Stay connected", ON_DEMAND: "On demand", VIRTUAL: "Meet online" };
  return <article className={styles.listingCard} data-service={service}>
    <div className={styles.listingMedia}>
      <Link href={href} aria-label={`View ${item.name}`}><StorefrontImage src={item.images[0]} alt={item.name} /></Link>
      {(item.isFeatured || service) && <span className={styles.listingBadge}>{service ? typeLabels[item.serviceType ?? ""] ?? "Local expertise" : "Store pick"}</span>}
      {!preview && <div className={styles.listingSave}><WishlistButton productId={item.id} initialWishlisted={wishlisted} /></div>}
      <Link href={href} className={styles.listingArrow} aria-label={`Explore ${item.name}`}><ArrowUpRight size={21} /></Link>
      {!service && !preview && !item.hasVariants && item.stock === 0 && <span className={styles.stockNote}>Out of stock</span>}
      {!service && !preview && !item.hasVariants && item.stock != null && item.stock > 0 && item.stock <= 5 && <span className={styles.stockNote}>Only {item.stock} left</span>}
    </div>
    <div className={styles.listingInfo}>
      <span className={styles.listingCategory}>{service ? "A little local expertise" : item.category?.replaceAll("_", " ") ?? "From this store"}</span>
      <h3><Link href={href}>{item.name}</Link></h3>
      <div className={styles.listingPrice}><strong>{service ? storefrontServicePrice(item) : `${item.hasVariants ? "From " : ""}${formatTTDPrice(item.price)}`}</strong>{item.compareAtPrice != null && item.compareAtPrice > item.price && <del>{formatTTDPrice(item.compareAtPrice)}</del>}{service && !!item.serviceDuration && <span><Clock3 size={13} aria-hidden />{item.serviceDuration} min</span>}</div>
      {service && serviceLocation && <p className={styles.serviceMeta}><MapPin size={14} aria-hidden />{serviceLocation}</p>}
      {service && item.isAvailable === false && <p className={styles.serviceMeta}>Currently unavailable</p>}
      {service && item.isAvailable !== false && item.serviceType === "ON_DEMAND" && availableNow != null && <p className={styles.serviceMeta}>{availableNow ? "Available now" : "Not available right now"}</p>}
      <div className={styles.listingAction}>{service ? <Link href={href}>{item.serviceType === "QUOTE" ? "Let’s talk details" : "Explore this service"}<ArrowUpRight size={16} aria-hidden /></Link> : preview || item.hasVariants ? <Link href={href}>{item.hasVariants ? "Choose your options" : "Take a closer look"}<ShoppingBag size={16} aria-hidden /></Link> : <AddToCartButton productId={item.id} productName={item.name} stock={item.stock ?? null} />}</div>
    </div>
  </article>;
}
