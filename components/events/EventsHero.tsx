import Link from "next/link";
import { ArrowDown, ArrowUpRight, CalendarDays, MapPin, Sparkles, Ticket } from "lucide-react";
import { eventHref, type DirectoryEvent } from "@/lib/events/directory-query";
import { eventCategoryLabel } from "@/lib/events/categories";
import { formatEventCalendarDay, formatEventDateCard } from "@/lib/events/format-datetime";
import EventPoster from "./EventPoster";
import styles from "./directory.module.css";

export default function EventsHero({ event }: { event: DirectoryEvent | null }) {
  const date = event ? formatEventCalendarDay(event.startDate) : null;
  return <section className={styles.hero} aria-labelledby="events-title">
    <div className={styles.heroCopy}>
      <p className={styles.eyebrow}><span/>YOUR NEXT “REMEMBER WHEN?”</p>
      <h1 id="events-title">Good times.<br/><em>Great company.</em></h1>
      <p>The music. The food. The people. The memories.<br/>Find your next experience, right here in Trinidad &amp; Tobago.</p>
      <div className={styles.heroActions}><a href="#event-results">Find your next plan <ArrowDown size={17} aria-hidden/></a><Link href="/event-collections">My event collections <ArrowUpRight size={16} aria-hidden/></Link></div>
      <span className={styles.heroFoot}><Sparkles size={17} aria-hidden/>Big local energy. Moments worth showing up for.</span>
    </div>
    {event && date ? <div className={styles.heroStage}>
      <span className={styles.stageLabel}><Ticket size={16} aria-hidden/>ON THE LOCAL CALENDAR</span>
      <Link href={eventHref(event)} className={styles.heroTicket} aria-label={"Explore " + event.title}>
        <EventPoster src={event.coverImage} title={event.title} category={eventCategoryLabel(event.category)} hero/>
        <div className={styles.ticketStub}><span className={styles.stubDate}><strong>{date.day}</strong><small>{date.month}</small></span><span><small>{formatEventDateCard(event.startDate)}</small><strong>{event.title}</strong></span><ArrowUpRight size={20} aria-hidden/></div>
      </Link>
      <span className={styles.floatingNote}><MapPin size={17} aria-hidden/>{event.isOnline ? "Join from anywhere" : event.venueName || "Discover something local"}</span>
      <span className={styles.stageSpark} aria-hidden>✳</span>
    </div> : <div className={styles.heroIllustration} aria-hidden><CalendarDays size={130} strokeWidth={.8}/><span>Make time<br/>for a good time.</span><Sparkles size={35}/></div>}
  </section>;
}
