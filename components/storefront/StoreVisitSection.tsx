"use client";

import { ArrowUpRight, Clock3, Globe } from "lucide-react";
import { formatDayHours, WEEK_DAYS, type WeekSchedule } from "@/lib/store/opening-hours-utils";
import { getStoreSocialLinks } from "@/lib/store/social-links";
import type { StorefrontTabsStore } from "./StorefrontTabs";
import StoreLocationCard from "./StoreLocationCard";
import styles from "./storefront.module.css";

type Props = { store: StorefrontTabsStore; openingHours: WeekSchedule | null; socialLinks: Record<string, string>; onDetails: () => void };
export default function StoreVisitSection({ store, openingHours, socialLinks, onDetails }: Props) {
  const links = getStoreSocialLinks(socialLinks);
  return <section className={styles.visitSection} aria-labelledby="store-visit-title">
    <div className={styles.sectionHeading}><div><p className={styles.eyebrow}><span />GOOD TO KNOW BEFORE YOU GO</p><h2 id="store-visit-title">Find us. <em>Come through.</em></h2></div><button type="button" onClick={onDetails}>All store information<ArrowUpRight size={20} aria-hidden /></button></div>
    <div className={styles.visitGrid}>
      <StoreLocationCard store={store} />
      <div className={styles.visitDetails}>
        <section><h3><Clock3 size={18} aria-hidden />Opening hours</h3>{openingHours ? <dl className={styles.visitHours}>{WEEK_DAYS.map(day => <div key={day}><dt>{day.charAt(0).toUpperCase() + day.slice(1)}</dt><dd>{formatDayHours(openingHours[day])}</dd></div>)}</dl> : <p>Contact the store to confirm opening hours.</p>}</section>
        {links.length > 0 && <section><h3><Globe size={18} aria-hidden />Find us online</h3><div className={styles.visitSocials}>{links.map(({key,platform,url}) => <a key={key} href={url} target="_blank" rel="noopener noreferrer">{platform}<ArrowUpRight size={15} aria-hidden /></a>)}</div></section>}
        <button type="button" className={styles.visitAllDetails} onClick={onDetails}>About, amenities &amp; store details<ArrowUpRight size={17} aria-hidden /></button>
      </div>
    </div>
  </section>;
}
