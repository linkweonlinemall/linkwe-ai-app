import ReportExport from "@/components/vendor/reports/ReportExport";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IconArrowUpRight, IconChartBar, IconCoin, IconReceipt, IconUsers } from "@tabler/icons-react";

import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const money = (minor: number) => `TTD ${(minor / 100).toLocaleString("en-TT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function VendorReportsPage({ searchParams }: { searchParams: Promise<{months?:string}> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");
  const store = await prisma.store.findFirst({ where: { ownerId: session.userId }, select: { id: true, name: true } });
  if (!store) redirect("/onboarding/business/step-3");

  const params=await searchParams;
  const monthCount=[1,3,6,12].includes(Number(params.months))?Number(params.months):6;
  const nowLocal=new Date(Date.now()-4*60*60*1000);
  const year=nowLocal.getUTCFullYear(),month=nowLocal.getUTCMonth();
  const since=new Date(Date.UTC(year,month-monthCount+1,1,4));
  const [released,bookingCounts,requestCounts,subscribers]=await Promise.all([
   prisma.vendorLedgerEntry.aggregate({where:{storeId:store.id,releasedAt:{gte:since},entryType:"CREDIT_ORDER_SETTLEMENT"},_sum:{grossMinor:true,commissionMinor:true,netMinor:true}}),
   prisma.productBooking.groupBy({by:["status"],where:{product:{storeId:store.id,isService:true},createdAt:{gte:since}},_count:true}),
   prisma.onDemandRequest.groupBy({by:["status"],where:{storeId:store.id,createdAt:{gte:since}},_count:true}),
   prisma.customerServiceSubscription.count({where:{storeId:store.id,status:"ACTIVE"}}),
  ]);
  const orders = await prisma.splitOrder.findMany({
    where: { storeId: store.id, createdAt: { gte: since }, status: { not: "CANCELLED" }, mainOrder: { status: { notIn: ["DRAFT", "PENDING_PAYMENT", "CANCELLED", "REFUNDED"] } } },
    select: { id: true, referenceNumber: true, subtotalMinor: true, status: true, createdAt: true, mainOrder: { select: { buyerId: true } }, items: { select: { titleSnapshot: true, quantity: true, lineTotalMinor: true } } },
    orderBy: { createdAt: "asc" },
  });

  const now = nowLocal;
  const months = Array.from({ length: monthCount }, (_, i) => {
    const date = new Date(Date.UTC(year, month - monthCount + 1 + i, 1, 4));
    return { key: `${date.getUTCFullYear()}-${date.getUTCMonth()}`, label: date.toLocaleDateString("en-TT", { month: "short", timeZone: "America/Port_of_Spain" }), revenue: 0, orders: 0 };
  });
  for (const order of orders) {
    const bucket = months.find((month) => month.key === `${new Date(order.createdAt.getTime()-4*3600000).getUTCFullYear()}-${new Date(order.createdAt.getTime()-4*3600000).getUTCMonth()}`);
    if (bucket) { bucket.revenue += order.subtotalMinor; bucket.orders += 1; }
  }
  const gross = orders.reduce((sum, order) => sum + order.subtotalMinor, 0);
  const completed = orders.filter((order) => order.status === "DELIVERED" || order.status === "COMPLETED").length;
  const customers = new Set(orders.map((order) => order.mainOrder.buyerId)).size;
  const maxRevenue = Math.max(...months.map((month) => month.revenue), 1);
  const products = new Map<string, { quantity: number; revenue: number }>();
  for (const order of orders) for (const item of order.items) {
    const current = products.get(item.titleSnapshot) ?? { quantity: 0, revenue: 0 };
    current.quantity += item.quantity; current.revenue += item.lineTotalMinor; products.set(item.titleSnapshot, current);
  }
  const topProducts = [...products.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);
  const active = orders.filter((order) => !["DELIVERED", "COMPLETED"].includes(order.status)).length;

  return <div className="min-w-0 overflow-x-hidden bg-[#f1f6fa] px-4 py-5 sm:px-6 sm:py-8">
    <div className="mx-auto max-w-7xl">
      <Link href="/dashboard/vendor" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">← Back to dashboard</Link>
      <div className="mt-4 overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_82%_0%,rgba(232,130,12,.35),transparent_30%),linear-gradient(135deg,#174766,#146581)] p-5 text-white shadow-2xl shadow-orange-950/10 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-200">Business intelligence</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">Reports</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Understand sales, customers and fulfilment for {store.name}. Figures below cover the selected {monthCount} calendar month{monthCount>1?"s":""}, through today (Trinidad &amp; Tobago time).</p></div><ReportExport period={`${since.toISOString().slice(0,10)}-to-${new Date().toISOString().slice(0,10)}`} rows={[["Order", "Date (Trinidad & Tobago)","Status","Gross product sales (TTD)"],...orders.map(o=>[o.referenceNumber??o.id,o.createdAt.toLocaleDateString("en-TT",{timeZone:"America/Port_of_Spain"}),o.status,(o.subtotalMinor/100).toFixed(2)])]}/><Link href="/dashboard/vendor/finance" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-bold backdrop-blur hover:bg-white/15">Open Finance <IconArrowUpRight className="size-4"/></Link></div>
      </div>

      <nav aria-label="Report period" className="mt-5 flex flex-wrap gap-2">{[1,3,6,12].map(n=><Link key={n} href={`/dashboard/vendor/reports?months=${n}`} aria-current={n===monthCount?"page":undefined} className={`rounded-full px-5 py-2.5 text-xs font-bold ${n===monthCount?"bg-[#174766] text-white":"bg-white text-slate-600"}`}>{n===1?"This month":`${n} months`}</Link>)}</nav>
      <div data-tour="reports-kpis" className="mt-5 grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 lg:grid-cols-4">
        {[{label:"Product sales",value:money(gross),detail:"Paid orders · before commission",Icon:IconCoin,color:"bg-orange-50 text-[#D4450A]"},{label:"Orders",value:String(orders.length),detail:`${active} currently active`,Icon:IconReceipt,color:"bg-blue-50 text-blue-600"},{label:"Customers",value:String(customers),detail:"Unique buyers",Icon:IconUsers,color:"bg-sky-50 text-sky-600"},{label:"Completion",value:`${orders.length ? Math.round(completed/orders.length*100) : 0}%`,detail:`${completed} completed`,Icon:IconChartBar,color:"bg-violet-50 text-violet-600"}].map(({label,value,detail,Icon,color}) => <div key={label} className="min-w-0 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:p-5"><div className={`flex size-10 items-center justify-center rounded-xl ${color}`}><Icon className="size-5"/></div><p className="mt-4 text-[10px] font-black uppercase tracking-wider text-zinc-400">{label}</p><p className="mt-1 truncate text-xl font-black text-zinc-950 sm:text-2xl">{value}</p><p className="mt-1 text-[11px] text-zinc-500">{detail}</p></div>)}
      </div>

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.75fr)]">
        <section data-tour="reports-trend" className="min-w-0 overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-black text-zinc-950">Sales trend</h2><p className="mt-1 text-xs text-zinc-500">Gross product sales by month</p></div><span className="shrink-0 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-bold text-[#D4450A]">{monthCount} months</span></div><div style={{gridTemplateColumns:`repeat(${monthCount},minmax(0,1fr))`}} className="mt-5 grid h-48 min-w-0 gap-1.5 sm:mt-7 sm:h-60 sm:gap-4">{months.map(month => <div key={month.key} className="flex h-full min-w-0 flex-col items-center gap-1.5 sm:gap-2"><span className="max-w-full shrink-0 truncate text-[8px] font-bold text-zinc-400 sm:text-[9px]">{month.orders}<span className="hidden sm:inline"> orders</span></span><div className="flex min-h-0 w-full max-w-16 flex-1 items-end"><div className="group relative w-full rounded-t-md bg-gradient-to-t from-[#174766] to-[#5bb9df] transition hover:brightness-110 sm:rounded-t-xl" style={{height:`${Math.max(5,Math.round(month.revenue/maxRevenue*100))}%`}} title={`${month.label}: ${money(month.revenue)}, ${month.orders} orders`}><span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-zinc-950 px-2 py-1 text-[9px] text-white group-hover:block">{money(month.revenue)}</span></div></div><span className="shrink-0 text-[9px] font-bold text-zinc-500 sm:text-[10px]">{month.label}</span></div>)}</div></section>
        <section data-tour="reports-products" className="min-w-0 rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:p-6"><h2 className="font-black text-zinc-950">Top products</h2><p className="mt-1 text-xs text-zinc-500">Ranked by gross sales</p><div className="mt-5 space-y-3">{topProducts.length ? topProducts.map(([name,data],index)=><div key={name} className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-2xl bg-zinc-50 p-3 sm:grid-cols-[2rem_minmax(0,1fr)_auto]"><span className="row-span-2 flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-black text-[#D4450A] shadow-sm">{index+1}</span><span className="min-w-0"><strong className="block truncate text-xs text-zinc-900">{name}</strong><span className="text-[10px] text-zinc-500">{data.quantity} sold</span></span><strong className="col-start-2 break-words text-xs text-zinc-900 sm:col-start-3 sm:row-start-1 sm:self-center">{money(data.revenue)}</strong></div>):<p className="rounded-2xl border border-dashed border-zinc-200 px-4 py-10 text-center text-xs text-zinc-500">Sales will appear here after your first paid order.</p>}</div></section>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2"><section className="rounded-3xl border border-sky-100 bg-white p-6"><h2 className="font-bold text-[#174766]">Service activity</h2><p className="mt-2 text-xs leading-6 text-slate-500">Requests created during this period. Activity counts do not represent collected revenue.</p><div className="my-5 grid grid-cols-3 gap-3">{[["Appointments",bookingCounts.reduce((n,r)=>n+r._count,0)],["Requests & quotes",requestCounts.reduce((n,r)=>n+r._count,0)],["Active subscribers now",subscribers]].map(([label,value])=><div key={label}><strong className="block text-2xl font-bold">{value}</strong><span className="text-xs text-slate-500">{label}</span></div>)}</div><Link className="text-sm font-bold text-sky-800" href="/dashboard/vendor/service-desk">Review services in your Service Desk →</Link></section><section className="rounded-3xl border border-sky-100 bg-white p-6"><h2 className="font-bold text-[#174766]">Online earnings released</h2><p className="mt-2 text-xs leading-6 text-slate-500">All selling channels, by release date. Direct customer payments are excluded.</p><dl className="mt-4 space-y-3">{[["Gross released",released._sum.grossMinor??0],["Recorded commission",released._sum.commissionMinor??0],["Net released",released._sum.netMinor??0]].map(([label,value])=><div key={label} className="flex justify-between text-sm"><dt>{label}</dt><dd className="font-bold">{money(Number(value))}</dd></div>)}</dl><p className="mt-4 text-xs text-slate-500">Net released is before separate adjustments and payouts. Finance shows the available balance.</p></section></div>
      <p className="mt-5 text-[10px] leading-5 text-zinc-400">Reports reflect LinkWe order records. Gross sales are not the same as available payout balance; refunds, commission, completion and payouts are detailed in Finance.</p>
    </div>
  </div>;
}
