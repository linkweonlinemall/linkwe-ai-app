import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Grid2X2, MapPin, Ticket, Users, X } from "lucide-react";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import PublicNav from "@/components/layout/PublicNav";
import { prisma } from "@/lib/prisma";
import { getEventDirectory } from "@/lib/events/directory";
import { EVENT_DATES, EVENT_PAGE_SIZE, eventRegionLabel, eventsHref, parseEventQuery, type EventParams } from "@/lib/events/directory-query";
import { eventCategoryLabel } from "@/lib/events/categories";
import EventDirectoryCard from "@/components/events/EventDirectoryCard";
import EventsHero from "@/components/events/EventsHero";
import EventsBrowser, { EventsSearch } from "@/components/events/EventsBrowser";
import base from "@/components/shop/shop.module.css";
import styles from "@/components/events/directory.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = { title: "Events in Trinidad & Tobago", description: "Good times. Great company. Discover fetes, concerts, food experiences and local events on LinkWe. Find your next plan by date, location and ticket options." };

export default async function EventsPage({ searchParams }: { searchParams: Promise<EventParams> }) {
  const params = await searchParams, query = parseEventQuery(params);
  const [session, unreadCount, catalog] = await Promise.all([getSession(), getNavUnreadCount(), getEventDirectory(query)]);
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId }, select: { fullName: true, role: true } }) : null;
  const dashboard = user ? getRoleDashboardPath(user.role) : undefined;
  const chips = [
    ...(query.q ? [{ key: "q", label: "Search: " + query.q }] : []),
    ...(query.category ? [{ key: "category", label: eventCategoryLabel(query.category) }] : []),
    ...(query.date ? [{ key: "date", label: EVENT_DATES.find(date => date.value === query.date)!.label }] : []),
    ...(query.region ? [{ key: "region", label: eventRegionLabel(query.region) }] : []),
    ...(query.format ? [{ key: "format", label: query.format === "online" ? "Online events" : "In person" }] : []),
    ...(query.pricing ? [{ key: "pricing", label: query.pricing === "free" ? "Free tickets available" : "Paid tickets available" }] : []),
  ];
  return <div className={base.page + " " + styles.page}>
    <PublicNav user={user ? { name: user.fullName ?? "Account", href: dashboard! } : null} dashboardHref={dashboard} unreadCount={unreadCount}/>
    {catalog.preview && <div className={base.previewNote}>Local design preview · Real LinkWe event examples</div>}
    <main>
      <div className={base.container}><EventsHero event={catalog.highlight}/></div>
      <section id="event-results" className={base.container + " " + styles.catalog} aria-labelledby="event-results-title">
        <div className={base.sectionHeading}><div><p className={base.eyebrow}>FIND YOUR SCENE. MAKE A MEMORY.</p><h2 id="event-results-title">{query.q ? <>Your search. <em>Your next plan.</em></> : <>A date for <em>your diary.</em></>}</h2></div><EventsSearch key={query.q} defaultValue={query.q}/></div>
        <nav className={styles.dateNav} aria-label="Event dates">{EVENT_DATES.map(date => <Link key={date.value} href={eventsHref(params, { date: date.value || undefined, page: undefined })} aria-current={query.date === date.value ? "page" : undefined}><CalendarDays size={16} aria-hidden/>{date.label}</Link>)}</nav>
        <nav className={base.categoryStrip} aria-label="Event categories"><Link href={eventsHref(params, { category: undefined, page: undefined })} aria-current={!query.category ? "page" : undefined}><Grid2X2 size={15} aria-hidden/>All events</Link>{catalog.options.categories.map(category => <Link key={category.value} href={eventsHref(params, { category: category.value, page: undefined })} aria-current={query.category === category.value ? "page" : undefined}>{category.label}<span>{category.count}</span></Link>)}</nav>
        {chips.length > 0 && <div className={base.activeFilters} aria-label="Active filters">{chips.map(chip => <Link key={chip.key} href={eventsHref(params, { [chip.key]: undefined, page: undefined })} aria-label={"Remove " + chip.label + " filter"}>{chip.label}<X size={13} aria-hidden/></Link>)}<Link href="/events#event-results" className={base.clearFilters}>Clear all</Link></div>}
        <EventsBrowser key={JSON.stringify(query)} query={query} options={catalog.options} total={catalog.total}>
          {catalog.events.length ? <div className={styles.grid} data-small={catalog.total <= 2}>{catalog.events.map((event, index) => <EventDirectoryCard key={event.id} event={event} index={index}/>)}</div> : <div className={base.empty}><Ticket size={45} strokeWidth={1.3} aria-hidden/><h3>{catalog.inventoryCount ? "Let’s try a different plan." : "The next good time is on its way."}</h3><p>{catalog.inventoryCount ? "Try another date, broaden your search or clear a filter to see more events." : "Check back for new events from the LinkWe community."}</p><Link href={catalog.inventoryCount ? "/events#event-results" : "/stores"}>{catalog.inventoryCount ? "Explore all events" : "Meet our local stores"}<ArrowUpRight size={17} aria-hidden/></Link></div>}
          {catalog.total > 0 && <div className={base.pagination}><p>Showing {(catalog.page - 1) * EVENT_PAGE_SIZE + 1}–{Math.min(catalog.page * EVENT_PAGE_SIZE, catalog.total)} of {catalog.total} events</p>{catalog.pages > 1 && <nav aria-label="Event pages">{catalog.page > 1 && <Link href={eventsHref(params, { page: String(catalog.page - 1) })} aria-label="Previous page"><ArrowLeft size={18}/></Link>}<span>Page {catalog.page} of {catalog.pages}</span>{catalog.page < catalog.pages && <Link href={eventsHref(params, { page: String(catalog.page + 1) })} aria-label="Next page"><ArrowRight size={18}/></Link>}</nav>}</div>}
        </EventsBrowser>
        <div className={styles.guide}><div><CalendarDays size={25} strokeWidth={1.5} aria-hidden/><span><strong>Make your plan</strong><p>Dates and times shown in T&amp;T time.</p></span></div><div><MapPin size={25} strokeWidth={1.5} aria-hidden/><span><strong>Know before you go</strong><p>Check the venue, age limits and event details.</p></span></div><div><Users size={25} strokeWidth={1.5} aria-hidden/><span><strong>Bring your people</strong><p>Share your next find from the event page.</p></span></div></div>
      </section>
      <section className={base.container + " " + base.bottomBanner}><div><p className={base.eyebrow}>GIVE PEOPLE SOMETHING TO LOOK FORWARD TO.</p><h2>Big plans? <em>Bring them to LinkWe.</em></h2><p>Build your local audience and give your event a place to shine.</p></div><Link href={user?.role === "VENDOR" ? "/dashboard/vendor/events/new" : "/register?role=vendor"}>Host an event <ArrowUpRight size={19} aria-hidden/></Link></section>
    </main>
  </div>;
}
