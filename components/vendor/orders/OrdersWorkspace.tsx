"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowLeft, ArrowUpRight, CalendarDays, CheckCheck, ChevronLeft, ChevronRight, Clock3, Package, RefreshCw, Search, SlidersHorizontal, Sparkles, X, Zap } from "lucide-react";
import { bucketLabels, filterOrders, kindLabels, orderBucket, orderDate, orderMoney, orderNextStep, ordersCSV, orderStatusLabel, type OrderRow, type OrderFilters } from "@/lib/vendor/order-workspace";
import s from "./orders.module.css";

export default function OrdersWorkspace({ orders, view = "products", now }: { orders: OrderRow[]; view?: "products" | "services"; now: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<OrderFilters>({ search: "", bucket: "all", kind: "all", days: 0, sort: "attention" });
  const [page, setPage] = useState(1);
  const rows = orders.filter(row => view === "products" ? row.kind === "product" : row.kind !== "product");
  const counts = { action: 0, progress: 0, completed: 0, cancelled: 0 };
  rows.forEach(row => counts[orderBucket(row)]++);
  const filtered = filterOrders(rows, filters, now);
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 12, currentPage * 12);
  const change = (value: Partial<OrderFilters>) => { setFilters(current => ({ ...current, ...value })); setPage(1); };
  const reset = () => { setFilters({ search: "", bucket: "all", kind: "all", days: 0, sort: "attention" }); setPage(1); };
  const filteredOn = !!filters.search || filters.bucket !== "all" || filters.kind !== "all" || !!filters.days;
  function exportOrders() {
    const url = URL.createObjectURL(new Blob([ordersCSV(filtered)], {type: "text/csv;charset=utf-8;"}));
    const link = document.createElement("a"); link.href = url; link.download = `linkwe-${view}-orders.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className={s.page}>
    <Link className={s.back} href="/dashboard/vendor"><ArrowLeft size={15}/> Back to your workspace</Link>
    <header className={s.hero}>
      <div><p className={s.eyebrow}>YOUR ORDERS, IN GOOD HANDS</p><h1>Every order.<br/><span>A clear next step.</span></h1><p className={s.heroText}>From that first “yes” to a happy customer. Keep it all moving here.</p></div>
      <div className={s.heroAside}><span className={s.heroIcon}><Package size={37} strokeWidth={1.4}/><CheckCheck size={18}/></span><div><strong>{rows.length.toLocaleString()} {view === "products" ? "product" : "service"} orders</strong><p>{counts.action ? `${counts.action} waiting for your attention` : "You’re up to date. Keep doing your thing."}</p><small>For your store · All time</small></div></div>
    </header>
    <div className={s.metrics} aria-label="Order overview">
      {[{key: "action", Icon: Zap, note: "Your next move"}, {key: "progress", Icon: Clock3, note: "Moving along"}, {key: "completed", Icon: CheckCheck, note: "Delivered or complete"}, {key: "cancelled", Icon: Package, note: "Cancelled, declined or closed"}].map(({key, Icon, note}) => <button key={key} className={s.metric} data-tour={key === "action" ? "orders-action" : undefined} data-tone={key} aria-pressed={filters.bucket === key} onClick={() => change({bucket: filters.bucket === key ? "all" : key})}><div><span>{bucketLabels[key as keyof typeof counts]}</span><Icon size={19}/></div><strong>{counts[key as keyof typeof counts]}</strong><small>{note}</small></button>)}
    </div>
    <section className={s.inbox} aria-label="Orders">
      <div className={s.inboxTop}>
        <nav className={s.tabs} aria-label="Order type">{[{key:"products", label:"Products", Icon:Package}, {key:"services", label:"Services", Icon:Sparkles}].map(({key,label,Icon}) => <Link key={key} aria-current={view === key ? "page" : undefined} href={key === "products" ? "/dashboard/vendor/orders" : "/dashboard/vendor/orders?view=services"}><Icon size={18}/>{label}<span>{orders.filter(row=>key === "products" ? row.kind === "product" : row.kind !== "product").length}</span></Link>)}</nav>
        <div className={s.tools}><button onClick={() => startTransition(() => router.refresh())} disabled={pending} aria-label="Refresh orders"><RefreshCw size={16} className={pending ? s.spinning : ""}/><span>{pending ? "Refreshing" : "Refresh"}</span></button><button onClick={exportOrders} disabled={!filtered.length}><ArrowDownToLine size={16}/><span>Export CSV</span></button></div>
      </div>
      {view === "services" && <div className={s.serviceLinks} data-tour="service-order-links"><span>YOUR SERVICE TOOLS</span>{[{name:"Open Service Desk",path:"service-desk"}].map(link=><Link key={link.path} href={`/dashboard/vendor/${link.path}`}>{link.name}<ArrowUpRight size={14}/></Link>)}</div>}
      <div className={s.toolbar}><label className={s.search}><Search size={18}/><input value={filters.search} onChange={e=>change({search:e.target.value})} placeholder="Search order, customer or item…" aria-label="Search orders"/>{filters.search && <button aria-label="Clear search" onClick={()=>change({search:""})}><X size={16}/></button>}</label><label className={s.select}><CalendarDays size={16}/><select aria-label="Order date range" value={filters.days} onChange={e=>change({days:Number(e.target.value)})}><option value={0}>All dates</option><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label><label className={s.select}><SlidersHorizontal size={16}/><select aria-label="Sort orders" value={filters.sort} onChange={e=>change({sort:e.target.value})}><option value="attention">Attention first</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="value">Highest value</option></select></label></div>
      <div className={s.filterBar}><div className={s.chips} aria-label="Filter order status"><button aria-pressed={filters.bucket === "all"} onClick={()=>change({bucket:"all"})}>All orders <span>{rows.length}</span></button>{Object.entries(bucketLabels).map(([key,label])=><button key={key} aria-pressed={filters.bucket === key} onClick={()=>change({bucket:key})}>{label}<span>{counts[key as keyof typeof counts]}</span></button>)}</div>{view === "services" && <select className={s.kindSelect} aria-label="Service order type" value={filters.kind} onChange={e=>change({kind:e.target.value})}><option value="all">Every service type</option>{Object.entries(kindLabels).filter(([key])=>key!=="product").map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>}</div>
      <div className={s.resultLine} role="status"><span>{filtered.length} {filtered.length === 1 ? "order" : "orders"}{filteredOn ? " found" : " in your workspace"}</span>{filteredOn && <button onClick={reset}>Clear filters <X size={13}/></button>}</div>
      {visible.length ? <div className={s.orderList} data-tour="orders-list">{visible.map(order => {const bucket=orderBucket(order); return <article key={`${order.kind}-${order.id}`} className={s.orderCard} data-action={bucket==="action"}>
        <div className={s.orderIdentity}><div className={s.thumbnail}>{order.image ? <Image src={order.image} alt="" fill sizes="66px" unoptimized/> : order.kind === "product" ? <Package size={26}/> : <Sparkles size={26}/>}</div><div className={s.orderText}><div className={s.orderReference}><Link href={order.href}>{order.reference}</Link><span>{orderDate(order.createdAt)}</span></div><h2><Link href={order.href}>{order.title}</Link></h2><p>{order.customer}<span>·</span>{order.kind === "product" ? `${order.quantity ?? 0} ${(order.quantity ?? 0) === 1 ? "item" : "items"}` : kindLabels[order.kind]}</p><small>{order.detail}{order.region ? ` · ${order.region}` : ""}</small></div></div>
        <div className={s.orderValue}><strong>{orderMoney(order.amountMinor,order.currency)}</strong><span className={s.badge} data-tone={bucket}>{orderStatusLabel(order.status)}</span></div>
        <div className={s.orderNext}><p><span className={s.nextDot}/>{orderNextStep(order)}</p><Link href={order.href} className={bucket==="action" ? s.primary : s.secondary}>{bucket==="action" ? "Review order" : "Order details"}<ArrowUpRight size={16}/></Link></div>
      </article>;})}</div> : <div className={s.empty}><span><Search size={30}/></span><h2>{filteredOn ? "No orders match just yet." : "Your next order starts here."}</h2><p>{filteredOn ? "Try a different name, reference or date range." : "When a customer places an order, you’ll see the details and your next step right here."}</p>{filteredOn ? <button className={s.primary} onClick={reset}>Show all orders</button> : <Link className={s.primary} href={view==="products" ? "/dashboard/vendor/products" : "/dashboard/vendor/services"}>Manage your {view}<ArrowUpRight size={16}/></Link>}</div>}
      <footer className={s.pagination}><span>{filtered.length ? `${(currentPage-1)*12+1}–${Math.min(currentPage*12,filtered.length)} of ${filtered.length}` : "0 orders"}</span><div><button aria-label="Previous page" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}><ChevronLeft size={18}/></button><span>Page {currentPage} of {pages}</span><button aria-label="Next page" disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)}><ChevronRight size={18}/></button></div></footer>
    </section>
    <p className={s.footnote}>Product amounts show your store’s item subtotal. Service amounts show the booking, quote or recurring price—not your available payout balance.</p>
  </div>;
}
