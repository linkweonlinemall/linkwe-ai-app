import Link from "next/link";
import { Manrope } from "next/font/google";
import { ArrowLeft, ArrowUpRight, MapPin, ShieldCheck, Star } from "lucide-react";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { getStoreLocation } from "@/lib/store/location";
import { getStoreCategoryLabel } from "@/lib/categories";
import StoreHeroActions from "./StoreHeroActions";
import StoreHeroShell from "./StoreHeroShell";
import StorefrontImage from "./StorefrontImage";
import type { StorefrontListing } from "./StorefrontListingCard";
import styles from "./storefront.module.css";

const storeDisplay = Manrope({ subsets: ["latin"], variable: "--font-store-display", display: "swap" });

type Props = {
  store: { id: string; name: string; slug: string; tagline: string | null; logoUrl: string | null; coverPhotoUrl: string | null; categoryId: string; region: string; latitude?: number | null; longitude?: number | null; address?: string | null; };
  initials: string; canEditStore: boolean; isLoggedIn: boolean; initialFollowing: boolean;
  averageRating: number; reviewCount: number; isVerified?: boolean; serviceFirst?: boolean;
  spotlight?: StorefrontListing; preview?: boolean; basePath?: string;
};
export default function StorePageHero({ store, initials, canEditStore, isLoggedIn, initialFollowing, averageRating, reviewCount, isVerified, serviceFirst = false, spotlight, preview = false, basePath }: Props) {
  const path = basePath ?? `/store/${store.slug}`;
  const location = getStoreLocation(store);
  const category = getStoreCategoryLabel(store.categoryId);
  return <StoreHeroShell coverPhotoUrl={store.coverPhotoUrl} logoUrl={store.logoUrl} className={storeDisplay.variable}>
    <div className={styles.container}>
      <div className={styles.breadcrumb}><Link href="/stores"><ArrowLeft size={15} aria-hidden /> All local stores</Link><span>THE PEOPLE BEHIND YOUR NEXT FAVOURITE.</span><Link href="/">Discover LinkWe <ArrowUpRight size={14} aria-hidden /></Link></div>
      <div className={styles.heroGrid}>
        <div className={styles.heroVisual}>
          <div className={styles.heroOrbit} aria-hidden />
          <div className={styles.coverFrame}><StorefrontImage src={store.coverPhotoUrl ?? spotlight?.images[0] ?? store.logoUrl} alt={`${store.name} cover`} eager /><div className={styles.coverLabel}><span>THE LOCAL SPOTLIGHT</span><a href={location.directionsHref} target="_blank" rel="noopener noreferrer" className={styles.coverDirections} aria-label={`${getRegionLabel(store.region)} — Google Maps directions to ${store.name}`}>{getRegionLabel(store.region)}<ArrowUpRight size={17} aria-hidden /></a></div></div>
          {spotlight && <Link href={`${preview ? "https://www.linkweonlinemall.com" : ""}/${serviceFirst ? "service" : "products"}/${spotlight.slug}`} className={styles.heroPick}><div><StorefrontImage src={spotlight.images[0]} alt="" /></div><span><small>{serviceFirst ? "MEET YOUR NEXT EXPERT" : "A LITTLE INSPIRATION"}</small><strong>{spotlight.name}</strong><span>Take a closer look <ArrowUpRight size={15} aria-hidden /></span></span></Link>}
          <span className={styles.visualCaption}>We people. We business. <strong>We local.</strong></span>
        </div>
        <div className={styles.heroCopy}>
          <div className={styles.profileDetails}>
            <div className={styles.profileHeading}>
              <div className={styles.brandLogo}>{store.logoUrl ? <StorefrontImage src={store.logoUrl} alt={`${store.name} logo`} eager /> : <span>{initials}</span>}</div>
              <div className={styles.profileName}>
                <div className={styles.storeEyebrow}><span /> {category && category.toLowerCase() !== "other" ? category : "Independent. Local. Full of possibility."}</div>
                <h1 id="store-title">{store.name}<span className={styles.titleDot}>.</span></h1>
              </div>
            </div>
            <p className={styles.tagline}>{store.tagline || (serviceFirst ? "Local expertise. A personal touch." : "Good finds. Made to be discovered.")}</p>
            <div className={styles.storeMeta}>
              {store.region && <a href={location.directionsHref} target="_blank" rel="noopener noreferrer" aria-label={`Get directions to ${store.name} from the store introduction`}><MapPin size={15} aria-hidden />{getRegionLabel(store.region)}</a>}
              {isVerified && <span className={styles.verified}><ShieldCheck size={15} aria-hidden />Verified business</span>}
              {reviewCount > 0 && <span><Star size={14} aria-hidden />{averageRating.toFixed(1)} · {reviewCount} reviews</span>}
            </div>
          </div>
          <div className={styles.profileControls}>
            <div className={styles.heroPrimary}><Link href={`${path}?tab=${serviceFirst ? "services" : "store"}#store-content`}>{serviceFirst ? "Find your service" : "Explore the collection"}<ArrowUpRight size={20} aria-hidden /></Link></div>
            <StoreHeroActions storeId={store.id} storeSlug={store.slug} storeName={store.name} canEditStore={canEditStore} isLoggedIn={isLoggedIn} initialFollowing={initialFollowing} preview={preview} />
          </div>
        </div>
      </div>
    </div>
  </StoreHeroShell>;
}
