"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, CalendarDays, Clock3, ConciergeBell, MapPin, Search, Users, Video, X } from "lucide-react";
import CustomerPageIntro from "./CustomerPageIntro";
import CalendarDownload from "./CalendarDownload";
import StoreMessageButton from "./StoreMessageButton";
import CancelBookingButton from "@/components/bookings/CancelBookingButton";
import MarkBookingCompleteButton from "@/components/bookings/MarkBookingCompleteButton";
import CouponSummary from "@/components/checkout/CouponSummary";
import { bookingBucket, bookingStatus, externalWebUrl } from "@/lib/customer/experiences";
import { customerDate } from "@/lib/customer/orders";
import { formatEventTime, formatEventCalendarDay } from "@/lib/events/format-datetime";
import { formatTTDMinor } from "@/lib/format/price";
import styles from "./customer.module.css";
export type CustomerBooking = {
  id: string; status: string; bookingDate: string; startTime: string; endTime: string; startsAt: string; endsAt: string;
  totalPrice: number; amountPaid: number | null; guestCount: number; customerNotes: string | null; cancellationReason: string | null;
  meetingLink: string | null; completedAt: string | null; staffName: string | null; couponSnapshot: unknown; canComplete: boolean; cancelState: string;
  product: { name: string; slug: string; images: string[]; cancellationHours: number | null; serviceLocation: string | null; address: string | null; store: { id: string; name: string; slug: string } };
};
export default function BookingsClient({ bookings, now, paymentNotice }: { bookings: CustomerBooking[]; now: number; paymentNotice?: string }) {
  const [search, setSearch] = useState(""); const [view, setView] = useState("all"); const [sort, setSort] = useState("next"); const [limit, setLimit] = useState(6);
  const words = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const filtered = bookings.filter(b => (view === "all" || bookingBucket(b, now) === view) && words.every(word => `${b.id} ${b.product.name} ${b.product.store.name} ${b.staffName ?? ""} ${bookingStatus(b.status).label}`.toLowerCase().includes(word))).sort((a, b) => {
    if (sort === "latest") return new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
    const aUp = bookingBucket(a, now) === "upcoming", bUp = bookingBucket(b, now) === "upcoming";
    if (aUp !== bUp) return aUp ? -1 : 1;
    return aUp ? new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime() : new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
  });
  const next = bookings.filter(b => bookingBucket(b, now) === "upcoming" && b.status !== "PENDING").sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  const reset = () => { setSearch(""); setView("all"); setSort("next"); setLimit(6); };
  return <><CustomerPageIntro page="bookings" count={bookings.length} />
    {paymentNotice === "refunded" && <p className={styles.error} role="status">This checkout had already closed, so LinkWe requested a full refund to your card.</p>}
    <section className={styles.orderWorkspace} aria-label="Your bookings">
      <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>YOUR TIME, BEAUTIFULLY PLANNED</span><h2>On the calendar. <em>Off your mind.</em></h2></div><Link href="/services" className={styles.secondary}>Find a service<ArrowUpRight size={16} /></Link></div>
      {next && <a className={styles.nextPlan} href={`#booking-${next.id}`}><span className={styles.nextIcon}><CalendarDays size={25} /></span><span><small>NEXT ON YOUR CALENDAR</small><strong>{next.product.name}</strong><span>{customerDate(next.startsAt)} · {formatEventTime(new Date(next.startsAt))} · {next.product.store.name}</span></span><ArrowRight size={22} /></a>}
      <div className={styles.filterTabs} aria-label="Filter bookings">{[{ id: "all", label: "All bookings" }, { id: "upcoming", label: "Upcoming" }, { id: "past", label: "Past & complete" }, { id: "closed", label: "Cancelled" }].map(tab => <button key={tab.id} aria-pressed={view === tab.id} onClick={() => { setView(tab.id); setLimit(6); }}>{tab.label}<span>{bookings.filter(b => tab.id === "all" || bookingBucket(b, now) === tab.id).length}</span></button>)}</div>
      <div className={styles.toolbar}><label className={styles.search}><Search size={18} /><input value={search} aria-label="Search bookings" placeholder="Service, store or booking number…" onChange={e => { setSearch(e.target.value); setLimit(6); }} />{search && <button onClick={() => setSearch("")} aria-label="Clear search"><X size={16} /></button>}</label><select aria-label="Sort bookings" className={styles.select} value={sort} onChange={e => setSort(e.target.value)}><option value="next">Next appointment first</option><option value="latest">Latest date first</option></select></div>
      <div className={styles.resultLine} aria-live="polite"><span>{filtered.length} {filtered.length === 1 ? "booking" : "bookings"} · Times in Trinidad & Tobago</span>{(search || view !== "all" || sort !== "next") && <button onClick={reset}>Reset filters<X size={13} /></button>}</div>
      {!filtered.length ? <div className={styles.empty}><span><CalendarDays size={36} /></span><h2>{bookings.length ? "Nothing on this calendar." : "Make time for something good."}</h2><p>{bookings.length ? "Try another service or store, or reset your filters." : "Find a local expert and book your first appointment. We’ll keep the details here."}</p>{bookings.length ? <button className={styles.primary} onClick={reset}>Reset filters</button> : <Link href="/services" className={styles.primary}>Explore local services<ArrowUpRight size={17} /></Link>}</div> : <div className={styles.experienceGrid}>{filtered.slice(0, limit).map(b => {
        const status = bookingStatus(b.status); const day = formatEventCalendarDay(new Date(b.startsAt)); const upcoming = bookingBucket(b, now) === "upcoming"; const meeting = externalWebUrl(b.meetingLink);
        const location = b.product.serviceLocation === "ONLINE" || b.product.serviceLocation === "VIRTUAL" ? "Online appointment" : b.product.serviceLocation === "AT_CUSTOMER" ? "At your location" : b.product.address || "Confirm the location with your store";
        return <article key={b.id} id={`booking-${b.id}`} className={styles.bookingCard}>
          <header><div className={styles.bookingPhoto}>{b.product.images[0] ? <img src={b.product.images[0]} alt="" /> : <ConciergeBell size={40} />}<span className={styles.dateTile}><small>{day.month}</small><strong>{day.day}</strong></span></div><div className={styles.bookingTitle}><span className={styles.status} data-tone={status.tone}><span />{status.label}</span><Link className={styles.storeCaption} href={`/store/${b.product.store.slug}`}>{b.product.store.name}<ArrowUpRight size={12} /></Link><h3><Link href={`/service/${b.product.slug}`}>{b.product.name}</Link></h3></div></header>
          <div className={styles.bookingBody}><div className={styles.appointmentTime}><CalendarDays size={18} /><strong>{customerDate(b.startsAt)}</strong><span><Clock3 size={15} />{formatEventTime(new Date(b.startsAt))} – {formatEventTime(new Date(b.endsAt))}</span></div><p className={styles.locationLine}><MapPin size={16} />{location}</p>
            <div className={styles.bookingMoney}><div><small>Booking total</small><strong>{formatTTDMinor(Math.round(b.totalPrice * 100))}</strong></div><div><small>{b.status === "CANCELLED" ? "Previously paid" : "Paid"}</small><strong>{b.amountPaid === null ? "Not recorded" : (b.amountPaid === 0 ? "TTD 0.00" : formatTTDMinor(Math.round(b.amountPaid * 100)))}</strong></div>{b.status === "DEPOSIT_PAID" && <div><small>Balance remaining</small><strong>{((b.totalPrice - (b.amountPaid ?? 0)) <= 0 ? "TTD 0.00" : formatTTDMinor(Math.round((b.totalPrice - (b.amountPaid ?? 0)) * 100)))}</strong></div>}</div>
            <CouponSummary snapshot={b.couponSnapshot} />
            <details className={styles.bookingDetails}><summary>Booking details<span>Reference · {b.id.slice(-8).toUpperCase()}</span></summary><dl><div><dt><Users size={14} />Guests</dt><dd>{b.guestCount}</dd></div>{b.staffName && <div><dt>Your specialist</dt><dd>{b.staffName}</dd></div>}{b.customerNotes && <div><dt>Your notes</dt><dd>{b.customerNotes}</dd></div>}{b.cancellationReason && <div><dt>Cancellation reason</dt><dd>{b.cancellationReason}</dd></div>}{b.completedAt && <div><dt>Completed</dt><dd>{customerDate(b.completedAt)}</dd></div>}<div><dt>Cancellation window</dt><dd>{b.product.cancellationHours ?? 24} hours before the appointment. After this, contact your store.</dd></div></dl></details>
            {meeting && upcoming && b.status !== "PENDING" && <a className={styles.primary} href={meeting} target="_blank" rel="noopener noreferrer"><Video size={17} />Join appointment<ArrowUpRight size={15} /></a>}
          </div>
          <footer><div className={styles.experienceActions}><StoreMessageButton storeId={b.product.store.id} />{upcoming && <CalendarDownload id={b.id} title={b.product.name} start={b.startsAt} end={b.endsAt} location={location} description={`Booking with ${b.product.store.name}. ${b.status === "PENDING" ? "Awaiting confirmation." : ""}`} />}{!upcoming && <Link href={`/service/${b.product.slug}`} className={styles.secondary}>View service<ArrowUpRight size={15} /></Link>}</div>
            {b.canComplete && <MarkBookingCompleteButton bookingId={b.id} storeName={b.product.store.name} />}{b.cancelState === "cancellable" && <CancelBookingButton bookingId={b.id} storeName={b.product.store.name} />}{b.cancelState === "too_late" && <p className={styles.muted}>Need to change plans? Message your store for help.</p>}
          </footer>
        </article>;
      })}</div>}
      {filtered.length > limit && <div className={styles.loadMore}><button className={styles.secondary} onClick={() => setLimit(limit + 6)}>Show more bookings<ArrowRight size={16} /></button></div>}
    </section><div className={styles.helpStrip}><ConciergeBell size={26} /><div><strong>Looking for a quote or an on-demand request?</strong><p>Keep up with service quotes and requests in their own space.</p></div><Link href="/my-requests">My requests<ArrowUpRight size={16} /></Link></div>
  </>;
}
