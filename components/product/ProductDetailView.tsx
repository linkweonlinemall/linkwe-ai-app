import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, BadgeCheck, ChevronRight, Download, FileText, MapPin, Package, RotateCcw, ShoppingBag, Star, Truck, ClipboardList } from "lucide-react";
import ProductShowcase from "./ProductShowcase";
import ExpandableDescription from "@/components/ui/ExpandableDescription";
import StorefrontImage from "@/components/storefront/StorefrontImage";
import ProductRecommendationCard, { type ProductRecommendation } from "./ProductRecommendationCard";
import StoreLocationCard from "@/components/storefront/StoreLocationCard";
import { productLabel, productSpecifications, digitalSpecifications, type ProductDisplayData, type ProductOption } from "@/lib/product/display";
import { parseCheckoutFields } from "@/lib/checkout/custom-fields";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { getStoreLocation } from "@/lib/store/location";
import { formatTTDPrice } from "@/lib/format/price";
import styles from "./product.module.css";

type Props = {
  product: ProductDisplayData; variants: ProductOption[]; nav: ReactNode; reviews: ReactNode;
  contactActions: ReactNode; featureAction?: ReactNode; linkedContent?: ReactNode; together?: ReactNode;
  moreFromStore?: ProductRecommendation[]; related?: ProductRecommendation[]; wishlistIds?: string[];
  reviewCount: number; averageRating: number; isVerified: boolean; preview?: boolean;
};
function Specifications({ rows }: { rows: [string, string][] }) {
  return <dl className={styles.specifications}>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
export default function ProductDetailView({ product, variants, nav, reviews, contactActions, featureAction, linkedContent, together, moreFromStore = [], related = [], wishlistIds = [], reviewCount, averageRating, isVerified, preview = false }: Props) {
  const { store } = product;
  const sellerCard = { name: store.name, slug: store.slug, logoUrl: store.logoUrl, region: store.region };
  const storeHref = preview ? `/preview/storefront/${store.slug}` : `/store/${store.slug}`;
  const hasProductPin = product.latitude != null && product.longitude != null && Math.abs(product.latitude) <= 90 && Math.abs(product.longitude) <= 180;
  const locationRecord = { name: store.name, region: store.region, ...(product.address || hasProductPin ? { address: product.address, latitude: product.latitude, longitude: product.longitude } : { address: store.address, latitude: store.latitude, longitude: store.longitude }) };
  const location = getStoreLocation(locationRecord);
  const hasLocation = !!locationRecord.address || location.hasCoordinates;
  const orderFields = [...parseCheckoutFields(store.checkoutFields), ...parseCheckoutFields(product.checkoutFields)];
  const specs = productSpecifications(product);
  const deliverySummary = product.isDigital ? "Digital download" : product.allowDelivery && product.allowPickup ? "Delivery & pickup" : product.allowDelivery ? "Delivery available" : product.allowPickup ? "Local pickup" : "Contact seller for fulfilment";
  const FulfilmentIcon = product.isDigital ? Download : product.allowDelivery ? Truck : MapPin;

  return <div className={styles.page}>
    {preview && <div className={styles.previewBar}><span>LOCAL DESIGN PREVIEW · Real vendor content · Purchasing disabled</span><Link href={`https://www.linkweonlinemall.com/products/${product.slug}`} target="_blank" rel="noopener noreferrer">View live product <ArrowUpRight size={12} aria-hidden /></Link></div>}
    {nav}
    <main className={styles.container}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href={storeHref}><ArrowLeft size={15} aria-hidden />{store.name}</Link><ChevronRight size={13} aria-hidden /><span aria-current="page">{product.name}</span></nav>
      <ProductShowcase productId={product.id} name={product.name} images={product.images} price={product.price} compareAtPrice={product.compareAtPrice} stock={product.stock} sku={product.sku} hasVariants={product.hasVariants} variants={variants} wishlisted={wishlistIds.includes(product.id)} preview={preview}
        heading={<>
          <div className={styles.categoryLine}>{product.category && <span>{productLabel(product.category)}</span>}{product.isFeatured && <span className={styles.featured}>Store pick</span>}{product.isDigital && <span className={styles.featured}>Digital</span>}</div>
          <h1>{product.name}</h1>
          <div className={styles.byline}><Link href={storeHref}>By {store.name}</Link>{product.condition && <span>{productLabel(product.condition)}</span>}{reviewCount > 0 && <a href="#product-reviews"><Star size={14} aria-hidden />{averageRating.toFixed(1)} <span>({reviewCount})</span></a>}</div>
          {product.shortDescription && <p className={styles.shortDescription}>{product.shortDescription}</p>}
        </>}
        afterPurchase={<>
          <a className={styles.fulfilmentSummary} href="#product-delivery"><FulfilmentIcon size={20} aria-hidden /><span>{deliverySummary}</span><ArrowUpRight size={17} aria-hidden /></a>
          <div className={styles.seller}><Link href={storeHref}><div className={styles.sellerLogo}><StorefrontImage src={store.logoUrl} alt={`${store.name} logo`} /></div><span><small>Sold by</small><strong>{store.name}</strong><span><MapPin size={12} aria-hidden />{getRegionLabel(store.region)}{isVerified && <BadgeCheck size={15} aria-label="Verified business" />}</span></span><ArrowUpRight size={18} aria-hidden /></Link><div className={styles.contactActions}>{contactActions}</div>{featureAction}</div>
        </>}
      />
      <nav className={styles.sectionNav} aria-label="Product information"><a href="#product-details"><FileText size={17} aria-hidden />Details</a><a href="#product-delivery"><FulfilmentIcon size={17} aria-hidden />{product.isDigital ? "Download & licence" : "Delivery & returns"}</a>{orderFields.length > 0 && <a href="#product-customisation"><ClipboardList size={17} aria-hidden />Order requirements</a>}<a href="#product-reviews"><Star size={17} aria-hidden />Reviews{reviewCount > 0 && <span>{reviewCount}</span>}</a></nav>
      <div className={styles.detailsGrid} id="product-details">
        <section className={`${styles.detailCard} ${styles.description}`} aria-label="About this product">
          {product.description ? <ExpandableDescription title="About this product" description={product.description} /> : <><h2>About this product</h2><p>{product.shortDescription || "For more details about this item, message the store."}</p></>}
          {product.tags.length > 0 && <details className={styles.tags}><summary>Product tags <span>{product.tags.length}</span></summary><div>{product.tags.map(tag => <span key={tag}>{tag}</span>)}</div></details>}
        </section>
        <section className={styles.detailCard} aria-labelledby="product-specifications"><div className={styles.cardHeading}><Package size={22} aria-hidden /><h2 id="product-specifications">At a glance</h2></div>{specs.length > 0 ? <Specifications rows={specs} /> : <p>Contact the store for further specifications.</p>}</section>
      </div>
      <section className={styles.fulfilmentSection} id="product-delivery" aria-labelledby="fulfilment-title">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>GOOD TO KNOW</p><h2 id="fulfilment-title">{product.isDigital ? <>Your download. <em>The details.</em></> : <>From their store. <em>To you.</em></>}</h2></div></div>
        <div className={styles.fulfilmentGrid}>
          {product.isDigital ? <div className={styles.detailCard}><div className={styles.cardHeading}><Download size={22} aria-hidden /><h3>Digital download</h3></div><p>Access your files after payment is confirmed.</p><Specifications rows={digitalSpecifications(product)} />{product.previewUrl && <a className={styles.primaryLink} href={product.previewUrl} target="_blank" rel="noopener noreferrer">View free preview<ArrowUpRight size={18} aria-hidden /></a>}</div> : <>
            <div className={styles.detailCard}><div className={styles.cardHeading}><Truck size={22} aria-hidden /><h3>Delivery</h3></div><strong className={styles.fulfilmentStatus}>{product.allowDelivery ? "Available for this item" : "Not offered for this item"}</strong>{product.allowDelivery && <><p>{product.deliveryFee != null ? `Vendor-listed delivery fee: ${formatTTDPrice(product.deliveryFee)}. ` : ""}Your final delivery total is shown at checkout.</p>{product.deliveryRegions.length > 0 && <><h4>Delivery areas</h4><div className={styles.regionList}>{product.deliveryRegions.map(region => <span key={region}>{getRegionLabel(region)}</span>)}</div></>}</>}</div>
            <div className={styles.detailCard}><div className={styles.cardHeading}><MapPin size={22} aria-hidden /><h3>Local pickup</h3></div><strong className={styles.fulfilmentStatus}>{product.allowPickup ? "Available from this store" : "Not offered for this item"}</strong>{product.allowPickup && <><p>{location.address}</p><a className={styles.textLink} href={location.directionsHref} target="_blank" rel="noopener noreferrer">Get directions<ArrowUpRight size={17} aria-hidden /></a></>}</div>
          </>}
          <div className={styles.detailCard}><div className={styles.cardHeading}><RotateCcw size={22} aria-hidden /><h3>Returns & policies</h3></div><p className={styles.policyText}>{product.returnPolicy || "The vendor has not added an item-specific return policy. Contact the store before ordering."}</p>{store.policies && <details className={styles.storePolicy}><summary>Store policies</summary><p className={styles.policyText}>{store.policies}</p></details>}</div>
        </div>
        {!product.isDigital && hasLocation && <details className={styles.locationDetails}><summary><MapPin size={18} aria-hidden />{product.allowPickup ? "Pickup location & map" : "Item location & map"}</summary><StoreLocationCard store={locationRecord} /></details>}
        {!product.isDigital && product.previewUrl && <a className={styles.textLink} href={product.previewUrl} target="_blank" rel="noopener noreferrer">View product preview<ArrowUpRight size={17} aria-hidden /></a>}
      </section>
      {orderFields.length > 0 && <section className={styles.detailCard} id="product-customisation"><div className={styles.cardHeading}><ClipboardList size={22} aria-hidden /><h2>Make it yours</h2></div><p>The vendor requests these details at checkout.</p><div className={styles.orderFields}>{orderFields.map((field, index) => <div key={`${field.id}-${index}`}><strong>{field.label}<span>{field.required ? "Required" : "Optional"}</span></strong>{field.options.length > 0 && <p>{field.options.join(" · ")}</p>}{field.type === "upload" && <p>Upload your file at checkout.</p>}</div>)}</div></section>}
      <section className={`${styles.detailCard} ${styles.reviewSection}`} id="product-reviews" aria-label="Product reviews">{reviews}</section>
      {together && <section className={styles.recommendations}>{together}</section>}
      {linkedContent && <section className={styles.recommendations}>{linkedContent}</section>}
      {moreFromStore.length > 0 && <section className={styles.recommendations} id="more-from-store"><div className={styles.sectionHeading}><h2>More from <em>{store.name}.</em></h2><Link href={storeHref}>Visit store<ArrowUpRight size={19} aria-hidden /></Link></div><div className={styles.productGrid}>{moreFromStore.map(item => <ProductRecommendationCard key={item.id} item={{ ...item, store: item.store ?? sellerCard }} preview={preview} wishlisted={wishlistIds.includes(item.id)} />)}</div></section>}
      {related.length > 0 && <section className={styles.recommendations} id="more-like-this"><div className={styles.sectionHeading}><h2>More <em>like this.</em></h2><Link href={`/shop?category=${encodeURIComponent(product.category ?? "")}`}>Explore<ShoppingBag size={18} aria-hidden /></Link></div><div className={styles.productGrid}>{related.map(item => <ProductRecommendationCard key={item.id} item={item} preview={preview} wishlisted={wishlistIds.includes(item.id)} />)}</div></section>}
      <footer className={styles.productFooter}><Link href={storeHref}><ArrowLeft size={16} aria-hidden />Back to {store.name}</Link><Link href="/shop">Explore LinkWe<ArrowUpRight size={16} aria-hidden /></Link></footer>
    </main>
  </div>;
}
