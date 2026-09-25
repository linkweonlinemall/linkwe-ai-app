"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, ConciergeBell, LayoutList, Plus, RefreshCw, Repeat2, Search, SlidersHorizontal, Sparkles, Users, Zap } from "lucide-react";
import AvailabilityToggle from "@/components/vendor/AvailabilityToggle";
import { cancelServiceDeskBooking } from "@/app/actions/vendor-service-desk";
import { updateBookingStatus } from "@/app/actions/booking";
import { bookingDay, bookingTime, deskDate, deskKey, deskStatus, filterDesk, isClosed, kindLabel, matchesQueue, money, monthlyRecurringMinor, needsAttention, type DeskQueue, type DeskRecord } from "@/lib/vendor/service-desk";
import { ymdInTrinidad } from "@/lib/timezone/trinidad";
import DeskDetail from "./DeskDetail";
import { scrollDeskPanel } from "./scroll-panel";
import s from "./service-desk.module.css";

const kinds = [{ key: "all", label: "All work", icon: LayoutList }, { key: "booking", label: "Bookings", icon: CalendarDays }, { key: "request", label: "Requests & quotes", icon: Zap }, { key: "subscription", label: "Subscriptions", icon: Repeat2 }];
const queues: { key: DeskQueue; label: string }[] = [{ key: "all", label: "Everything" }, { key: "attention", label: "Needs attention" }, { key: "upcoming", label: "Upcoming" }, { key: "waiting", label: "Awaiting customer" }, { key: "active", label: "In progress" }, { key: "history", label: "History" }];
export default function ServiceDesk({ store, records, renderedAt }: { store: { id: string; name: string; isAvailableNow: boolean }; records: DeskRecord[]; renderedAt: string }) {
  const params = useSearchParams(), router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [now, setNow] = useState(new Date(renderedAt).getTime());
  const [limit, setLimit] = useState(20), [checked, setChecked] = useState<string[]>([]), [bulkConfirm, setBulkConfirm] = useState<"confirm" | "cancel" | null>(null), [bulkReason, setBulkReason] = useState(""), [bulkBusy, setBulkBusy] = useState(false), [bulkResult, setBulkResult] = useState("");
  const detailRef = useRef<HTMLDivElement>(null), listRef = useRef<HTMLElement>(null);
  const kind = kinds.some(k => k.key === params.get("type")) ? params.get("type")! : "all";
  const queue = queues.some(q => q.key === params.get("queue")) ? params.get("queue") as DeskQueue : "all";
  const query = params.get("q") ?? "", service = params.get("service") ?? "", sort = params.get("sort") ?? "priority";
  const calendar = params.get("view") === "calendar";
  const today = ymdInTrinidad(new Date(now));
  const dateValue = params.get("day");
  const day = dateValue && /^\d{4}-\d{2}-\d{2}$/.test(dateValue) && Number.isFinite(Date.parse(dateValue)) ? dateValue : today;
  const recordKey = params.get("record"), selected = records.find(r => deskKey(r) === recordKey);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!recordKey) return;
    const title = detailRef.current?.querySelector<HTMLElement>("#desk-detail-title");
    title?.focus({ preventScroll: true });
    if (window.innerWidth < 1180) scrollDeskPanel(detailRef.current);
  }, [recordKey]);
  function setParams(updates: Record<string, string | null>, reset = true) {
    const next = new URLSearchParams(params.toString());
    Object.entries(updates).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    window.history.replaceState(null, "", `/dashboard/vendor/service-desk${next.size ? `?${next.toString()}` : ""}`);
    if (reset) { setLimit(20); setChecked([]); setBulkConfirm(null); setBulkResult(""); }
  }
  function open(row: DeskRecord) { setParams({ record: deskKey(row) }, false); }
  function close() { setParams({ record: null }, false); requestAnimationFrame(() => { listRef.current?.focus({ preventScroll: true }); scrollDeskPanel(listRef.current); }); }
  const services = useMemo(() => [...new Map(records.map(r => [r.service.id, r.service])).values()].sort((a, b) => a.name.localeCompare(b.name)), [records]);
  const base = filterDesk(records, { kind: calendar ? "booking" : kind, queue, query, service, sort, now });
  const filtered = calendar ? base.filter(r => r.kind === "booking" && bookingDay(r) === day).sort((a, b) => a.kind === "booking" && b.kind === "booking" ? bookingTime(a) - bookingTime(b) : 0) : base;
  const visible = filtered.slice(0, limit);
  const upcoming = records.filter(r => r.kind === "booking" && !isClosed(r) && bookingTime(r, true) >= now).sort((a, b) => a.kind === "booking" && b.kind === "booking" ? bookingTime(a) - bookingTime(b) : 0);
  const attention = records.filter(r => needsAttention(r, now)).length;
  const waiting = records.filter(r => matchesQueue(r, "waiting", now)).length;
  const activeSubs = records.filter(r => r.kind === "subscription" && r.status === "ACTIVE" && (!r.currentPeriodEnd || new Date(r.currentPeriodEnd).getTime() > now)).length;
  const selectable = visible.filter(r => r.kind === "booking" && !r.cancelledAt && !r.earningsReleased && !isClosed(r));
  const checkedRows = records.filter(r => checked.includes(deskKey(r)) && r.kind === "booking" && !r.cancelledAt && !r.earningsReleased && !isClosed(r));
  const confirmableRows = checkedRows.filter(r => ["PENDING", "DEPOSIT_PAID"].includes(r.status));
  async function confirmSelected() {
    setBulkBusy(true); setBulkResult("");
    let success = 0; const failed: string[] = [];
    for (const row of bulkConfirm === "confirm" ? confirmableRows : checkedRows) {
      try { const result = await (bulkConfirm === "cancel" ? cancelServiceDeskBooking(row.id, bulkReason) : updateBookingStatus(row.id, "CONFIRMED")); if ("ok" in result && result.ok) success++; else failed.push(deskKey(row)); }
      catch { failed.push(deskKey(row)); }
    }
    setChecked(failed); setBulkResult(`${success} booking${success === 1 ? "" : "s"} ${bulkConfirm === "cancel" ? "cancelled" : "confirmed"}.${failed.length ? ` ${failed.length} could not be updated. Refresh and review each booking before retrying.` : " Customers will be notified."}`);
    setBulkBusy(false); setBulkConfirm(null); router.refresh();
  }
  function moveDay(offset: number) { const d = new Date(`${day}T12:00:00-04:00`); d.setUTCDate(d.getUTCDate() + offset); setParams({ day: ymdInTrinidad(d) }); }
  const weekStart = new Date(`${day}T12:00:00-04:00`); weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, index) => { const d = new Date(weekStart); d.setUTCDate(d.getUTCDate() + index); return { ymd: ymdInTrinidad(d), date: d }; });
  return <div className={s.workspace}>
    <header className={s.hero}>
      <div className={s.heroCopy}><span className={s.eyebrow}><span className={s.liveDot}/>Your services. In sync.</span><h1>Great service.<br/><em>One calm workspace.</em></h1><p>Bookings, requests and subscriptions.<br className={s.desktopBreak}/> Everything you need to look after your customers.</p><div className={s.buttonRow}><Link href="/dashboard/vendor/creation/new?type=service" className={s.primary}><Plus size={18}/>Create a service</Link><Link href="/dashboard/vendor/staff" className={s.heroLink}>Staff & availability <ArrowUpRight size={16}/></Link></div></div>
      <div className={s.heroArt} aria-hidden="true"><div className={s.orbit}/><div className={s.artBack}><Repeat2 size={30}/><i/><i/></div><div className={s.artFront}><span>SERVICE DESK <Sparkles size={14}/></span><div><CalendarDays size={42}/><b>All together.</b></div><p><Check size={14}/>Your next good day starts here</p></div><span className={s.artBadge}><ConciergeBell size={28}/></span></div>
    </header>
    <section className={s.metrics} aria-label="Service desk overview" data-tour="desk-summary">
      {[{ title: "Needs attention", count: attention, icon: Zap, tone: "orange", queue: "attention" }, { title: "Upcoming bookings", count: upcoming.length, icon: CalendarDays, tone: "mint", queue: "upcoming" }, { title: "Active subscriptions", count: activeSubs, icon: Repeat2, tone: "lavender", queue: "subscriptions" }, { title: "Awaiting customer", count: waiting, icon: Clock3, tone: "sand", queue: "waiting" }].map(metric => <button type="button" key={metric.title} className={s.metric} onClick={() => setParams({ type: metric.queue === "subscriptions" ? "subscription" : "all", queue: metric.queue === "subscriptions" ? "active" : metric.queue, view: null, record: null })}><span className={`${s.metricIcon} ${s[metric.tone]}`}><metric.icon size={22}/></span><span><strong>{metric.count}</strong><span>{metric.title}</span></span><ArrowUpRight size={17}/></button>)}
    </section>
    <div className={s.workspaceHeading}><div><span className={s.eyebrow}>Service Desk</span><h2>A little order. A lot more ease.</h2></div><button type="button" className={s.secondary} onClick={() => startRefresh(() => router.refresh())} disabled={refreshing || bulkBusy}><RefreshCw size={15} className={refreshing ? s.spin : ""}/>{refreshing ? "Refreshing…" : "Refresh"}</button></div>
    <div className={s.kindTabs} aria-label="Service types" data-tour="desk-types">{kinds.map(item => <button type="button" key={item.key} aria-pressed={kind === item.key} onClick={() => setParams({ type: item.key === "all" ? null : item.key, queue: null, view: null, record: null })}><item.icon size={18}/>{item.label}<span>{records.filter(r => item.key === "all" || r.kind === item.key).length}</span></button>)}</div>
    {kind === "subscription" && <div className={s.recurringSummary}><Repeat2 size={21}/><div><strong>{money(monthlyRecurringMinor(records, now) / 100)}</strong><span>Estimated monthly recurring revenue · active plans, before commission. This is not your payout balance.</span></div></div>}
    <div className={s.workGrid}>
      <section ref={listRef} tabIndex={-1} className={s.library} aria-label="Service records" data-tour="desk-list">
        <div className={s.toolbar} data-tour="desk-filters"><label className={s.search}><Search size={19}/><input type="search" aria-label="Search service work" placeholder="Customer, service or reference…" value={query} onChange={e => setParams({ q: e.target.value || null })}/></label><div className={s.viewToggle}><button type="button" aria-label="List view" aria-pressed={!calendar} onClick={() => setParams({ view: null })}><LayoutList size={18}/></button><button type="button" aria-label="Appointment calendar" aria-pressed={calendar} onClick={() => setParams({ view: "calendar", type: "booking", queue: null })}><CalendarDays size={18}/></button></div></div>
        <div className={s.filters}><label><SlidersHorizontal size={14}/><span className={s.srOnly}>Work queue</span><select aria-label="Work queue" value={queue} onChange={e => setParams({ queue: e.target.value })}>{queues.map(q => <option key={q.key} value={q.key}>{q.label}</option>)}</select></label><label><span className={s.srOnly}>Service</span><select aria-label="Filter by service" value={service} onChange={e => setParams({ service: e.target.value || null })}><option value="">Every service</option>{services.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span className={s.srOnly}>Sort</span><select aria-label="Sort work" value={sort} onChange={e => setParams({ sort: e.target.value })}><option value="priority">Priority first</option><option value="newest">Newest first</option><option value="schedule">Next scheduled</option></select></label></div>
        {calendar && <div className={s.calendar}><div className={s.calendarHeading}><h3>Your appointment week</h3><div><button className={s.iconButton} aria-label="Previous week" onClick={() => moveDay(-7)}><ChevronLeft size={18}/></button><button className={s.textLink} onClick={() => setParams({ day: today })}>Today</button><button className={s.iconButton} aria-label="Next week" onClick={() => moveDay(7)}><ChevronRight size={18}/></button></div></div><div className={s.week}>{week.map(item => { const count = base.filter(r => r.kind === "booking" && bookingDay(r) === item.ymd).length; return <button type="button" key={item.ymd} aria-pressed={day === item.ymd} aria-label={`${deskDate(item.date.toISOString())}, ${count} bookings`} onClick={() => setParams({ day: item.ymd })}><span>{item.date.toLocaleDateString("en-TT", { weekday: "short", timeZone: "America/Port_of_Spain" })}</span><strong>{item.date.getUTCDate()}</strong><small>{count || "—"}</small></button>; })}</div><label className={s.datePicker}>Jump to date<input type="date" aria-label="Appointment date" value={day} onChange={e => e.target.value && setParams({ day: e.target.value })}/></label><p className={s.hint}>Appointment times are in Trinidad & Tobago (UTC−4).</p></div>}
        <div className={s.resultHeading}><span aria-live="polite">{filtered.length} {filtered.length === 1 ? "record" : "records"}{calendar ? ` · ${deskDate(`${day}T12:00:00-04:00`)}` : ""}</span>{(query || service || queue !== "all") && <button type="button" className={s.textLink} onClick={() => setParams({ q: null, service: null, queue: null })}>Clear filters</button>}</div>
        {kind === "booking" && selectable.length > 0 && <div className={s.bulk}><label><input type="checkbox" aria-label="Select visible open bookings" disabled={bulkBusy} checked={selectable.every(r => checked.includes(deskKey(r)))} onChange={e => { setChecked(e.target.checked ? selectable.map(deskKey) : []); setBulkConfirm(null); }}/><span>Select open bookings</span></label>{checkedRows.length > 0 && <div className={s.buttonRow}>{confirmableRows.length > 0 && <button className={s.textLink} disabled={bulkBusy} onClick={() => setBulkConfirm("confirm")}>Confirm ({confirmableRows.length})</button>}<button className={s.textLink} disabled={bulkBusy} onClick={() => setBulkConfirm("cancel")}>Cancel ({checkedRows.length})</button></div>}</div>}
        {bulkConfirm && <div className={s.bulkReview} role="group" aria-label="Review selected bookings"><strong>{bulkConfirm === "cancel" ? "Cancel" : "Confirm"} {bulkConfirm === "cancel" ? checkedRows.length : confirmableRows.length} appointments?</strong><p>Each customer will be notified. Review the selected services and times before continuing.</p><div>{bulkConfirm === "cancel" && <label>Reason shared with each customer<textarea aria-label="Bulk cancellation reason" maxLength={1000} value={bulkReason} onChange={e => setBulkReason(e.target.value)}/><p>Eligible online payments follow the existing refund process.</p></label>}</div><div className={s.buttonRow}><button className={s.primary} onClick={confirmSelected} disabled={bulkBusy || (bulkConfirm === "cancel" && !bulkReason.trim())}>{bulkBusy ? "Updating…" : "Confirm update"}</button><button className={s.secondary} onClick={() => setBulkConfirm(null)} disabled={bulkBusy}>Go back</button></div></div>}
        {bulkResult && <p className={s.bulkReview} role="status">{bulkResult}</p>}
        <div className={s.records}>{visible.map(row => { const state = deskStatus(row, now); const Icon = row.kind === "booking" ? CalendarDays : row.kind === "subscription" ? Repeat2 : Zap; return <article key={deskKey(row)} className={`${s.record} ${selected?.id === row.id && selected.kind === row.kind ? s.selected : ""}`}>
          {kind === "booking" && row.kind === "booking" && !row.cancelledAt && !row.earningsReleased && !isClosed(row) && <input className={s.rowCheck} type="checkbox" aria-label={`Select ${row.service.name} for ${row.customer?.fullName ?? "customer"} on ${deskDate(row.bookingDate)}`} checked={checked.includes(deskKey(row))} disabled={bulkBusy} onChange={e => { setChecked(current => e.target.checked ? [...current, deskKey(row)] : current.filter(key => key !== deskKey(row))); setBulkConfirm(null); }}/>}
          <button type="button" className={s.recordButton} aria-pressed={selected === row} onClick={() => open(row)} data-tour="desk-record"><div className={`${s.recordImage} ${s[row.kind]}`}>{row.service.images[0] ? <img src={row.service.images[0]} alt="" loading="lazy"/> : <Icon size={27}/>}<span><Icon size={13}/></span></div><div className={s.recordContent}><div className={s.recordMeta}><span>{kindLabel(row)}</span><span className={`${s.badge} ${s[state.tone]}`}>{state.label}</span></div><h3>{row.service.name}</h3><p>{row.customer?.fullName ?? "Customer"}</p><div className={s.recordBottom}><span>{row.kind === "booking" ? `${deskDate(row.bookingDate)} · ${row.startTime}` : row.kind === "subscription" ? `${row.sessionsRemaining ?? "No fixed"} sessions${row.sessionsRemaining != null ? " left" : ""}` : `Received ${deskDate(row.createdAt)}`}</span><strong>{row.kind === "subscription" ? `${money(row.priceMinor / 100)} / ${row.interval}` : row.kind === "booking" ? money(row.totalPrice) : row.quotedPrice == null ? "Price to quote" : money(row.quotedPrice)}</strong></div></div><ChevronRight size={19} className={s.recordArrow}/></button>
        </article>; })}</div>
        {!filtered.length && <div className={s.empty}><span><ConciergeBell size={35}/></span><h3>{records.length ? "A little breathing room." : "Ready for your first customer."}</h3><p>{records.length ? "No work matches this view. Try another date or clear your filters." : "Your bookings, requests, quotes and subscriptions will appear here as customers get in touch."}</p><Link className={s.textLink} href="/dashboard/vendor/creation?type=service">Manage your services <ArrowUpRight size={15}/></Link></div>}
        {filtered.length > limit && <button type="button" className={s.loadMore} onClick={() => setLimit(limit + 20)}>Show more ({filtered.length - limit} remaining) <ArrowDownLeft size={16}/></button>}
      </section>
      <div className={s.detailColumn} ref={detailRef}>{selected ? <DeskDetail key={deskKey(selected)} row={selected} storeId={store.id} now={now} close={close}/> : <>
        {recordKey && <p role="status" className={s.error}>This record is no longer available in your store.</p>}
        <section className={s.dayAhead}><span className={s.eyebrow}><Sparkles size={13}/>A little head start</span><h2>Your day,<br/><em>looking good.</em></h2><p>Open any record to see the full picture and take the next step.</p><div className={s.upNext}><span className={s.eyebrow}>Next on your calendar</span>{upcoming.slice(0, 3).map(row => row.kind === "booking" && <button type="button" key={row.id} onClick={() => open(row)}><span className={s.dateTile}><strong>{new Date(bookingTime(row)).toLocaleDateString("en-TT", { day: "numeric", timeZone: "America/Port_of_Spain" })}</strong><small>{new Date(bookingTime(row)).toLocaleDateString("en-TT", { month: "short", timeZone: "America/Port_of_Spain" })}</small></span><span><strong>{row.service.name}</strong><small>{row.startTime} · {row.customer?.fullName ?? "Customer"}</small></span><ArrowRight size={16}/></button>)}{!upcoming.length && <p className={s.hint}>No upcoming appointments yet.</p>}</div></section>
        <div data-tour="vendor-availability"><AvailabilityToggle key={String(store.isAvailableNow)} initialAvailable={store.isAvailableNow}/></div>
        <Link href="/dashboard/vendor/staff" className={s.staffLink}><Users size={20}/><span><strong>Keep the team in sync</strong><small>Manage staff & working hours</small></span><ArrowUpRight size={18}/></Link>
      </>}</div>
    </div>
  </div>;
}
