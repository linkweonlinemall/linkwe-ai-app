"use client";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import StorefrontImage from "./StorefrontImage";
import styles from "./storefront.module.css";

export type StorefrontEvent = {
  id: string; title: string; slug: string; startDate: string; coverImage: string | null;
  venueName: string | null; region: string | null; isOnline: boolean;
};
export default function StorefrontEvents({ events, onViewAll }: { events: StorefrontEvent[]; onViewAll?: () => void }) {
  if (!events.length) return null;
  return <section className={styles.serviceEdit} aria-label="Events from this store">
    <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>MAKE A LITTLE TIME FOR LOCAL</p><h2>Be part of <em>the moment.</em></h2></div>{onViewAll && <button type="button" onClick={onViewAll}>All {events.length} events<ArrowUpRight size={20} aria-hidden /></button>}</div>
    <div className={styles.picksGrid}>{(onViewAll ? events.slice(0,3) : events).map(event => <article className={styles.listingCard} key={event.id} data-service="true"><div className={styles.listingMedia}><Link href={`/events/${event.slug}`} aria-label={`View ${event.title}`}><StorefrontImage src={event.coverImage} alt={event.title} /></Link></div><div className={styles.listingInfo}><h3><Link href={`/events/${event.slug}`}>{event.title}</Link></h3><p className={styles.serviceMeta}><CalendarDays size={14} aria-hidden /><time dateTime={event.startDate}>{new Date(event.startDate).toLocaleString("en-TT", {timeZone:"America/Port_of_Spain",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}</time></p><p className={styles.serviceMeta}><MapPin size={14} aria-hidden />{event.isOnline ? "Online event" : [event.venueName,event.region].filter(Boolean).join(" · ") || "See event for venue details"}</p><div className={styles.listingAction}><Link href={`/events/${event.slug}`}>Event details &amp; tickets<ArrowUpRight size={16} aria-hidden /></Link></div></div></article>)}</div>
  </section>;
}
