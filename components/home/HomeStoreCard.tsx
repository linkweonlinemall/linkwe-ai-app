import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { HomeStore } from "@/lib/home/types";
import HomeListingImage from "./HomeListingImage";
import styles from "./store-card.module.css";

export default function HomeStoreCard({ store, index }: { store: HomeStore; index: number }) {
  return (
    <Link href={store.href} className={styles.card} data-store-tone={index % 3} aria-label={`Visit ${store.name}`}>
      <div className={styles.cover}>
        <HomeListingImage src={store.image} alt={`${store.name} storefront`} />
      </div>
      <div className={styles.content}>
        <div className={styles.identity}>
          <div className={styles.logo}><HomeListingImage src={store.logo} alt={`${store.name} logo`} /></div>
          <span className={styles.region}><MapPin size={13} aria-hidden />{store.region}</span>
        </div>
        <h3>{store.name}</h3>
        {store.tagline && <p className={styles.tagline}>{store.tagline}</p>}
        <div className={styles.footer}>
          <span className={styles.localLabel}><span aria-hidden /> LOCAL BUSINESS</span>
          <span className={styles.action}>Visit store <span><ArrowUpRight size={21} aria-hidden /></span></span>
        </div>
      </div>
    </Link>
  );
}
