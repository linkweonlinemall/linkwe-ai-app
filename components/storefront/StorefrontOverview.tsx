"use client";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Camera, MapPin, Sparkles, X } from "lucide-react";
import type { StorefrontTabsStore } from "./StorefrontTabs";
import StorefrontListingCard, { type StorefrontListing } from "./StorefrontListingCard";
import StorefrontImage from "./StorefrontImage";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import StorefrontEvents, { type StorefrontEvent } from "./StorefrontEvents";
import StoreVisitSection from "./StoreVisitSection";
import type { WeekSchedule } from "@/lib/store/opening-hours-utils";
import styles from "./storefront.module.css";
type Props = {
  store: StorefrontTabsStore; products: StorefrontListing[]; services: StorefrontListing[];
  wishlistProductIds: string[]; preview?: boolean; events?: StorefrontEvent[]; openingHours: WeekSchedule | null; socialLinks: Record<string, string>;
  onNavigate: (tab: "store" | "services" | "about" | "timeline" | "events") => void;
};
export default function StorefrontOverview({ store, products, services, wishlistProductIds, preview, events = [], openingHours, socialLinks, onNavigate }: Props) {
  const gallery = store.images.length ? store.images.map(i => i.url) : [...products, ...services].map(i => i.images[0]).filter(Boolean);
  const dialog = useRef<HTMLDialogElement>(null);
  const [photo, setPhoto] = useState(0);
  const picks = products.slice(0, 3);
  function showPhoto(index: number) { setPhoto(index); dialog.current?.showModal(); }
  function stepPhoto(direction: number) { setPhoto(current => (current + direction + gallery.length) % gallery.length); }
  return <div className={`${styles.container} ${styles.overview}`}>
    {picks.length > 0 && <section aria-labelledby="store-picks-title">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}><span /> THE STORE EDIT</p><h2 id="store-picks-title">Find your <em>something.</em></h2><p>A few things to catch your eye. A whole collection to make your own.</p></div><button type="button" onClick={() => onNavigate("store")}>Shop all {products.length}<ArrowUpRight size={20} aria-hidden /></button></div>
      <div className={styles.picksGrid}>{picks.map(item => <StorefrontListingCard key={item.id} item={item} preview={preview} wishlisted={wishlistProductIds.includes(item.id)} />)}</div>
    </section>}
    {services.length > 0 && <section className={styles.serviceEdit} aria-labelledby="service-edit-title"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}><span /> THE TALENT BEHIND THE BUSINESS</p><h2 id="service-edit-title">Your next idea.<br /><em>Their expertise.</em></h2><p>Start with a service. Make something happen.</p></div><button type="button" onClick={() => onNavigate("services")}>Explore all services<ArrowUpRight size={20} aria-hidden /></button></div><div className={styles.picksGrid}>{services.slice(0, 3).map(item => <StorefrontListingCard key={item.id} item={item} service availableNow={store.isAvailableNow} preview={preview} wishlisted={wishlistProductIds.includes(item.id)} />)}</div></section>}
    <StorefrontEvents events={events} onViewAll={() => onNavigate("events")} />
    <section className={styles.storyGrid} aria-labelledby="store-story-title">
      <div className={styles.storyCard}><span className={styles.eyebrow}><Sparkles size={17} aria-hidden /> THE PEOPLE. THE PASSION.</span><h2 id="store-story-title">More than a store.<br /><em>A little world.</em></h2><p>{store.description?.trim() || store.tagline || `Get to know ${store.name}, right here on LinkWe.`}</p><div className={styles.storyTags}>{store.tags.slice(0, 5).map(tag => <span key={tag}>{tag}</span>)}</div><button type="button" onClick={() => onNavigate("about")}>Get to know {store.name}<ArrowUpRight size={19} aria-hidden /></button><span className={styles.storySpark} aria-hidden>✳</span></div>
      <div className={styles.galleryCard}><div className={styles.galleryHeading}><span><Camera size={16} aria-hidden /> THROUGH THEIR LENS</span>{gallery.length > 0 && <button type="button" onClick={() => showPhoto(0)}>View gallery <ArrowUpRight size={18} aria-hidden /></button>}</div>{gallery.length ? <div className={styles.galleryMosaic}>{gallery.slice(0, 3).map((url, index) => <button key={`${url}-${index}`} type="button" aria-label={`Open ${store.name} gallery photo ${index + 1}`} onClick={() => showPhoto(index)}><StorefrontImage src={url} alt={`${store.name} gallery photo ${index + 1}`} />{index === 2 && gallery.length > 3 && <span>+{gallery.length - 3} more</span>}</button>)}</div> : <div className={styles.galleryEmpty}><Camera size={45} strokeWidth={1} /><p>A new story is taking shape.</p></div>}<div className={styles.galleryFooter}><MapPin size={16} aria-hidden /><span>{getRegionLabel(store.region)}<small>Trinidad &amp; Tobago</small></span><span className={styles.gallerySignature}>All the local love.</span></div></div>
    </section>
    <StoreVisitSection store={store} openingHours={openingHours} socialLinks={socialLinks} onDetails={() => onNavigate("about")} />
    <section className={styles.timelineCallout}><div><span className={styles.eyebrow}>DON’T BE A STRANGER.</span><h2>Good things are<br /><em>happening here.</em></h2></div><div><p>New drops, fresh ideas, and the story as it unfolds. Catch the latest from {store.name}.</p><button type="button" onClick={() => onNavigate("timeline")}>Step into the timeline <ArrowUpRight size={20} aria-hidden /></button></div><Sparkles className={styles.timelineSpark} size={125} strokeWidth={.6} aria-hidden /></section>
    <dialog ref={dialog} className={styles.galleryDialog} aria-label={`${store.name} photo gallery`} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} onKeyDown={event => { if (event.key === "ArrowLeft") { event.preventDefault(); stepPhoto(-1); } if (event.key === "ArrowRight") { event.preventDefault(); stepPhoto(1); } }}>
      <div className={styles.lightboxHeader}><span>{store.name}<small>{photo + 1} / {gallery.length}</small></span><button type="button" onClick={() => dialog.current?.close()} aria-label="Close photo gallery"><X size={23} /></button></div>
      {gallery[photo] && <div className={styles.lightboxImage}><StorefrontImage src={gallery[photo]} alt={`${store.name} gallery photo ${photo + 1}`} eager /></div>}
      {gallery.length > 1 && <div className={styles.lightboxControls}><button type="button" onClick={() => stepPhoto(-1)} aria-label="Previous photo"><ArrowLeft size={22} /></button><span>Through their lens.</span><button type="button" onClick={() => stepPhoto(1)} aria-label="Next photo"><ArrowRight size={22} /></button></div>}
    </dialog>
  </div>;
}
