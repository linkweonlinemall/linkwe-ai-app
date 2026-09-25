"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, CalendarDays, Download, MapPin, QrCode, Search, Ticket, Video, X } from "lucide-react";
import CustomerPageIntro from "./CustomerPageIntro";
import { ticketState, type TicketStateInput } from "@/lib/customer/experiences";
import { formatEventCalendarDay, formatEventDateShort, formatEventTime } from "@/lib/events/format-datetime";
import { formatTTDMinor } from "@/lib/format/price";
import styles from "./customer.module.css";
export type CustomerTicket = TicketStateInput & {
  id: string; ticketNumber: string; holderName: string; transferredToName: string | null; paidMinor: number;
  event: TicketStateInput["event"] & { title: string; slug: string; venueName: string | null; coverImage: string | null; isOnline: boolean; store: { name: string } };
  ticketType: { name: string }; ticketOrder: { status: string; reference: string } | null;
};
export default function TicketsClient({ tickets, now }: { tickets: CustomerTicket[]; now: number }) {
  const [search, setSearch] = useState(""); const [view, setView] = useState("all"); const [sort, setSort] = useState("next"); const [limit, setLimit] = useState(6);
  const words = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const filtered = tickets.filter(t => (view === "all" || ticketState(t, now).bucket === view) && words.every(word => `${t.ticketNumber} ${t.ticketOrder?.reference ?? ""} ${t.event.title} ${t.event.store.name} ${t.holderName} ${t.ticketType.name} ${t.event.venueName ?? ""}`.toLowerCase().includes(word))).sort((a, b) => {
    const delta = new Date(a.event.startDate).getTime() - new Date(b.event.startDate).getTime();
    if (sort === "latest") return -delta;
    const aUp = ticketState(a, now).bucket === "upcoming", bUp = ticketState(b, now).bucket === "upcoming";
    return aUp !== bUp ? aUp ? -1 : 1 : aUp ? delta : -delta;
  });
  const reset = () => { setSearch(""); setView("all"); setSort("next"); setLimit(6); };
  return <><CustomerPageIntro page="tickets" count={tickets.length} /><section className={styles.orderWorkspace} aria-label="Your tickets">
    <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>YOUR PERSONAL EVENT WALLET</span><h2>Big plans. <em>Easy entry.</em></h2></div><Link href="/events" className={styles.secondary}>Find an event<ArrowUpRight size={16} /></Link></div>
    <div className={styles.filterTabs} aria-label="Filter tickets">{[{ id: "all", label: "All tickets" }, { id: "upcoming", label: "Upcoming & live" }, { id: "past", label: "Past & used" }, { id: "transferred", label: "Transferred" }, { id: "closed", label: "Cancelled & refunded" }].map(tab => <button key={tab.id} aria-pressed={view === tab.id} onClick={() => { setView(tab.id); setLimit(6); }}>{tab.label}<span>{tickets.filter(t => tab.id === "all" || ticketState(t, now).bucket === tab.id).length}</span></button>)}</div>
    <div className={styles.toolbar}><label className={styles.search}><Search size={18} /><input value={search} aria-label="Search tickets" placeholder="Event, ticket number, holder or venue…" onChange={e => { setSearch(e.target.value); setLimit(6); }} />{search && <button onClick={() => setSearch("")} aria-label="Clear search"><X size={16} /></button>}</label><select className={styles.select} aria-label="Sort tickets" value={sort} onChange={e => setSort(e.target.value)}><option value="next">Next event first</option><option value="latest">Latest date first</option></select></div>
    <div className={styles.resultLine} aria-live="polite"><span>{filtered.length} {filtered.length === 1 ? "ticket" : "tickets"} · Times in Trinidad & Tobago</span>{(search || view !== "all" || sort !== "next") && <button onClick={reset}>Reset filters<X size={13} /></button>}</div>
    {!filtered.length ? <div className={styles.empty}><span><Ticket size={36} /></span><h2>{tickets.length ? "No tickets in this pocket." : "Good times are calling."}</h2><p>{tickets.length ? "Try another event, holder or ticket number, or reset your filters." : "Find your next local experience. Your purchased tickets and entry codes will live right here."}</p>{tickets.length ? <button className={styles.primary} onClick={reset}>Reset filters</button> : <Link className={styles.primary} href="/events">Explore events<ArrowUpRight size={17} /></Link>}</div> : <div className={styles.ticketGrid}>{filtered.slice(0, limit).map(t => {
      const state = ticketState(t, now); const day = formatEventCalendarDay(new Date(t.event.startDate));
      return <article key={t.id} className={styles.ticketCard} data-closed={!state.usable}><div className={styles.ticketCover}>{t.event.coverImage ? <img src={t.event.coverImage} alt="" /> : <Ticket size={58} />}<span className={styles.ticketCoverShade} /><span className={styles.status} data-tone={state.tone}><span />{state.label}</span><Link href={`/events/${t.event.slug}`} aria-label={`View event: ${t.event.title}`} className={styles.coverLink}><ArrowUpRight size={20} /></Link></div>
        <div className={styles.ticketBody}><div className={styles.ticketEvent}><p className={styles.storeCaption}>{t.event.store.name}</p><h3><Link href={`/my-tickets/${t.id}`}>{t.event.title}</Link></h3><p><CalendarDays size={15} />{formatEventDateShort(new Date(t.event.startDate))} · {formatEventTime(new Date(t.event.startDate))}</p><p>{t.event.isOnline ? <Video size={15} /> : <MapPin size={15} />}{t.event.isOnline ? "Online event" : t.event.venueName || "Venue to be announced"}</p></div><div className={styles.ticketDate}><small>{day.month}</small><strong>{day.day}</strong><Ticket size={23} /></div></div>
        <div className={styles.ticketPerforation} /><div className={styles.ticketMeta}><div><small>{t.ticketType.name}</small><strong>{t.holderName}</strong><span>#{t.ticketNumber}</span>{t.ticketOrder && <span>Order · {t.ticketOrder.reference}</span>}</div><div><small>Ticket price</small><strong>{t.paidMinor === 0 ? "Free" : formatTTDMinor(t.paidMinor)}</strong></div></div>
        {t.transferredAt && <p className={styles.transferNote}>Transferred to {t.transferredToName ?? t.holderName}. Your original QR is no longer valid.</p>}
        <footer>{state.usable && <a className={styles.invoice} href={`/api/ticket-pdf/${t.id}`} aria-label={`Download PDF for ticket ${t.ticketNumber}`}><Download size={16} /><span>Save PDF</span></a>}<Link className={styles.primary} href={`/my-tickets/${t.id}`}>{state.usable ? <QrCode size={17} /> : <Ticket size={17} />}{state.usable ? "Open ticket & QR" : "View ticket details"}<ArrowRight size={16} /></Link></footer>
      </article>;
    })}</div>}
    {filtered.length > limit && <div className={styles.loadMore}><button className={styles.secondary} onClick={() => setLimit(limit + 6)}>Show more tickets<ArrowRight size={16} /></button></div>}
  </section><div className={styles.helpStrip}><QrCode size={27} /><div><strong>A smoother way in.</strong><p>Open your ticket for its entry QR, or save the PDF before heading out.</p></div><Link href="/contact">Need a hand?<ArrowUpRight size={16} /></Link></div></>;
}
