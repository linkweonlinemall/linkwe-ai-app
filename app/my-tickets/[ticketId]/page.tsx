import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarDays, Download, MapPin, Sparkles, Ticket, Video } from "lucide-react";
import { getCustomerTicketById } from "@/app/actions/my-tickets";
import { TransferTicketPanel } from "./TransferTicketPanel";
import PublicNav from "@/components/layout/PublicNav";
import CalendarDownload from "@/components/customer/CalendarDownload";
import CouponSummary from "@/components/checkout/CouponSummary";
import { getSession } from "@/lib/auth/session";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { formatEventDateLong, formatEventTime } from "@/lib/events/format-datetime";
import { generateTicketQRCodeDataURL } from "@/lib/tickets/qr-code";
import { ticketPaidMinor } from "@/lib/tickets/ticket-paid-minor";
import { formatTTDMinor } from "@/lib/format/price";
import { customerDate } from "@/lib/customer/orders";
import { externalWebUrl, ticketState } from "@/lib/customer/experiences";
import styles from "@/components/customer/customer.module.css";
type Props = { params: Promise<{ ticketId: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ticket = await getCustomerTicketById((await params).ticketId);
  return { title: ticket ? `${ticket.event.title} · My ticket` : "Ticket not found" };
}
export default async function MyTicketDetailPage({ params }: Props) {
  const { ticketId } = await params; const session = await getSession();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(`/my-tickets/${ticketId}`)}`);
  const ticket = await getCustomerTicketById(ticketId); if (!ticket) notFound();
  // eslint-disable-next-line react-hooks/purity -- Ticket access is evaluated for this server request.
  const now = Date.now(); const state = ticketState(ticket, now); const dashboardHref = getRoleDashboardPath(session.role);
  const host = ticket.event.organiserName || ticket.event.store.name; const price = ticketPaidMinor(ticket);
  const stream = state.usable ? externalWebUrl(ticket.event.streamUrl) : null;
  const canTransfer = state.usable && ticket.event.startDate.getTime() > now;
  let qr: string | null = null;
  if (state.usable) { try { qr = await generateTicketQRCodeDataURL(ticket.qrToken); } catch { /* The existing PDF route remains available. */ } }
  const location = [ticket.event.venueName, ticket.event.address, ticket.event.region?.replaceAll("_", " ")].filter(Boolean).join(", ");
  const directions = location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}` : null;
  const policies = [ticket.event.dressCode && { label: "Dress code", value: ticket.event.dressCode }, ticket.event.ageRestriction && { label: "Age restriction", value: ticket.event.ageRestriction }, { label: "Refund policy", value: ticket.event.refundPolicy || ({ FULL: "Full refund available, subject to the event policy.", PARTIAL: "Partial refund available, subject to the event policy.", NONE: "No refunds." }[ticket.event.refundPolicyType]) }].filter(Boolean) as { label: string; value: string }[];
  return <div className={`${styles.page} pb-mobile-public lg:pb-0`}><PublicNav user={{ name: session.fullName ?? "Account", href: dashboardHref }} dashboardHref={dashboardHref} /><main className={styles.container}>
    <Link href="/my-tickets" className={styles.back}><ArrowLeft size={15} />Back to my tickets</Link>
    <header className={styles.detailHead}><div><span className={styles.eyebrow}>YOUR NEXT GREAT MEMORY</span><h1>{ticket.event.title}</h1><p>Hosted by {host} · {ticket.ticketType.name}</p></div><Link href={`/events/${ticket.event.slug}`} className={styles.secondary}>View event<ArrowUpRight size={17} /></Link></header>
    <div className={styles.ticketDetailGrid}><div className={styles.ticketDetailMain}>
      {ticket.event.coverImage && <div className={styles.ticketLargeCover}><img src={ticket.event.coverImage} alt={ticket.event.title} /></div>}
      <section className={styles.panel}><h2><CalendarDays size={21} />When & where.</h2><div className={styles.ticketInfoRows}><div><CalendarDays size={20} /><div><strong>{formatEventDateLong(ticket.event.startDate)}</strong><p>{formatEventTime(ticket.event.startDate)}{ticket.event.endDate ? ` – ${formatEventTime(ticket.event.endDate)}` : ""} · Trinidad & Tobago time</p>{ticket.event.endDate && <p>Ends {formatEventDateLong(ticket.event.endDate)}</p>}{state.usable && <CalendarDownload id={ticket.id} title={ticket.event.title} start={ticket.event.startDate.toISOString()} end={ticket.event.endDate?.toISOString()} location={ticket.event.isOnline ? "Online event" : location} description={`Ticket ${ticket.ticketNumber}. ${!ticket.event.endDate ? "End time to be confirmed by the organiser. " : ""}View your ticket on LinkWe.`} />}</div></div>
      <div>{ticket.event.isOnline ? <Video size={20} /> : <MapPin size={20} />}<div><strong>{ticket.event.isOnline ? "Online event" : ticket.event.venueName || "Event location"}</strong>{ticket.event.isOnline ? <>{stream ? <a href={stream} target="_blank" rel="noopener noreferrer" className={styles.primary}>Join event<ArrowUpRight size={16} /></a> : <p>{state.usable ? "The organiser will share the join link before the event." : "Online access is unavailable for this ticket."}</p>}</> : <><p>{ticket.event.address}</p><p>{ticket.event.region?.replaceAll("_", " ")}</p>{directions ? <a href={directions} target="_blank" rel="noopener noreferrer" className={styles.secondary}>Get directions<ArrowUpRight size={16} /></a> : <p>Venue details to be announced.</p>}</>}</div></div></div></section>
      <section className={styles.panel}><h2><Sparkles size={21} />Your kind of experience.</h2><span className={styles.status} data-tone="orange">{ticket.ticketType.name}</span><p className="whitespace-pre-wrap">{ticket.ticketType.perks || "Standard admission for this ticket type."}</p>{ticket.ticketType.description && <p className="mt-3 whitespace-pre-wrap">{ticket.ticketType.description}</p>}<Link href={`/store/${ticket.event.store.slug}`} className={styles.secondary}>Meet {ticket.event.store.name}<ArrowUpRight size={15} /></Link></section>
      <section className={styles.panel}><h2><Ticket size={21} />The details, all here.</h2><dl className={styles.summaryRows}><div><dt>Ticket holder</dt><dd>{ticket.holderName}<br /><span className="break-all font-normal">{ticket.holderEmail}</span></dd></div><div><dt>Ticket number</dt><dd className="break-all">{ticket.ticketNumber}</dd></div><div><dt>Ticket price</dt><dd>{price === 0 ? "Free" : formatTTDMinor(price)}</dd></div>{ticket.ticketOrder && <><div><dt>Order reference</dt><dd>{ticket.ticketOrder.reference}</dd></div><div><dt>Order total</dt><dd>{formatTTDMinor(ticket.ticketOrder.total)}</dd></div><div><dt>Purchased</dt><dd>{customerDate(ticket.ticketOrder.createdAt)}</dd></div></>}{ticket.checkedInAt && <div><dt>Checked in</dt><dd>{customerDate(ticket.checkedInAt)} · {formatEventTime(ticket.checkedInAt)}</dd></div>}</dl><CouponSummary snapshot={ticket.ticketOrder?.couponSnapshot} /></section>
      <section className={styles.panel}><h2>Before you go.</h2><div className={styles.ticketInfoRows}>{policies.map(p => <p className={styles.ticketPolicy} key={p.label}><strong>{p.label}</strong><br />{p.value}</p>)}</div></section>
      {ticket.event.description && <section className={styles.panel}><h2>About the experience.</h2><div className={styles.ticketAbout} dangerouslySetInnerHTML={{ __html: ticket.event.description }} /></section>}
    </div><aside className={styles.entryPass} aria-label="Your entry ticket"><header><Ticket size={31} /><div><small>GOOD TIMES START HERE</small><h2>Your event pass.</h2></div></header><div className={styles.entryPassBody}><span className={styles.status} data-tone={state.tone}><span />{state.label}</span>
      {state.usable ? <>{qr ? <img src={qr} alt={`Entry QR for ticket ${ticket.ticketNumber}`} width={240} height={240} /> : <p>QR unavailable. Please use the PDF below.</p>}<h3>{ticket.event.isOnline ? "Your ticket to the experience." : "Show this at the entrance."}</h3><p>#{ticket.ticketNumber}<br />{ticket.holderName}</p><a href={`/api/ticket-pdf/${ticket.id}`} className={styles.primary}><Download size={17} />Save ticket PDF</a><p>Save it before you head out. Keep your entry code private.</p></> : <><Ticket size={65} className="mx-auto my-7 opacity-30" /><h3>{state.label}</h3><p>{ticket.transferredAt ? `Transferred to ${ticket.transferredToName ?? ticket.holderName} on ${customerDate(ticket.transferredAt)}. Your original entry code is no longer valid.` : state.bucket === "past" ? "Keep this ticket as a memory of your local experience. It is no longer an active entry pass." : "This ticket is not available for entry."}</p></>}
      {canTransfer && <div className="mt-5"><TransferTicketPanel ticketId={ticket.id} status={ticket.status} /></div>}
      <Link href="/my-tickets" className={`${styles.secondary} mt-4 w-full`}>Back to my tickets<ArrowUpRight size={16} /></Link>
    </div></aside></div><footer className={styles.footer}>We people. We business. We local.</footer>
  </main></div>;
}
