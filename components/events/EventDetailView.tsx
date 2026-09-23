import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarDays, CalendarPlus, FileText, Globe2, ImageIcon, MapPin, Music2, Navigation, ShieldCheck, Shirt, ShoppingBag, Sparkles, Ticket, Users } from "lucide-react";
import { ProductGallery } from "@/components/product/ProductGallery";
import StorefrontImage from "@/components/storefront/StorefrontImage";
import { EventShareButton } from "./EventShareButton";
import SaveEventButton from "./SaveEventButton";
import LineupLightbox from "./LineupLightbox";
import { TicketPurchaseCard } from "./TicketPurchaseCard";
import { eventCategoryLabel } from "@/lib/events/categories";
import { eventRegionLabel } from "@/lib/events/directory-query";
import { eventCalendar, eventFacts, eventLocation, eventPerformers, eventStartingPrice, eventState, refundSummary, safeEventUrl, ticketRemaining, ticketStatus, type EventDetailData } from "@/lib/events/detail";
import { formatEventCalendarDay, formatEventDateLong, formatEventTime } from "@/lib/events/format-datetime";
import type { ContentLinkItem } from "@/lib/content-links/types";
import { formatTTDPrice } from "@/lib/format/price";
import styles from "./detail.module.css";

type Props = { event: EventDetailData; nav: ReactNode; featureAction?: ReactNode; linkedItems?: ContentLinkItem[]; preview?: boolean; verified?: boolean };
export default function EventDetailView({ event, nav, featureAction, linkedItems = [], preview = false, verified = false }: Props) {
  const now = new Date(), state = eventState(event, now), price = eventStartingPrice(event, now);
  const upcoming = state === "upcoming", location = eventLocation(event), performers = eventPerformers(event.lineup);
  const visibleTickets = event.ticketTypes.filter(ticket => ticket.isVisible);
  const availableTickets = visibleTickets.filter(ticket => ticketStatus(ticket, now) === "on_sale");
  const remaining = !preview && availableTickets.length ? availableTickets.reduce((sum, ticket) => sum + (ticketRemaining(ticket) ?? 0), 0) : null;
  const photos = [...new Set([event.coverImage, ...event.galleryImages].filter((photo): photo is string => !!photo))];
  const calendar = "data:text/calendar;charset=utf-8," + encodeURIComponent(eventCalendar(event));
  const storeHref = (preview ? "https://www.linkweonlinemall.com" : "") + "/store/" + event.store.slug;
  const externalTickets = safeEventUrl(event.ticketUrl);
  const sections = [
    { href: "#event-about", label: "The experience", Icon: Sparkles },
    ...(performers.length ? [{ href: "#event-lineup", label: "The lineup", Icon: Music2 }] : []),
    { href: "#event-location", label: event.isOnline ? "Joining online" : "Getting there", Icon: MapPin },
    { href: "#event-details", label: "Good to know", Icon: FileText },
    ...(photos.length ? [{ href: "#event-photos", label: "Photos", Icon: ImageIcon }] : []),
    ...(linkedItems.length ? [{ href: "#shop-this-event", label: "Shop the event", Icon: ShoppingBag }] : []),
  ];
  return <div className={styles.page}>
    {nav}
    {preview && <div className={styles.previewNote}>LOCAL DESIGN PREVIEW · Real LinkWe event content · Ticket controls are for preview only</div>}
    <main>
      <div className={styles.container}>
        <div className={styles.breadcrumb}><Link href="/events"><ArrowLeft size={15} aria-hidden/>All events</Link><span>LOCAL MOMENTS. LASTING MEMORIES.</span><div><EventShareButton title={event.title} url={"https://www.linkweonlinemall.com/events/" + event.slug}/>{!preview && <SaveEventButton eventId={event.id}/>}</div></div>
        {state !== "upcoming" && <div className={styles.statusBanner} data-cancelled={state === "cancelled"} role="status"><Ticket size={20} aria-hidden/><div><strong>{price}</strong><p>{state === "cancelled" ? "This event has been cancelled. If you already have tickets, contact the organiser about your booking." : "Ticket sales are closed. You can still explore the event details below."}</p></div></div>}
        <section className={styles.hero} aria-labelledby="event-title">
          {event.coverImage && <div className={styles.heroBackdrop} aria-hidden><StorefrontImage src={event.coverImage} alt="" eager/></div>}
          <div className={styles.heroCopy}><p className={styles.eyebrow}><span/>{eventCategoryLabel(event.category)}</p><h1 id="event-title">{event.title}<em>.</em></h1><Link href={storeHref} className={styles.heroHost}><span><StorefrontImage src={event.store.logoUrl} alt=""/></span><span>Hosted by <strong>{event.organiserName || event.store.name}</strong></span><ArrowUpRight size={14} aria-hidden/></Link>
            <div className={styles.heroFacts}><div><CalendarDays size={20} aria-hidden/><span><strong>{formatEventDateLong(event.startDate)}</strong><small>{formatEventTime(event.startDate)} AST{event.endDate && " · Ends " + formatEventDateLong(event.endDate) + ", " + formatEventTime(event.endDate) + " AST"}</small></span></div><a href="#event-location">{event.isOnline ? <Globe2 size={20} aria-hidden/> : <MapPin size={20} aria-hidden/>}<span><strong>{event.isOnline ? "Join the experience online" : event.venueName || "See location details"}</strong><small>{event.isOnline ? "Check the joining details below" : event.region ? eventRegionLabel(event.region) : event.address || "Plan your visit"}</small></span><ArrowUpRight size={17} aria-hidden/></a></div>
            <div className={styles.heroActions}><a href="#event-tickets"><Ticket size={18} aria-hidden/>{upcoming ? "Explore tickets" : "Ticket information"}<ArrowUpRight size={18} aria-hidden/></a>{upcoming && <a href={calendar} download={event.slug + ".ics"}><CalendarPlus size={17} aria-hidden/>Add to calendar</a>}</div>
            <div className={styles.heroPrice}><strong>{price}</strong>{upcoming && availableTickets.length > 0 && <small>Ticket options below · All prices in TTD</small>}</div>
          </div>
          <div className={styles.heroMedia} id="event-photos"><div className={styles.posterCaption}><span>YOUR INVITATION TO A GOOD TIME</span><span>{photos.length} {photos.length === 1 ? "photo" : "photos"}</span></div><ProductGallery images={photos} name={event.title} kind="Event" stageClassName={styles.posterStage}/></div>
        </section>
        <div className={styles.quickFacts}>{event.ageRestriction && <div><ShieldCheck size={21} aria-hidden/><span><small>AGE REQUIREMENT</small><strong>{event.ageRestriction}</strong></span></div>}{event.dressCode && <div><Shirt size={21} aria-hidden/><span><small>COME AS YOUR BEST SELF</small><strong>{event.dressCode}</strong></span></div>}{event.capacity !== null && <div><Users size={21} aria-hidden/><span><small>EVENT CAPACITY</small><strong>{event.capacity.toLocaleString("en-TT")} people</strong></span></div>}{remaining !== null && <div><Ticket size={21} aria-hidden/><span><small>AVAILABLE TICKETS</small><strong>{remaining.toLocaleString("en-TT")} currently available</strong></span></div>}</div>
        <nav className={styles.sectionNav} aria-label="Explore this event">{sections.map(({ href, label, Icon }) => <a key={href} href={href}><Icon size={16} aria-hidden/>{label}<ArrowUpRight size={12} aria-hidden/></a>)}</nav>
        <div className={styles.contentGrid}>
          <aside className={styles.booking} id="event-tickets" aria-label="Tickets">
            {upcoming ? <TicketPurchaseCard eventId={event.id} eventSlug={event.slug} startDate={event.startDate} ticketTypes={event.ticketTypes} refundPolicyType={event.refundPolicyType} refundCutoffHours={event.refundCutoffHours} preview={preview} checkedAt={now.getTime()}/> : <div className={styles.closedTickets}><Ticket size={42} strokeWidth={1.2} aria-hidden/><p>THE TICKET DESK</p><h2>{price}</h2><p>{state === "cancelled" ? "No new tickets are available for this event." : "Tickets are no longer available."}</p><Link href="/events?date=upcoming#event-results">Find your next good time<ArrowUpRight size={18} aria-hidden/></Link></div>}
            {upcoming && externalTickets && <a className={styles.externalTickets} href={externalTickets} target="_blank" rel="noopener noreferrer">External ticket information<ArrowUpRight size={16} aria-hidden/></a>}
          </aside>
          <div className={styles.story}>
            <section className={styles.detailCard} id="event-about"><div className={styles.sectionHeading}><span><Sparkles size={21} aria-hidden/></span><div><p>THE EXPERIENCE</p><h2>A little more to <em>look forward to.</em></h2></div></div>{event.description ? <div className={styles.description} dangerouslySetInnerHTML={{ __html: event.description }}/> : <p className={styles.bodyCopy}>Get to know the event through its photos, ticket inclusions and organiser details.</p>}{event.tags.length > 0 && <div className={styles.tags}>{event.tags.map(tag => <Link key={tag} href={"/events?q=" + encodeURIComponent(tag) + "#event-results"}>{tag}</Link>)}</div>}</section>
            {performers.length > 0 && <section className={styles.detailCard} id="event-lineup"><div className={styles.sectionHeading}><span><Music2 size={21} aria-hidden/></span><div><p>SETTING THE MOOD</p><h2>Meet <em>the lineup.</em></h2></div></div><LineupLightbox performers={performers}/></section>}
            <section className={styles.detailCard} id="event-location"><div className={styles.sectionHeading}><span>{event.isOnline ? <Globe2 size={21} aria-hidden/> : <MapPin size={21} aria-hidden/>}</span><div><p>{event.isOnline ? "WHEREVER YOU ARE" : "WE’LL SEE YOU HERE"}</p><h2>{event.isOnline ? <>Your online <em>connection.</em></> : <>Make your <em>way here.</em></>}</h2></div></div>
              {event.isOnline ? <div className={styles.online}><Globe2 size={42} strokeWidth={1.2} aria-hidden/><h3>This is an online event.</h3><p>Check your ticket confirmation and the organiser’s instructions for access details.</p></div> : <><div className={styles.venue}><h3>{event.venueName || "Event location"}</h3>{event.address && <p>{event.address}</p>}{event.region && <p>{eventRegionLabel(event.region)}, Trinidad &amp; Tobago</p>}</div>{location?.embedHref ? <iframe className={styles.map} title={"Map for " + (event.venueName || event.title)} src={location.embedHref} loading="lazy" referrerPolicy="no-referrer"/> : <div className={styles.mapPlaceholder}><MapPin size={34} strokeWidth={1.3} aria-hidden/><p>{location ? "Use the venue details to plan your route." : "The organiser hasn’t shared the venue yet."}</p>{location && <small>An exact map pin hasn’t been added.</small>}</div>}{location && <div className={styles.mapActions}><a href={location.directionsHref} target="_blank" rel="noopener noreferrer"><Navigation size={16} aria-hidden/>Get directions<ArrowUpRight size={16} aria-hidden/></a><a href={location.mapHref} target="_blank" rel="noopener noreferrer">Open Google Maps<ArrowUpRight size={15} aria-hidden/></a></div>}</>}
            </section>
            <section className={styles.detailCard} id="event-details"><div className={styles.sectionHeading}><span><FileText size={21} aria-hidden/></span><div><p>BEFORE YOU HEAD OUT</p><h2>The details, <em>all here.</em></h2></div></div><dl className={styles.facts}>{eventFacts(event).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className={styles.policy}><ShieldCheck size={23} aria-hidden/><div><h3>Refund policy</h3><strong>{refundSummary(event.refundPolicyType, event.refundCutoffHours)}</strong>{event.refundPolicy && <p>{event.refundPolicy}</p>}</div></div></section>
            <section className={styles.hostCard} aria-label="Meet the organiser"><p>THE PEOPLE BEHIND THE EXPERIENCE</p><div className={styles.hostIdentity}><div><StorefrontImage src={event.store.logoUrl} alt={event.store.name}/></div><span><h2>{event.store.name}</h2>{event.organiserName && event.organiserName !== event.store.name && <p>Organised by {event.organiserName}</p>}{event.store.region && <p><MapPin size={13} aria-hidden/>{eventRegionLabel(event.store.region)}</p>}{verified && <small><ShieldCheck size={13} aria-hidden/>Verified business</small>}</span></div><Link href={storeHref}>Get to know the host<ArrowUpRight size={18} aria-hidden/></Link>{featureAction && <div className={styles.featureAction}>{featureAction}</div>}</section>
          </div>
        </div>
        {linkedItems.length > 0 && <section className={styles.linkedSection} id="shop-this-event"><div className={styles.sectionHeading}><span><ShoppingBag size={23} aria-hidden/></span><div><p>A LITTLE EXTRA FOR THE OCCASION</p><h2>Shop <em>this event.</em></h2></div></div><div className={styles.linkedGrid}>{linkedItems.map(item => <Link key={item.linkId} href={item.href} className={styles.linkedCard}><div><StorefrontImage src={item.image} alt={item.name}/><span><ArrowUpRight size={19} aria-hidden/></span></div><span>{item.type === "SERVICE" ? "LOCAL SERVICE" : item.type === "EVENT" ? "LOCAL EVENT" : "THE EVENT EDIT"}</span><h3>{item.name}</h3>{item.price !== null && <strong>{formatTTDPrice(item.price / 100)}</strong>}</Link>)}</div></section>}
        <div className={styles.footer}><div><p>KEEP THE GOOD TIMES GOING</p><h2>There’s more <em>out there.</em></h2></div><Link href="/events">Explore more events<ArrowUpRight size={18} aria-hidden/></Link></div>
      </div>
    </main>
    <div className={styles.mobileTickets}><div><small>{formatEventCalendarDay(event.startDate).day} {formatEventCalendarDay(event.startDate).month} · {formatEventTime(event.startDate)}</small><strong>{price}</strong></div><a href="#event-tickets">{upcoming ? "Tickets" : "Details"}<ArrowUpRight size={17} aria-hidden/></a></div>
  </div>;
}
