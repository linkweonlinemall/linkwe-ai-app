"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, Package, Pencil, Plus, Search, Sparkles, Tag, Ticket, X } from "lucide-react";
import { listStoreCoupons, saveStoreCoupon, toggleStoreCoupon, type StoreCouponRow } from "@/app/actions/store-coupons";
import { creationKey, type CreationItem, type CreationKind } from "@/lib/vendor/creation/model";
import s from "./creation.module.css";

const kinds = {
  product: { label: "Products", singular: "Product", icon: Package },
  service: { label: "Services", singular: "Service", icon: Sparkles },
  event: { label: "Whole events", singular: "Event · all tickets", icon: CalendarDays },
  ticket: { label: "Ticket tiers", singular: "Ticket tier", icon: Ticket },
};
function targetLabel(item: CreationItem) {
  return item.kind === "ticket" ? `${item.title} · ${item.eventTitle}` : item.title;
}

export default function CouponManager({ initialCoupons, creations }: { initialCoupons: StoreCouponRow[]; creations: CreationItem[] }) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [formVersion, setFormVersion] = useState(0);
  const [editing, setEditing] = useState<StoreCouponRow | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [type, setType] = useState("PERCENT");
  const [scopes, setScopes] = useState(["product", "service", "event"]);
  const [targetMode, setTargetMode] = useState<"all" | "selected">("all");
  const [targets, setTargets] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | CreationKind>("all");
  const [shown, setShown] = useState(40);
  const dialog = useRef<HTMLDialogElement>(null);
  const byKey = new Map(creations.map(item => [creationKey(item), item]));
  const filtered = creations.filter(item => (kind === "all" || item.kind === kind) && `${item.title} ${item.eventTitle ?? ""}`.toLowerCase().includes(query.toLowerCase().trim()));

  async function refresh() {
    const result = await listStoreCoupons();
    if (result.ok) setCoupons(result.coupons);
    else throw new Error(result.error);
  }
  function close() { dialog.current?.close(); setIsOpen(false); }
  function open(row: StoreCouponRow | null) {
    setFormVersion(value => value + 1);
    setEditing(row); setType(row?.discountType ?? "PERCENT");
    setScopes(row?.scopes ?? ["product", "service", "event"]);
    setTargetMode(row?.targets.length ? "selected" : "all"); setTargets(row?.targets ?? []);
    setQuery(""); setKind("all"); setShown(40); setError(""); setIsOpen(true);
    dialog.current?.showModal();
  }
  async function save(form: FormData) {
    setPending(true); setError("");
    try {
      const value = Number(form.get("value"));
      const result = await saveStoreCoupon({
        id: editing?.id, code: String(form.get("code")), discountType: type,
        discountValue: type === "PERCENT" ? value : Math.round(value * 100),
        minimumMinor: Math.round(Number(form.get("minimum") || 0) * 100),
        expiresAt: String(form.get("expires") || "") || null, scopes, targetMode, targets,
      });
      if (!result.ok) { setError(result.error); return; }
      await refresh(); close();
      setNotice(editing ? "Coupon updated. Existing order discounts are unchanged." : "Coupon created. Share the code with your customers.");
    } catch { setError("Could not save this coupon. Please try again."); }
    finally { setPending(false); }
  }
  async function toggle(row: StoreCouponRow) {
    setPending(true); setError("");
    try { const result = await toggleStoreCoupon(row.id, !row.active); if (!result.ok) setError(result.error); else await refresh(); }
    catch { setError("Could not update this coupon."); }
    finally { setPending(false); }
  }
  function toggleTarget(key: string) { setTargets(old => old.includes(key) ? old.filter(value => value !== key) : [...old, key]); }

  return <div className={s.zone}>
    <Link className={s.backLink} href="/dashboard/vendor/creation"><ArrowLeft size={16} /> Creation Zone</Link>
    <header className={s.editorHeader} data-tone="peach">
      <span className={s.editorIcon}><Tag size={30} /></span>
      <div><p className={s.eyebrow}>A LITTLE EXTRA REASON TO SAY YES</p><h1>Good things. Better offers.</h1><p>A store-wide offer or a little love for one special creation.</p></div>
      <button className={s.primaryButton} onClick={() => open(null)}><Plus size={17} /> Create coupon</button>
    </header>
    <div className={s.setupNote}><span>Coupons cover eligible purchases from your store. Delivery stays separate. Service subscription coupons apply to the first checkout payment; renewals keep their regular price.</span></div>
    {notice && <p className={s.success} role="status"><Check size={16} />{notice}</p>}
    {error && !isOpen && <p className={s.error} role="alert">{error}</p>}
    <section className={s.library}>
      <div className={s.libraryHeading}><div><p className={s.eyebrow}>YOUR OFFERS, ALL TOGETHER</p><h2>Store coupons <span>{coupons.length}</span></h2></div></div>
      <div className={s.items}>{coupons.map(row => {
        const expired = !!row.expiresAt && new Date(row.expiresAt) <= new Date();
        return <article key={row.id} className={s.couponCard}>
          <div><Tag size={23} /><span className={s.status}>{expired ? "Expired" : row.active ? "Active" : "Paused"}</span></div>
          <strong>{row.discountType === "PERCENT" ? `${row.discountValue}%` : `TTD ${(row.discountValue / 100).toFixed(2)}`} <small>off</small></strong>
          <h3>{row.code}</h3>
          {row.targets.length ? <div className={s.couponCoverage}>
            <b>{row.targets.length === 1 ? "Just this creation" : `${row.targets.length} selected creations`}</b>
            <ul>{row.targets.slice(0, 3).map(key => { const item = byKey.get(key); return <li key={key}>{item ? targetLabel(item) : "Removed creation"}{item?.kind === "event" && " · all tickets"}</li>; })}</ul>
            {row.targets.length > 3 && <span>+ {row.targets.length - 3} more</span>}
          </div> : <p>All {row.scopes.map(scope => scope === "event" ? "events & tickets" : scope === "product" ? "products" : "services").join(" · ")}</p>}
          <p>{row.minimumMinor ? `Minimum TTD ${(row.minimumMinor / 100).toFixed(2)} on eligible items` : "No minimum spend"}<br />{row.expiresAt ? `Ends ${new Date(row.expiresAt).toLocaleDateString("en-TT", { timeZone: "America/Port_of_Spain", day: "numeric", month: "short", year: "numeric" })}` : "No expiry date"} · Unlimited redemptions</p>
          <div className={s.itemActions}><button className={s.editLink} onClick={() => open(row)}><Pencil size={14} /> Edit offer <ArrowUpRight size={14} /></button><button className={s.secondaryButton} disabled={pending} onClick={() => void toggle(row)}>{row.active ? "Pause" : "Activate"}</button></div>
        </article>;
      })}</div>
      {!coupons.length && <div className={s.empty}><Tag size={37} /><h3>Give them a reason to come back.</h3><p>Choose one creation, a few favourites or everything you offer.</p><button onClick={() => open(null)}>Create your first coupon <Plus size={16} /></button></div>}
      <p className={s.couponHelp}>Existing event-only promo codes are still available inside each event’s Tickets & promotions tab. If both use the same code, the event’s offer takes priority.</p>
    </section>
    <dialog ref={dialog} className={`${s.actionDialog} ${s.couponDialog}`} aria-labelledby="coupon-heading" onClose={() => setIsOpen(false)} onCancel={event => { if (pending) event.preventDefault(); }}>
      <form action={save} key={formVersion}>
        <div className={s.dialogHeading}><h2 id="coupon-heading">{editing ? "Edit coupon" : "Create a coupon"}</h2><button type="button" className={s.iconButton} aria-label="Close coupon editor" disabled={pending} onClick={close}><X size={18} /></button></div>
        <label className={s.dialogInput}>Coupon code<input name="code" required pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,29}" maxLength={30} defaultValue={editing?.code ?? ""} placeholder="LOCALLOVE" autoCapitalize="characters" /></label>
        <div className={s.couponFields}>
          <label className={s.dialogInput}>Discount type<select value={type} onChange={event => setType(event.target.value)}><option value="PERCENT">Percentage</option><option value="FIXED">Amount in TTD</option></select></label>
          <label className={s.dialogInput}>{type === "PERCENT" ? "Percentage off" : "Amount off (TTD)"}<input key={`${editing?.id}-${type}`} name="value" type="number" required min={type === "PERCENT" ? 1 : .01} max={type === "PERCENT" ? 100 : 1000000} step={type === "PERCENT" ? 1 : .01} defaultValue={editing && editing.discountType === type ? (type === "PERCENT" ? editing.discountValue : editing.discountValue / 100) : undefined} /></label>
        </div>
        <fieldset className={s.coverageModes}><legend>Where can customers use it?</legend>
          <label data-selected={targetMode === "all"}><input type="radio" name="coverage" checked={targetMode === "all"} onChange={() => setTargetMode("all")} /><span><b>All eligible creations</b><small>Choose types. New creations are included too.</small></span></label>
          <label data-selected={targetMode === "selected"}><input type="radio" name="coverage" checked={targetMode === "selected"} onChange={() => setTargetMode("selected")} /><span><b>Specific creations</b><small>Choose one product, service, ticket tier or a selection.</small></span></label>
        </fieldset>
        {targetMode === "all" ? <fieldset className={s.scopeFields}><legend>Include these types</legend>{["product", "service", "event"].map(scope => <label key={scope}><input type="checkbox" checked={scopes.includes(scope)} onChange={event => setScopes(old => event.target.checked ? [...old, scope] : old.filter(item => item !== scope))} />{scope === "event" ? "Events & tickets" : scope === "product" ? "Products & digital downloads" : "All service types"}</label>)}</fieldset> : <div className={s.targetPicker}>
          <div className={s.targetHeading}><b>{targets.length} selected</b><button type="button" disabled={!targets.length} onClick={() => setTargets([])}>Clear selection</button></div>
          {targets.length > 0 && <div className={s.selectedTargets}>{targets.map(key => <button key={key} type="button" onClick={() => toggleTarget(key)} aria-label={`Remove ${byKey.has(key) ? targetLabel(byKey.get(key)!) : "removed creation"}`}><span>{byKey.has(key) ? targetLabel(byKey.get(key)!) : "Removed creation"}</span><X size={13} /></button>)}</div>}
          <div className={s.targetFilters}>
            <label className={s.search}><Search size={17} /><input aria-label="Search creations" value={query} onChange={event => { setQuery(event.target.value); setShown(40); }} placeholder="Find your creation…" /></label>
            <select aria-label="Creation type" value={kind} onChange={event => { setKind(event.target.value as typeof kind); setShown(40); }}><option value="all">All types</option>{Object.entries(kinds).map(([value, design]) => <option key={value} value={value}>{design.label}</option>)}</select>
          </div>
          <div className={s.targetOptions} role="group" aria-label="Select creations">{filtered.slice(0, shown).map(item => {
            const key = creationKey(item), Icon = kinds[item.kind].icon;
            const coveredByEvent = item.kind === "ticket" && targets.includes(`event:${item.eventId}`);
            return <label key={key} className={s.targetOption} data-selected={targets.includes(key)}>
              <input type="checkbox" checked={targets.includes(key)} onChange={() => toggleTarget(key)} disabled={targets.length >= 500 && !targets.includes(key)} />
              <span className={s.targetIcon} data-kind={item.kind}><Icon size={18} /></span>
              <span><strong>{item.title}</strong><small>{kinds[item.kind].singular}{item.eventTitle ? ` · ${item.eventTitle}` : ""}{!item.published ? ` · ${item.status}` : ""}{coveredByEvent ? " · Already covered by selected event" : ""}</small></span>
            </label>;
          })}{!filtered.length && <p className={s.targetEmpty}>{creations.length ? "No matching creations. Try a different search." : "Save your first creation, then return to select it here."}</p>}
          </div>
          {filtered.length > shown && <button type="button" className={s.targetMore} onClick={() => setShown(count => count + 40)}>Show more ({filtered.length - shown} remaining)</button>}
          <p className={s.couponHelp}>Choosing a whole event includes all its ticket tiers, including future tiers. Choose a ticket tier to discount only that ticket. Other items in the customer’s purchase keep their normal price.</p>
        </div>}
        <div className={s.couponFields}>
          <label className={s.dialogInput}>Minimum spend (TTD)<input name="minimum" type="number" min={0} step="0.01" defaultValue={(editing?.minimumMinor ?? 0) / 100} /></label>
          <label className={s.dialogInput}>Expiry (optional)<input type="date" name="expires" defaultValue={editing?.expiresAt ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Port_of_Spain", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(editing.expiresAt)) : ""} /></label>
        </div>
        <p className={s.couponHelp}>The minimum applies only to eligible creations before delivery. Expiry is at the end of the selected day in Trinidad & Tobago.</p>
        {error && <p role="alert" className={s.error}>{error}</p>}
        <div className={s.dialogFooter}><button className={s.secondaryButton} type="button" onClick={close} disabled={pending}>Cancel</button><button className={s.primaryButton} disabled={pending || (targetMode === "all" ? !scopes.length : !targets.length)}>{pending ? "Saving…" : "Save coupon"}</button></div>
      </form>
    </dialog>
  </div>;
}
