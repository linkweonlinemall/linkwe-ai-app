import { Heart, Package, Scissors, Star, ShieldCheck } from "lucide-react";
import styles from "./storefront.module.css";
type Props = { productCount: number; serviceCount: number; averageRating: number; reviewCount: number; isVerified: boolean; followerCount?: number; };
export default function StoreStatsBar({ productCount, serviceCount, averageRating, reviewCount, isVerified, followerCount = 0 }: Props) {
  return <div className={styles.statsWrap}><div className={`${styles.container} ${styles.stats}`}>
    <div className={styles.statsIntro}><span className={styles.tinyFlag} aria-hidden /><span>Rooted here.<strong>Ready for you.</strong></span></div>
    {productCount > 0 && <div><Package size={21} aria-hidden /><strong>{productCount}</strong><span>{productCount === 1 ? "product to discover" : "products to discover"}</span></div>}
    {serviceCount > 0 && <div><Scissors size={21} aria-hidden /><strong>{serviceCount}</strong><span>{serviceCount === 1 ? "service" : "ways we can help"}</span></div>}
    <div><Heart size={21} aria-hidden /><strong>{followerCount}</strong><span>{followerCount === 1 ? "follower" : "followers"}</span></div>
    <div>{reviewCount > 0 ? <><Star size={21} aria-hidden /><strong>{averageRating.toFixed(1)}</strong><span>from {reviewCount} {reviewCount === 1 ? "review" : "reviews"}</span></> : isVerified ? <><ShieldCheck size={23} aria-hidden /><span><strong>Verified</strong> business on LinkWe</span></> : <><Star size={21} aria-hidden /><span>No reviews yet</span></>}</div>
  </div></div>;
}
