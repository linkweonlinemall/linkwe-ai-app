import Link from "next/link";
import { ArrowUpRight, CalendarDays, Globe2, MapPin, Ticket } from "lucide-react";
import { eventHref, eventRegionLabel, type DirectoryEvent } from "@/lib/events/directory-query";
import { eventCategoryLabel } from "@/lib/events/categories";
import { formatEventCalendarDay, formatEventDateCard, formatEventTime } from "@/lib/events/format-datetime";
import ShopImage from "@/components/shop/ShopImage";
import SaveEventButton from "./SaveEventButton";
import EventPoster from "./EventPoster";
import styles from "./directory.module.css";

export default function EventDirectoryCard({ event, index }: { event: DirectoryEvent; index: number }) {
  const date = formatEventCalendarDay(event.startDate), href = eventHref(event);
  const inactive = ["past", "started", "sold_out", "closed"].includes(event.offer.state);
  return <article className={styles.card} data-tone={index % 3}>
    <div className={styles.cardVisual}>
      <Link href={href} aria-label={"View " + event.title}><EventPoster src={event.coverImage} title={event.title} category={eventCategoryLabel(event.category)}/></Link>
      {event.isFeatured && <span className={styles.featured}><Sparkle/>In the spotlight</span>}
      {!event.preview && <div className={styles.save}><SaveEventButton eventId={event.id}/></div>}
    </div>
    <div className={styles.cardBody}>
      <div className={styles.cardHeading}><time className={styles.dateBadge} dateTime={event.startDate.toISOString()}><small>{date.month}</small><strong>{date.day}</strong></time><div><span className={styles.category}>{eventCategoryLabel(event.category)}</span><h3><Link href={href}>{event.title}</Link></h3></div></div>
      <div className={styles.details}><p><CalendarDays size={15} aria-hidden/><time dateTime={event.startDate.toISOString()}>{formatEventDateCard(event.startDate)} · {formatEventTime(event.startDate)} AST</time></p><p>{event.isOnline ? <Globe2 size={15} aria-hidden/> : <MapPin size={15} aria-hidden/>}<span>{event.isOnline ? "Online event" : [event.venueName, event.region && eventRegionLabel(event.region)].filter(Boolean).join(" · ") || event.address || "Venue to be announced"}</span></p></div>
      <Link href={(event.preview ? "https://www.linkweonlinemall.com" : "") + "/store/" + event.store.slug} className={styles.host}><span className={styles.hostLogo}><ShopImage src={event.store.logoUrl} alt=""/></span><span><small>HOSTED BY</small><strong>{event.organiserName || event.store.name}</strong></span><ArrowUpRight size={14} aria-hidden/></Link>
    </div>
    <div className={styles.cardFooter}><div><span className={styles.price} data-inactive={inactive}>{event.offer.label}</span><small>{event.ageRestriction ? event.ageRestriction + " · " : ""}{event.offer.note}</small></div><Link href={href} className={styles.cardAction}>{event.offer.state === "on_sale" ? <><Ticket size={16} aria-hidden/>Explore tickets</> : "View event"}<ArrowUpRight size={17} aria-hidden/></Link></div>
  </article>;
}
function Sparkle() { return <span aria-hidden>✦</span>; }
