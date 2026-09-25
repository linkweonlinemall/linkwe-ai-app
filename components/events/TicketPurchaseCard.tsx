"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, ChevronDown, Minus, Plus, ShieldCheck, Ticket, X } from "lucide-react";
import { createTicketPaymentIntent } from "@/app/actions/ticket-checkout";
import { validatePromoCode } from "@/app/actions/promo-codes";
import { formatTTDPrice } from "@/lib/format/price";
import { formatEventDateShort, formatEventTime } from "@/lib/events/format-datetime";
import { refundSummary, ticketLimit, ticketRemaining, ticketStatus, ticketSummary, validTicketDays, type DisplayPromo, type EventTicketOption } from "@/lib/events/detail";
import styles from "./tickets.module.css";

type Props = {
  eventId: string; eventSlug: string; startDate: Date; ticketTypes: EventTicketOption[];
  refundPolicyType: string | null; refundCutoffHours: number; preview?: boolean; checkedAt?: number;
};
function promoLabel(promo: DisplayPromo) {
  return promo.discountType === "PERCENT" ? promo.discountValue + "% off" : formatTTDPrice(promo.discountValue / 100) + " off";
}
export function TicketPurchaseCard({ eventId, startDate, ticketTypes, refundPolicyType, refundCutoffHours, preview = false, checkedAt }: Props) {
  const [now, setNow] = useState(() => new Date(checkedAt ?? Date.now()));
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<"select" | "success">("select");
  const [loading, setLoading] = useState(false), [error, setError] = useState<string | null>(null);
  const [promoInput, setPromoInput] = useState(""), [appliedPromo, setAppliedPromo] = useState<DisplayPromo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null), [promoApplying, setPromoApplying] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (phase !== "success") return;
    document.getElementById("event-tickets")?.scrollIntoView({ block: "start" });
  }, [phase]);

  const visibleTypes = ticketTypes.filter(ticket => ticket.isVisible);
  const started = new Date(startDate) <= now;
  const summary = ticketSummary(started ? [] : visibleTypes, quantities, appliedPromo, now);
  function adjust(ticket: EventTicketOption, delta: number) {
    if(appliedPromo)setPromoError("Ticket quantity changed. Apply your code again to update the discount.");
    setAppliedPromo(null);
    setQuantities(previous => ({ ...previous, [ticket.id]: Math.max(0, Math.min(ticketLimit(ticket), (previous[ticket.id] || 0) + delta)) }));
  }
  async function applyPromo() {
    if (preview) { setPromoError("Promo codes can be checked on the live event page."); return; }
    if (!promoInput.trim() || promoApplying) return;
    setPromoApplying(true); setPromoError(null);
    try {
      const result = await validatePromoCode(eventId, promoInput.trim(), summary.items.map(item=>({ticketTypeId:item.id,quantity:item.qty})));
      if (!result.ok) { setAppliedPromo(null); setPromoError(result.reason); return; }
      setAppliedPromo({ code: result.code, discountType: result.discountType, discountValue: result.discountValue });
      setPromoInput(result.code);
    } catch { setPromoError("We couldn’t check that code. Please try again."); }
    finally { setPromoApplying(false); }
  }
  async function getTickets() {
    if (preview || loading || !summary.totalTickets || started) return;
    setLoading(true); setError(null);
    try {
      const result = await createTicketPaymentIntent(eventId, summary.items.map(item => ({ ticketTypeId: item.id, quantity: item.qty })), appliedPromo?.code);
      if (!result.ok) { setError(result.error); return; }
      if (result.free) { setPhase("success"); return; }
      window.location.assign(result.checkoutUrl);
    } catch { setError("We couldn’t prepare your tickets. Please try again."); }
    finally { setLoading(false); }
  }
  if (phase === "success") return <section className={styles.purchase} aria-label="Tickets confirmed">
    <div className={styles.header}><span><Ticket size={17} aria-hidden/>YOU’RE ON THE LIST</span><h2>See you there.</h2></div>
    <div className={styles.success}><CheckCircle2 size={52} strokeWidth={1.4} aria-hidden/><h3>Your tickets are confirmed.</h3><p>They’re saved to your account, ready for your next good time.</p><Link href="/my-tickets">View my tickets<ArrowUpRight size={18} aria-hidden/></Link></div>
  </section>;
  return <section className={styles.purchase} aria-labelledby="ticket-selector-title">
    <div className={styles.header}><span><Ticket size={17} aria-hidden/>YOUR WAY IN</span><h2 id="ticket-selector-title">Make it a date.</h2><p>{formatEventDateShort(startDate)} · {formatEventTime(startDate)} AST</p></div>
    <div className={styles.body}>
      <p className={styles.intro}>Choose your tickets. Bring your people.</p>
      {preview && <p className={styles.preview}>Design preview · Try the ticket controls. Checkout is disabled and no tickets are reserved.</p>}
      {started && <p className={styles.notice} role="status">This event has started. Ticket sales are closed.</p>}
      {!visibleTypes.length && <p className={styles.notice}>Tickets haven’t been announced yet. Check the event details for updates from the organiser.</p>}
      <div className={styles.options}>
        {visibleTypes.map((ticket, index) => {
          const status = ticketStatus(ticket, now), remaining = ticketRemaining(ticket), max = ticketLimit(ticket);
          const qty = Math.min(quantities[ticket.id] || 0, max), days = validTicketDays(ticket.validDays);
          const accent = ticket.color && /^#[0-9a-f]{6}$/i.test(ticket.color) ? ticket.color : undefined;
          return <fieldset key={ticket.id} className={styles.option} data-selected={qty > 0} data-tone={index % 3} style={accent ? { "--ticket-accent": accent } as CSSProperties : undefined} disabled={loading || promoApplying}>
            <legend className="sr-only">{ticket.name}</legend>
            <div className={styles.optionHeading}><h3>{ticket.name}</h3><div><strong>{ticket.price === 0 ? "Free" : formatTTDPrice(ticket.price)}</strong>{ticket.price > 0 && <small>per ticket</small>}</div></div>
            {(ticket.perks?.trim() || ticket.description?.trim() || days.length > 0) && <details className={styles.inclusions}><summary>What’s included<ChevronDown size={15} aria-hidden/></summary><div>{ticket.description && <p>{ticket.description}</p>}{ticket.perks && <p>{ticket.perks}</p>}{days.length > 0 && <p><strong>Valid days</strong><br/>{days.join(" · ")}</p>}</div></details>}
            {status === "on_sale" && !started ? <div className={styles.quantityRow}><span>Quantity<small>Up to {max} per order</small></span><div className={styles.stepper}><button type="button" onClick={() => adjust(ticket, -1)} disabled={qty === 0 || loading || promoApplying} aria-label={"Remove one " + ticket.name + " ticket"}><Minus size={17} aria-hidden/></button><output aria-label={ticket.name + " ticket quantity"} aria-live="polite">{qty}</output><button type="button" onClick={() => adjust(ticket, 1)} disabled={qty >= max || loading || promoApplying} aria-label={"Add one " + ticket.name + " ticket"}><Plus size={17} aria-hidden/></button></div></div> : <p className={styles.ticketStatus}>{started ? "Sales closed" : status === "sold_out" ? "Sold out" : status === "not_started" ? "On sale " + formatEventDateShort(new Date(ticket.saleStartDate!)) + " · " + formatEventTime(new Date(ticket.saleStartDate!)) + " AST" : "Sales closed"}</p>}
            {status === "on_sale" && !started && <div className={styles.saleNote}>{ticket.saleEnds && <span>Sales close {formatEventDateShort(new Date(ticket.saleEnds))} · {formatEventTime(new Date(ticket.saleEnds))} AST</span>}{remaining !== null && remaining > 0 && remaining <= 20 && <strong>Only {remaining} left</strong>}</div>}
          </fieldset>;
        })}
      </div>
      {summary.items.length > 0 && <>
        <details className={styles.promo}><summary>Have a promo code?<ChevronDown size={15} aria-hidden/></summary>{appliedPromo ? <div className={styles.appliedPromo}><span><strong>{appliedPromo.code}</strong> · {promoLabel(appliedPromo)}</span><button type="button" aria-label="Remove promo code" disabled={loading} onClick={() => { setAppliedPromo(null); setPromoInput(""); setPromoError(null); }}><X size={17} aria-hidden/></button></div> : <div className={styles.promoEntry}><input aria-label="Promo code" value={promoInput} onChange={event => { setPromoInput(event.target.value.toUpperCase()); setPromoError(null); }} placeholder="Enter code" autoComplete="off" spellCheck={false} disabled={loading || promoApplying}/><button type="button" onClick={() => void applyPromo()} disabled={loading || promoApplying || !promoInput.trim()}>{promoApplying ? "Checking…" : "Apply"}</button></div>}{promoError && <p className={styles.error} role="alert">{promoError}</p>}</details>
        <div className={styles.summary} aria-label="Ticket order summary"><p>YOUR PLAN, AT A GLANCE</p>{summary.items.map(item => <div key={item.id}><span>{item.qty} × {item.name}</span><strong>{formatTTDPrice(item.qty * item.price)}</strong></div>)}{appliedPromo && summary.discountMinor > 0 && <div className={styles.discount}><span>{appliedPromo.code} · {promoLabel(appliedPromo)}</span><strong>−{formatTTDPrice(summary.discountMinor / 100)}</strong></div>}<div className={styles.total}><span>Total <small>TTD</small></span><output aria-label="Ticket total" aria-live="polite">{summary.totalMinor === 0 ? "Free" : formatTTDPrice(summary.totalMinor / 100)}</output></div></div>
      </>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button type="button" className={styles.checkout} onClick={() => void getTickets()} disabled={!summary.totalTickets || loading || promoApplying || started || preview}>{loading ? "Preparing your tickets…" : preview ? "Checkout disabled in preview" : summary.totalMinor === 0 && summary.totalTickets > 0 ? "Register free" : "Get tickets"}<ArrowUpRight size={18} aria-hidden/></button>
      {!summary.totalTickets && visibleTypes.some(ticket => ticketStatus(ticket, now) === "on_sale") && !started && <p className={styles.help}>Select a quantity to see your total.</p>}
      <p className={styles.refund}><ShieldCheck size={15} aria-hidden/>{refundSummary(refundPolicyType, refundCutoffHours)}</p>
    </div>
  </section>;
}
