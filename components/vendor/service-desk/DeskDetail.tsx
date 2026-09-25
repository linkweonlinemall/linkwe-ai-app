"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, CalendarPlus, Check, Clock3, Link2, LockKeyhole, MapPin, Send, X } from "lucide-react";
import { updateBookingMeetingLink, updateBookingStatus } from "@/app/actions/booking";
import { acceptOnDemandRequest, completeOnDemandRequest, declineOnDemandRequest } from "@/app/actions/on-demand";
import { recordServiceSubscriptionSession } from "@/app/actions/service-subscription";
import { cancelServiceDeskBooking, saveBookingPrivateNote } from "@/app/actions/vendor-service-desk";
import { MessageCustomerButton } from "@/app/(dashboard)/dashboard/vendor/orders/[splitOrderId]/message-customer-button";
import { bookingTime, canRecordSession, deskDate, deskStatus, isClosed, kindLabel, money, type DeskRecord } from "@/lib/vendor/service-desk";
import { calendarFile, externalWebUrl } from "@/lib/customer/experiences";
import { scrollDeskPanel } from "./scroll-panel";
import s from "./service-desk.module.css";

type Result = { error?: string; ok?: boolean; refundedTTD?: number };
export default function DeskDetail({ row, storeId, now, close }: { row: DeskRecord; storeId: string; now: number; close: () => void }) {
  const router = useRouter();
  const confirmationRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState("");
  const [confirmation, setConfirmation] = useState<"confirm" | "no-show" | "cancel" | "complete" | "session" | "quote" | null>(null);
  useEffect(() => { if (confirmation) { scrollDeskPanel(confirmationRef.current, "nearest"); confirmationRef.current?.focus({ preventScroll: true }); } }, [confirmation]);
  const [note, setNote] = useState(row.kind !== "subscription" ? row.vendorNotes ?? "" : "");
  const [meeting, setMeeting] = useState(row.kind === "booking" ? row.meetingLink ?? "" : "");
  const [reason, setReason] = useState(""), [amount, setAmount] = useState(""), [arrival, setArrival] = useState("");
  const status = deskStatus(row, now), closed = isClosed(row);
  async function run(action: () => Promise<Result>, message: string) {
    if (busy) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const result = await action();
      if (result.error || result.ok === false) { setError(result.error === "session_unavailable" ? "No session is available. Refresh to check the latest subscription period and balance." : result.error ?? "The record changed. Refresh and try again."); return; }
      setSuccess(result.refundedTTD ? `${message} Refund requested: ${money(result.refundedTTD)}.` : message);
      setConfirmation(null); router.refresh();
    } catch { setError("We couldn’t confirm the update. Refresh to check its current status before trying again."); }
    finally { setBusy(false); }
  }
  function proceed() {
    if (row.kind === "booking") {
      if (confirmation === "cancel") return run(() => cancelServiceDeskBooking(row.id, reason), "Booking cancelled.");
      return run(() => updateBookingStatus(row.id, confirmation === "no-show" ? "NO_SHOW" : "CONFIRMED"), confirmation === "no-show" ? "Attendance updated." : "Booking confirmed.");
    }
    if (row.kind === "subscription") return run(() => recordServiceSubscriptionSession(row.id), "One session recorded. The customer will be notified.");
    if (confirmation === "complete") return run(() => completeOnDemandRequest(row.id), "Completion sent to the customer for confirmation.");
    if (confirmation === "cancel") return run(() => declineOnDemandRequest(row.id, reason), row.status === "PENDING" ? "Request declined." : "Request closed.");
    return run(() => acceptOnDemandRequest(row.id, { quotedPrice: Number(amount), estimatedArrival: arrival, vendorNotes: note }), "Offer sent to the customer.");
  }
  function addCalendar() {
    if (row.kind !== "booking") return;
    const file = calendarFile({ id: row.id, title: `${row.service.name} · ${row.customer?.fullName ?? "Customer"}`, start: new Date(bookingTime(row)).toISOString(), end: new Date(bookingTime(row, true)).toISOString(), description: `LinkWe booking ${row.id}`, location: row.meetingLink ?? row.location ?? "" });
    const url = URL.createObjectURL(new Blob([file], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "linkwe-booking.ics"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const confirmationText = confirmation === "cancel" ? `This closes the ${row.kind === "booking" ? "booking" : "request"} and notifies the customer. Any eligible online payment follows the existing refund process.` : confirmation === "session" ? `Record one delivered session for ${row.customer?.fullName ?? "this customer"}? This reduces their remaining sessions by one and notifies them.` : confirmation === "complete" ? "Confirm that the agreed work has been delivered. The customer will be asked to confirm completion; automatic completion follows after 48 hours." : confirmation === "no-show" ? "Confirm that the customer missed this appointment. This updates attendance and notifies them." : confirmation === "quote" ? `Send an offer of ${money(Number(amount))}${arrival ? `, with arrival ${arrival}` : ""}? The customer will receive your response and can accept it.` : "Confirm this appointment and notify the customer?";
  const payable = row.kind === "booking" ? row.totalPrice : row.kind === "request" ? row.quotedPrice : null;
  const paid = row.kind !== "subscription" ? row.amountPaid ?? 0 : 0;
  return <section className={s.detail} aria-label={`${kindLabel(row)} details`} data-tour="desk-detail">
    <div className={s.detailTop}><span className={s.eyebrow}>{kindLabel(row)} details</span><button type="button" className={s.iconButton} aria-label="Close details" onClick={close} disabled={busy}><X size={19}/></button></div>
    <div className={s.detailIntro}><span className={`${s.badge} ${s[status.tone]}`}>{status.label}</span><h2 tabIndex={-1} id="desk-detail-title">{row.service.name}</h2><Link href={`/service/${row.service.slug}`} className={s.textLink}>View service <ArrowUpRight size={15}/></Link></div>
    <div className={s.nextStep}><Clock3 size={19}/><p><strong>Next step</strong>{status.next}</p></div>
    <div className={s.customer}><span className={s.avatar}>{(row.customer?.fullName ?? "Customer").slice(0, 1)}</span><div><strong>{row.customer?.fullName ?? "Customer"}</strong><span>{row.customer?.email ?? "Customer account unavailable"}</span>{row.customer?.phone && <a href={`tel:${row.customer.phone.replace(/[^+\d]/g, "")}`}>{row.customer.phone}</a>}</div></div>
    {row.customer && <MessageCustomerButton customerId={row.customerId} storeId={storeId}/>}
    <fieldset disabled={busy} className={s.controls}>
      {row.kind === "booking" && <>
        <div className={s.section}><h3>Your appointment</h3><dl className={s.facts}><Fact label="Date" value={deskDate(row.bookingDate)}/><Fact label="Time (Trinidad & Tobago)" value={`${row.startTime} – ${row.endTime}`}/><Fact label="Guests" value={row.guestCount}/><Fact label="Assigned staff" value={row.staffName ?? "No staff assigned"}/><Fact label="Service location" value={row.location ? ({ AT_VENDOR: "At the business", AT_CUSTOMER: "At the customer", VIRTUAL: "Online", FLEXIBLE: "Agreed with customer" }[row.location] ?? row.location) : "Confirm with customer"}/></dl>{!closed && <button className={s.secondary} onClick={addCalendar} type="button"><CalendarPlus size={16}/>Add to calendar</button>}</div>
        {row.customerNotes && <div className={s.note}><h3>Customer’s notes</h3><p>{row.customerNotes}</p></div>}
      </>}
      {row.kind === "request" && <>
        <div className={s.section}><h3>What the customer needs</h3><p className={s.prose}>{row.description}</p>{row.photos.length > 0 && <div className={s.photos}>{row.photos.map((photo, i) => <a key={`${photo}-${i}`} href={externalWebUrl(photo) ?? (photo.startsWith("/") && !photo.startsWith("//") ? photo : "#")} target="_blank" rel="noreferrer"><img src={photo} alt={`Customer attachment ${i + 1}`} loading="lazy"/></a>)}</div>}</div>
        {(row.customerAddress || (row.customerLat != null && row.customerLng != null)) && <div className={s.note}><h3><MapPin size={16}/>Customer location</h3>{row.customerAddress && <p>{row.customerAddress}</p>}<a className={s.textLink} target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(row.customerLat != null && row.customerLng != null ? `${row.customerLat},${row.customerLng}` : row.customerAddress ?? "")}`}>Get directions <ArrowUpRight size={15}/></a></div>}
        {row.estimatedArrival && <div className={s.note}><h3>Arrival / timing</h3><p>{row.estimatedArrival}</p></div>}
        {row.vendorNotes && row.status !== "PENDING" && <div className={s.note}><h3>Your response to the customer</h3><p>{row.vendorNotes}</p></div>}
      </>}
      {row.kind !== "subscription" && <div className={s.section}><h3>Payment overview</h3><dl className={s.facts}><Fact label={row.kind === "booking" ? "Booking total" : "Agreed price"} value={payable == null ? "Not quoted yet" : money(payable)}/><Fact label="Paid online" value={money(paid)}/>{!closed && payable != null && <Fact label="Balance not paid online" value={money(Math.max(0, payable - paid))}/>} {row.coupon && <Fact label="Coupon applied" value={row.coupon}/>}<Fact label="Earnings" value={row.earningsReleased ? "Released" : closed ? "See Finance for payment history" : "Not released"}/></dl><p className={s.hint}>Cash or other offline payments are not confirmed by this total. Check the customer’s payment arrangement.</p></div>}
      {row.kind === "booking" && <>
        <div className={s.section}><h3><LockKeyhole size={15}/>Private team note</h3><label className={s.srOnly} htmlFor="desk-note">Private team note</label><textarea id="desk-note" name="vendorNote" value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={4000} placeholder="Preparation, preferences, reminders…"/><p className={s.hint}>Only your team sees this. Save independently of the booking status.</p><button type="button" className={s.secondary} disabled={note === (row.vendorNotes ?? "")} onClick={() => run(() => saveBookingPrivateNote(row.id, note), "Private note saved.")}>Save private note</button></div>
        <div className={s.section}><h3><Link2 size={16}/>Meeting link</h3>{!closed && !row.cancelledAt ? <><label className={s.srOnly} htmlFor="desk-meeting">Meeting URL</label><input id="desk-meeting" name="meetingUrl" type="url" placeholder="https://…" value={meeting} onChange={e => setMeeting(e.target.value)}/><p className={s.hint}>Saved links are shared with the customer.</p><button type="button" className={s.secondary} disabled={meeting === (row.meetingLink ?? "")} onClick={() => run(() => updateBookingMeetingLink(row.id, meeting), "Meeting link updated.")}>Save meeting link</button></> : <p className={s.hint}>{row.meetingLink ? "Meeting details for this appointment." : "No meeting link was added."}</p>}{externalWebUrl(row.meetingLink) && <a className={s.textLink} href={externalWebUrl(row.meetingLink)!} target="_blank" rel="noreferrer">Open meeting <ArrowUpRight size={15}/></a>}</div>
        {!closed && !row.cancelledAt && <div className={s.actionGroup}>{["PENDING", "DEPOSIT_PAID"].includes(row.status) && <button type="button" className={s.primary} onClick={() => setConfirmation("confirm")}><Check size={17}/>Confirm booking</button>}{["CONFIRMED", "DEPOSIT_PAID"].includes(row.status) && bookingTime(row) <= now && <button type="button" className={s.secondary} onClick={() => setConfirmation("no-show")}>Mark as no-show</button>}{!row.earningsReleased && <button type="button" className={s.danger} onClick={() => setConfirmation("cancel")}>Cancel booking</button>}</div>}
        {row.cancellationReason && <div className={s.note}><h3>Cancellation reason</h3><p>{row.cancellationReason}</p><small>Cancelled by {row.cancelledBy?.toLowerCase() ?? "account holder"} · {deskDate(row.cancelledAt)}</small></div>}
      </>}
      {row.kind === "request" && <>
        {row.status === "PENDING" && <form className={s.quoteForm} onSubmit={e => { e.preventDefault(); if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) { setError("Enter a valid price greater than zero."); return; } setConfirmation("quote"); }}><h3>Make it happen</h3><p className={s.hint}>Send a clear price and the next steps.</p><label htmlFor="desk-amount">Your offer (TTD)</label><input id="desk-amount" name="amount" type="number" min="0.01" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"/>{row.travelFee != null && row.travelFee > 0 && <p className={s.hint}>Listed travel fee: {money(row.travelFee)}. Include any applicable travel in your offer.</p>}<label htmlFor="desk-arrival">{row.requestType === "QUOTE" ? "Timing (optional)" : "Estimated arrival"}</label><input id="desk-arrival" value={arrival} required={row.requestType !== "QUOTE"} maxLength={200} onChange={e => setArrival(e.target.value)} placeholder={row.requestType === "QUOTE" ? "e.g. Within 3 working days" : "e.g. Today, in 45 minutes"}/><label htmlFor="desk-response">Message to customer</label><textarea id="desk-response" name="vendorNote" rows={3} maxLength={4000} value={note} onChange={e => setNote(e.target.value)} placeholder="What’s included and anything they should prepare…"/><button className={s.primary} type="submit"><Send size={16}/>Review & send offer</button></form>}
        {row.status === "CONFIRMED" && !row.vendorCompletedAt && !row.earningsReleased && <button type="button" className={s.primary} onClick={() => setConfirmation("complete")}><Check size={16}/>Work delivered</button>}
        {["PENDING", "ACCEPTED", "CONFIRMED"].includes(row.status) && !row.earningsReleased && <button type="button" className={s.danger} onClick={() => setConfirmation("cancel")}>{row.status === "PENDING" ? "Decline request" : "Cancel request"}</button>}
        {row.declineReason && <div className={s.note}><h3>Reason for closing</h3><p>{row.declineReason}</p></div>}
      </>}
      {row.kind === "subscription" && <>
        <div className={s.plan}><span className={s.eyebrow}>Recurring service</span><strong>{money(row.priceMinor / 100)} <small>/ {row.interval}</small></strong><p>Gross subscription price, before commission.</p>{row.sessionsIncluded != null && <><div className={s.sessionNumber}>{row.sessionsRemaining ?? "—"}<span>of {row.sessionsIncluded} sessions remaining</span></div><progress max={Math.max(1, row.sessionsIncluded)} value={row.sessionsRemaining ?? 0} aria-label="Sessions remaining"/></>}</div>
        <div className={s.section}><h3>Plan & access</h3><dl className={s.facts}><Fact label="Current period ends" value={deskDate(row.currentPeriodEnd)}/><Fact label="Next charge scheduled" value={row.cancelAtPeriodEnd || row.status !== "ACTIVE" ? "Not scheduled while ending or inactive" : deskDate(row.nextChargeAt)}/><Fact label="Last charge" value={deskDate(row.lastChargeAt)}/>{row.trialEndsAt && <Fact label="Trial ends" value={deskDate(row.trialEndsAt)}/>} {row.pausedAt && <Fact label="Paused since" value={deskDate(row.pausedAt)}/>} {row.pauseEndsAt && <Fact label="Pause ends" value={deskDate(row.pauseEndsAt)}/>} {row.canceledAt && <Fact label="Cancelled on" value={deskDate(row.canceledAt)}/>}<Fact label="Cancellation notice" value={`${row.cancellationNoticeDays} days`}/><Fact label="Customer can pause" value={row.canPause ? `Yes${row.pauseMaxWeeks ? ` · up to ${row.pauseMaxWeeks} weeks` : ""}` : "No"}/></dl><p className={s.hint}>Customers manage their renewal, pause and cancellation from their account. Message them if a plan needs attention.</p></div>
        {canRecordSession(row, now) && <button type="button" className={s.primary} onClick={() => setConfirmation("session")}><Check size={16}/>Record a completed session</button>}
        <div className={s.section}><h3>Recent session history</h3>{row.sessions.length ? <ol className={s.timeline}>{row.sessions.map(session => <li key={session.id}><Check size={15}/><span>Session delivered<small>{deskDate(session.usedAt, true)}</small></span></li>)}</ol> : <p className={s.hint}>No sessions have been recorded yet.</p>}{row.sessions.length === 20 && <p className={s.hint}>Showing the 20 most recent sessions.</p>}</div>
      </>}
      {confirmation && <div ref={confirmationRef} tabIndex={-1} className={s.confirmation} role="group" aria-label="Confirm update"><h3>Review your update</h3><p>{confirmationText}</p>{confirmation === "cancel" && <><label htmlFor="desk-reason">Reason shared with the customer</label><textarea id="desk-reason" name="reason" rows={3} required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain briefly and clearly…"/></>}<div className={s.buttonRow}><button type="button" className={s.primary} disabled={confirmation === "cancel" && !reason.trim()} onClick={proceed}>{busy ? "Updating…" : "Confirm update"}</button><button type="button" className={s.secondary} onClick={() => setConfirmation(null)}>Go back</button></div></div>}
    </fieldset>
    {busy && <p className={s.hint} role="status">Saving your update…</p>}{error && <p className={s.error} role="alert">{error}</p>}{success && <p className={s.success} role="status">{success}</p>}
    <details className={s.audit}><summary>Record information</summary><dl className={s.facts}><Fact label="Reference" value={row.id}/><Fact label="Created" value={deskDate(row.createdAt, true)}/>{row.kind === "request" && row.respondedAt && <Fact label="Responded" value={deskDate(row.respondedAt, true)}/>} {row.kind !== "subscription" && row.completedAt && <Fact label="Completed" value={deskDate(row.completedAt, true)}/>} {row.kind !== "subscription" && !closed && row.autoCompleteAt && <Fact label="Automatic completion check" value={deskDate(row.autoCompleteAt, true)}/>}</dl></details>
  </section>;
}
function Fact({ label, value }: { label: string; value: React.ReactNode }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
