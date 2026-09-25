"use client";

import { useRef, type ReactNode } from "react";
import Link from "next/link";
import NextImage from "next/image";
import type { IdVerificationStatus, StoreStatus } from "@prisma/client";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, Check, CheckCheck, ChevronDown, CircleHelp, Eye, Image, Package, Plus, ShieldCheck, ShoppingBag, Sparkles, Star, Store, Ticket, TrendingUp, Wallet, Zap } from "lucide-react";
import GoLiveButton from "@/app/(dashboard)/dashboard/vendor/components/go-live-button";
import type { VendorSplitOrder } from "@/app/(dashboard)/dashboard/vendor/components/tabs/orders-tab";
import type { VendorDashboardAnalytics } from "@/lib/vendor/vendor-dashboard-analytics";
import type { VendorWorkspaceSummary } from "@/lib/vendor/workspace-summary";
import type { VendorReadinessCheck } from "@/lib/vendor/readiness";
import AvailabilityToggle from "./AvailabilityToggle";
import s from "./workspace.module.css";

const money = (value: number) => value.toLocaleString("en-TT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-TT", { day: "numeric", month: "short", timeZone: "America/Port_of_Spain" });
function Delta({ value }: { value: number | null }) {
  return <small className={s.delta} data-direction={value == null || value > 0 ? "up" : value < 0 ? "down" : "flat"}>{value == null || value > 0 ? <TrendingUp size={13}/> : value < 0 ? <ArrowDownRight size={13}/> : null}{value == null ? "New activity" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`}<span> vs last month</span></small>;
}
function orderStatus(status: string) {
  const names: Record<string, string> = { AWAITING_VENDOR_ACTION: "Needs action", READY_FOR_CUSTOMER_PICKUP: "Ready for pickup", READY_FOR_LINKWE: "Ready for LinkWe", AWAITING_COURIER_PICKUP: "Awaiting courier", BUNDLED_FOR_DISPATCH: "Ready for dispatch" };
  return names[status] ?? status.toLowerCase().replaceAll("_", " ").replace(/^./, c => c.toUpperCase());
}

type Props = {
  analytics: VendorDashboardAnalytics;
  workspaceSummary: VendorWorkspaceSummary;
  initialAvailableNow: boolean;
  recentOrders: VendorSplitOrder[];
  reviewSummary: { total: number; average: number; breakdown: Record<number, number> };
  completenessItems: { label: string; done: boolean; detail?: string }[];
  idVerificationStatus: IdVerificationStatus;
  verificationChecks: VendorReadinessCheck[];
  openForBusinessChecklist?: ReactNode;
  verificationChecklist?: ReactNode;
  store: { id: string; status: StoreStatus; name: string; slug: string; categoryId: string; region: string; logoUrl: string | null; coverPhotoUrl: string | null };
};
export default function VendorDashboardOverview({ analytics, workspaceSummary: summary, initialAvailableNow, recentOrders, reviewSummary, completenessItems, idVerificationStatus, verificationChecks, openForBusinessChecklist, verificationChecklist, store }: Props) {
  const setup = useRef<HTMLDetailsElement>(null);
  const profilePct = completenessItems.length ? Math.round(completenessItems.filter(item => item.done).length / completenessItems.length * 100) : 0;
  const live = store.status === "ACTIVE" && idVerificationStatus === "APPROVED";
  const pendingCount = summary.activeOrdersCount + summary.pendingRequestsCount + summary.pendingBookings;
  const total30Days = analytics.salesLast30Days.reduce((total, day) => total + day.amountTtd, 0);
  const maxAmount = Math.max(...analytics.salesLast30Days.map(day => day.amountTtd), 1);
  const openSetup = () => { if (setup.current) { setup.current.open = true; setup.current.scrollIntoView({ behavior: "smooth", block: "start" }); setup.current.querySelector("summary")?.focus(); } };
  const quickActions = [
    { label: "Add product", detail: "Something worth discovering", href: "/creation/new?type=product", Icon: Package, tone: "peach" },
    { label: "Add service", detail: "Put your skills to work", href: "/creation/new?type=service", Icon: Sparkles, tone: "mint" },
    { label: "Create event", detail: "Bring your people together", href: "/creation/new?type=event", Icon: Ticket, tone: "lilac" },
    { label: "Photo Studio", detail: "Make your products shine", href: "/photo-studio", Icon: Image, tone: "yellow" },
  ];
  return <div className={s.overview}>
    <section className={s.hero} aria-labelledby="vendor-overview-title">
      <div className={s.heroCopy}><p className={s.eyebrow}><span/> YOUR SPACE TO GROW</p><h1 id="vendor-overview-title">Your business.<br/><em>All together.</em></h1><p>Everything you need to keep your business moving.</p><div className={s.heroButtons}><Link className={s.primaryButton} href="/dashboard/vendor/store/edit"><Store size={18}/>Manage storefront</Link><Link className={s.heroLink} href={`/store/${store.slug}`}>View my store<ArrowUpRight size={18}/></Link></div></div>
      <div className={s.heroStore}>
        <div className={s.heroCover}>{store.coverPhotoUrl ? <NextImage src={store.coverPhotoUrl} alt="" width={620} height={320} unoptimized/> : <Store size={56}/>}<span className={s.storeStatus} data-live={live}><i/>{live ? "LIVE ON LINKWE" : store.status === "PENDING_APPROVAL" ? "AWAITING APPROVAL" : "NOT LIVE YET"}</span></div>
        <div className={s.heroStoreBody}><span className={s.heroLogo}>{store.logoUrl ? <NextImage src={store.logoUrl} alt="" width={42} height={42} unoptimized/> : <Store size={25}/>}</span><div><strong>{store.name}</strong><small>{store.region.replaceAll("_", " ")}</small></div><Link href="/dashboard/vendor/store/edit" aria-label="Edit your storefront"><ArrowUpRight size={20}/></Link></div>
      </div>
    </section>

    <section data-tour="vendor-shortcuts" className={s.quickActions} aria-label="Quick actions">{quickActions.map(action => <Link key={action.href} href={`/dashboard/vendor${action.href}`} className={s.quickAction} data-tone={action.tone}><span className={s.quickIcon}><action.Icon size={23}/></span><span><strong>{action.label}</strong><small>{action.detail}</small></span><ArrowUpRight size={17}/></Link>)}</section>

    {pendingCount > 0 && <a href="#attention-title" className={s.attentionAlert}><Zap size={20}/><strong>{pendingCount} item{pendingCount === 1 ? "" : "s"} need your attention</strong><span>Review now<ArrowRight size={16}/></span></a>}
    {(!live || profilePct < 100) && <div className={s.setupNudge}><span className={s.setupNudgeIcon}><Store size={21}/></span><div><strong>{!live ? "Let’s get your store ready for customers." : "Give customers the complete picture."}</strong><p>{idVerificationStatus === "PENDING" ? "Your identity review is in progress. You can keep building your store." : `Your store profile is ${profilePct}% complete. Pick up where you left off.`}</p></div><button onClick={openSetup}>Continue setup<ArrowRight size={16}/></button></div>}

    <section aria-labelledby="performance-title"><div className={s.sectionHeading}><div><p className={s.eyebrow}>THE BIG PICTURE</p><h2 id="performance-title">How you’re doing</h2></div><span className={s.period}>This month · TTD</span></div><div data-tour="vendor-metrics" className={s.metrics}>
      <Link href="/dashboard/vendor/finance" className={`${s.metric} ${s.earnings}`}><div><span>Settled earnings</span><Wallet size={20}/></div><strong><small>TTD</small> {money(analytics.salesThisMonthTtd)}</strong><p>After commission · completed orders</p><Delta value={analytics.salesChangePct}/></Link>
      <Link href="/dashboard/vendor/orders" className={s.metric}><div><span>Orders</span><ShoppingBag size={20}/></div><strong>{analytics.ordersThisMonth.toLocaleString()}</strong><p>Includes subscription renewals</p><Delta value={analytics.ordersChangePct}/></Link>
      <Link href="/dashboard/vendor/reports" className={s.metric}><div><span>Store views</span><Eye size={20}/></div><strong>{analytics.profileViewsThisMonth.toLocaleString()}</strong><p>Visits to your storefront</p><Delta value={analytics.profileViewsChangePct}/></Link>
      <Link href="/dashboard/vendor/reports" className={s.metric}><div><span>Conversion</span><TrendingUp size={20}/></div><strong>{analytics.conversionRatePct.toFixed(1)}<small>%</small></strong><p>Orders ÷ store views</p><Delta value={analytics.conversionChangePct}/></Link>
    </div></section>

    <div className={s.contentGrid}>
      <div className={s.mainPanels}>
        <section className={s.panel} aria-labelledby="attention-title"><div className={s.panelHeading}><div><p className={s.eyebrow}>FIRST THINGS FIRST</p><h2 id="attention-title">Needs your attention</h2></div><span className={s.countPill} data-clear={pendingCount === 0}>{pendingCount === 0 ? <CheckCheck size={18}/> : pendingCount}{pendingCount === 0 ? " All clear" : " to review"}</span></div><div className={s.attentionList}>
          {[{label: "Orders to accept", note: "Review and start preparing", count: summary.activeOrdersCount, href: "orders", Icon: ShoppingBag}, {label: "Bookings to confirm", note: "Keep your schedule up to date", count: summary.pendingBookings, href: "bookings", Icon: CalendarDays}, {label: "On-demand requests", note: "Customers waiting to hear from you", count: summary.pendingRequestsCount, href: "requests", Icon: Zap}].map(item => <Link key={item.href} href={`/dashboard/vendor/${item.href}`} className={s.attentionRow}><span className={s.attentionIcon}><item.Icon size={20}/></span><span><strong>{item.label}</strong><small>{item.count ? item.note : "You’re up to date"}</small></span><b data-pending={item.count > 0}>{item.count}</b><ArrowUpRight size={17}/></Link>)}
        </div></section>
        <section data-tour="vendor-sales-chart" className={s.panel} aria-labelledby="earnings-title"><div className={s.panelHeading}><div><p className={s.eyebrow}>STEADY STEPS FORWARD</p><h2 id="earnings-title">Earnings over time</h2></div><Link href="/dashboard/vendor/reports">Reports<ArrowUpRight size={16}/></Link></div><div className={s.chartSummary}><strong>TTD {money(total30Days)}</strong><span>Settled · last 30 days</span></div>
          {total30Days === 0 ? <div className={s.chartEmpty}><span><TrendingUp size={30}/></span><strong>Your progress will show up here.</strong><p>As orders complete and earnings settle, watch your business grow day by day.</p></div> : <div className={s.chart} role="img" aria-label={`Settled earnings over the last 30 days: TTD ${money(total30Days)}. Daily values are available in the table below.`}>{analytics.salesLast30Days.map(day => <div key={day.date} title={`${dateLabel(day.date)}: TTD ${money(day.amountTtd)}`}><span style={{ height: `${Math.max(day.amountTtd > 0 ? 3 : 0, day.amountTtd / maxAmount * 100)}%` }}/></div>)}</div>}
          <div className={s.chartLabels}><span>{analytics.salesLast30Days[0] && dateLabel(analytics.salesLast30Days[0].date)}</span><span>Daily totals · UTC</span><span>{analytics.salesLast30Days.at(-1) && dateLabel(analytics.salesLast30Days.at(-1)!.date)}</span></div>
          <details className={s.chartDetails}><summary>View daily amounts<ChevronDown size={14}/></summary><div><table><caption className="sr-only">Settled earnings for each of the last 30 days</caption><thead><tr><th>Date</th><th>TTD</th></tr></thead><tbody>{analytics.salesLast30Days.map(day => <tr key={day.date}><td>{dateLabel(day.date)}</td><td>{money(day.amountTtd)}</td></tr>)}</tbody></table></div></details>
        </section>
        <section data-tour="vendor-recent-orders" className={s.panel} aria-labelledby="recent-orders-title"><div className={s.panelHeading}><div><p className={s.eyebrow}>LATEST ACTIVITY</p><h2 id="recent-orders-title">Recent orders</h2></div><Link href="/dashboard/vendor/orders">View all<ArrowUpRight size={16}/></Link></div>{recentOrders.length ? <div className={s.orderList}>{recentOrders.map(order => { const first = order.items[0]; return <Link key={order.id} href={`/dashboard/vendor/orders/${order.id}`} className={s.orderRow}><span className={s.orderImage}>{first?.listing?.imageUrl ? <NextImage src={first.listing.imageUrl} alt="" width={46} height={49} unoptimized/> : <ShoppingBag size={23}/>}</span><span className={s.orderTitle}><strong>{first?.titleSnapshot ?? "Order"}{order.items.length > 1 ? ` +${order.items.length - 1} more` : ""}</strong><small>{order.mainOrder.buyer.fullName ?? "Customer"} · {new Date(order.createdAt).toLocaleDateString("en-TT", {day: "numeric", month: "short", timeZone: "America/Port_of_Spain"})}</small></span><span className={s.orderAmount}><strong>TTD {money(order.subtotalMinor / 100)}</strong><small data-status={order.status}>{orderStatus(order.status)}</small></span></Link>; })}</div> : <div className={s.emptyOrders}><span><ShoppingBag size={27}/></span><div><h3>Your first order starts with a great store.</h3><p>Keep your listings fresh and share your store with your community.</p><Link href="/dashboard/vendor/qr-studio">Share your store<ArrowRight size={16}/></Link></div></div>}</section>
      </div>
      <div className={s.sidePanels}>
        <section className={`${s.panel} ${s.catalogue}`}><div className={s.panelHeading}><div><p className={s.eyebrow}>MADE FOR YOUR CUSTOMERS</p><h2>Your collection</h2></div><Package size={23}/></div><div className={s.catalogueLinks}>{[{label: "Products", count: summary.products, href: "products", Icon: Package}, {label: "Services", count: summary.services, href: "services", Icon: Sparkles}, {label: "Events", count: summary.events, href: "events", Icon: Ticket}].map(item => <Link href={`/dashboard/vendor/${item.href}`} key={item.href}><item.Icon size={18}/><span>{item.label}</span><strong>{item.count}</strong><ArrowUpRight size={15}/></Link>)}</div><p className={s.catalogueNote}>{summary.drafts > 0 ? `${summary.drafts} product or service draft${summary.drafts === 1 ? "" : "s"} to finish when you’re ready.` : "Your products, services and events, in one place."}</p></section>
        <AvailabilityToggle appearance="banner" initialAvailable={initialAvailableNow}/>
        <section data-tour="vendor-profile-strength" className={s.panel}><div className={s.panelHeading}><div><p className={s.eyebrow}>MAKE A GREAT FIRST IMPRESSION</p><h2>Store profile</h2></div><span className={s.profilePercent}>{profilePct}%</span></div><div className={s.progress} role="progressbar" aria-label="Store profile complete" aria-valuenow={profilePct} aria-valuemin={0} aria-valuemax={100}><span style={{width: `${profilePct}%`}}/></div><ul className={s.profileChecklist}>{completenessItems.filter(item => !item.done).slice(0, 3).map(item => <li key={item.label}><span/><span>Add {item.label.toLowerCase()}</span><Plus size={14}/></li>)}{profilePct === 100 && <li><Check size={17}/>Your profile is complete</li>}</ul><Link href="/dashboard/vendor/store/edit" className={s.outlineButton}>Edit storefront<ArrowUpRight size={16}/></Link></section>
        <section className={`${s.panel} ${s.reviews}`}><div className={s.panelHeading}><h2>Customer love</h2><Star size={22}/></div><div className={s.reviewScore}><strong>{reviewSummary.total ? reviewSummary.average.toFixed(1) : "—"}</strong><span><span className={s.stars} aria-label={reviewSummary.total ? `${reviewSummary.average.toFixed(1)} out of 5 stars` : "No ratings yet"}>{[1, 2, 3, 4, 5].map(star => <Star key={star} size={17} fill={star <= Math.round(reviewSummary.average) ? "currentColor" : "none"}/>)}</span><small>{reviewSummary.total ? `${reviewSummary.total} customer review${reviewSummary.total === 1 ? "" : "s"}` : "Your first review is still to come"}</small></span></div><Link href="/dashboard/vendor/reviews">View feedback<ArrowUpRight size={16}/></Link></section>
        <button className={s.helpCard} onClick={() => window.dispatchEvent(new CustomEvent("vendor-tour:open-library"))}><CircleHelp size={24}/><span><strong>A little guidance goes a long way.</strong><small>Explore step-by-step tutorials</small></span><ArrowUpRight size={19}/></button>
      </div>
    </div>

    <details ref={setup} id="vendor-setup" className={s.setupPanel} data-tour="vendor-readiness"><summary><span className={s.setupNudgeIcon}><ShieldCheck size={23}/></span><span><strong>Store setup & verification</strong><small>{live ? "Your store is live. Review your details here." : "Your checklist, identity review and payout details."}</small></span><ChevronDown size={21}/></summary><div className={s.setupContents}>{openForBusinessChecklist}{verificationChecklist && <div id="vendor-verification">{verificationChecklist}</div>}{idVerificationStatus === "APPROVED" && <div className={s.verifiedCard}><ShieldCheck size={25}/><div><h3>Identity verified</h3><p>{live ? "Your store is active and visible to customers." : "Finish setting up your store, then publish when you’re ready."}</p><ul>{verificationChecks.map(check => <li key={check.id}>{check.ok ? <Check size={16}/> : <Plus size={16}/>} {check.label}</li>)}</ul>{store.status !== "ACTIVE" && <GoLiveButton storeId={store.id}/>}<Link href="/dashboard/vendor/finance?tab=bank-details">Manage payout details<ArrowUpRight size={15}/></Link></div></div>}<div className={s.fullProfile}><h3>Your complete store profile · {profilePct}%</h3><ul>{completenessItems.map(item => <li key={item.label}>{item.done ? <Check size={17}/> : <Plus size={17}/>}<span>{item.label}{item.detail && <small>{item.detail}</small>}</span></li>)}</ul><Link className={s.outlineButton} href="/dashboard/vendor/store/edit">Update store profile<ArrowUpRight size={16}/></Link></div></div></details>
    <footer className={s.workspaceFooter}><span>We people. We business. <strong>We local.</strong></span><Link href="/dashboard/vendor/settings">Account settings<ArrowUpRight size={14}/></Link></footer>
  </div>;
}
