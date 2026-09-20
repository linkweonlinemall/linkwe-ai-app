"use client";

import { ArrowUpRight, MapPin, Navigation } from "lucide-react";
import { getStoreLocation, type StoreLocation } from "@/lib/store/location";
import { StoreMapBox } from "./StorefrontMapAndProducts";
import styles from "./storefront.module.css";

export default function StoreLocationCard({ store, compact = false }: { store: StoreLocation; compact?: boolean }) {
  const location = getStoreLocation(store);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();
  const latitude = store.latitude ?? 0;
  const longitude = store.longitude ?? 0;
  const fallbackMap = location.hasCoordinates ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - .018},${latitude - .012},${longitude + .018},${latitude + .012}&layer=mapnik&marker=${latitude},${longitude}` : null;
  return <section className={styles.locationCard} data-compact={compact} aria-label={`${store.name} location`}>
    <div className={styles.locationCardHeader}><span><MapPin size={18} aria-hidden />Find us here</span><a href={location.mapHref} target="_blank" rel="noopener noreferrer" aria-label={`Open ${store.name} in Google Maps`}>Open map<ArrowUpRight size={17} aria-hidden /></a></div>
    <div className={styles.locationMap} aria-label={`Map showing ${store.name}’s saved location`}>
      {location.hasCoordinates && token ? <StoreMapBox key={`${latitude},${longitude}`} latitude={latitude} longitude={longitude} mapboxAccessToken={token} /> : fallbackMap ? <iframe title={`${store.name} location map`} src={fallbackMap} loading="lazy" referrerPolicy="no-referrer" /> : <div className={styles.locationPlaceholder}><MapPin size={36} strokeWidth={1.4} aria-hidden /><p>This store hasn’t added a map pin yet.</p><a href={location.mapHref} target="_blank" rel="noopener noreferrer">Find the business on Google Maps <ArrowUpRight size={15} aria-hidden /></a></div>}
    </div>
    <div className={styles.locationCardFooter}><div><strong>{store.name}</strong><p>{location.address}</p></div><a href={location.directionsHref} target="_blank" rel="noopener noreferrer" aria-label={`Get directions to ${store.name} in Google Maps`}><Navigation size={16} aria-hidden />Get directions</a></div>
  </section>;
}
