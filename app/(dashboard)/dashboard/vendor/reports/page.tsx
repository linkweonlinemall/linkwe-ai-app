import Link from "next/link";
import { redirect } from "next/navigation";
import { IconArrowUpRight, IconChartBar, IconCoin, IconReceipt, IconUsers } from "@tabler/icons-react";

import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const money = (minor: number) => `TTD ${(minor / 100).toLocaleString("en-TT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function VendorReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");
  const store = await prisma.store.findFirst({ where: { ownerId: session.userId }, select: { id: true, name: true } });
  if (!store) redirect("/onboarding/business/step-3");

  const since = new Date();
  since.setMonth(since.getMonth() - 5, 1);
  since.setHours(0, 0, 0, 0);
  const orders = await prisma.splitOrder.findMany({
    where: { storeId: store.id, createdAt: { gte: since }, status: { not: "CANCELLED" } },
    select: { id: true, subtotalMinor: true, status: true, createdAt: true, mainOrder: { select: { buyerId: true } }, items: { select: { titleSnapshot: true, quantity: true, lineTotalMinor: true } } },
    orderBy: { createdAt: "asc" },
  });

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { key: `${date.getFullYear()}-${date.getMonth()}`, label: date.toLocaleDateString("en-TT", { month: "short" }), revenue: 0, orders: 0 };
  });
  for (const order of orders) {
    const bucket = months.find((month) => month.key === `${order.createdAt.getFullYear()}-${order.createdAt.getMonth()}`);
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

  return <div className="min-w-0 overflow-x-hidden bg-[#F7F5F2] px-4 py-5 sm:px-6 sm:py-8">
    <div className="mx-auto max-w-7xl">
      <Link href="/dashboard/vendor" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">← Back to dashboard</Link>
      <div className="mt-4 overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_82%_0%,rgba(232,130,12,.35),transparent_30%),linear-gradient(135deg,#181816,#2A241F_60%,#5A210B)] p-5 text-white shadow-2xl shadow-orange-950/10 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">Business intelligence</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">Reports</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Understand sales, customers and fulfilment for {store.name}. Figures below cover the latest six calendar months.</p></div><Link href="/dashboard/vendor/finance" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-bold backdrop-blur hover:bg-white/15">Open Finance <IconArrowUpRight className="size-4"/></Link></div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[{label:"Gross sales",value:money(gross),detail:"Before commission",Icon:IconCoin,color:"bg-orange-50 text-[#D4450A]"},{label:"Orders",value:String(orders.length),detail:`${active} currently active`,Icon:IconReceipt,color:"bg-blue-50 text-blue-600"},{label:"Customers",value:String(customers),detail:"Unique buyers",Icon:IconUsers,color:"bg-emerald-50 text-emerald-600"},{label:"Completion",value:`${orders.length ? Math.round(completed/orders.length*100) : 0}%`,detail:`${completed} completed`,Icon:IconChartBar,color:"bg-violet-50 text-violet-600"}].map(({label,value,detail,Icon,color}) => <div key={label} className="min-w-0 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:p-5"><div className={`flex size-10 items-center justify-center rounded-xl ${color}`}><Icon className="size-5"/></div><p className="mt-4 text-[10px] font-black uppercase tracking-wider text-zinc-400">{label}</p><p className="mt-1 truncate text-xl font-black text-zinc-950 sm:text-2xl">{value}</p><p className="mt-1 text-[11px] text-zinc-500">{detail}</p></div>)}
      </div>

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.75fr)]">
        <section className="min-w-0 rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="font-black text-zinc-950">Sales trend</h2><p className="mt-1 text-xs text-zinc-500">Gross product sales by month</p></div><span className="rounded-full bg-orange-50 px-3 py-1 text-[10px] font-bold text-[#D4450A]">6 months</span></div><div className="mt-7 flex h-60 items-end gap-2 sm:gap-4">{months.map(month => <div key={month.key} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="hidden text-[9px] font-bold text-zinc-400 sm:block">{month.orders} orders</span><div className="group relative w-full max-w-16 rounded-t-xl bg-gradient-to-t from-[#D4450A] to-[#F3A13B] transition hover:brightness-110" style={{height:`${Math.max(8,Math.round(month.revenue/maxRevenue*180))}px`}}><span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-zinc-950 px-2 py-1 text-[9px] text-white group-hover:block">{money(month.revenue)}</span></div><span className="text-[10px] font-bold text-zinc-500">{month.label}</span></div>)}</div></section>
        <section className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:p-6"><h2 className="font-black text-zinc-950">Top products</h2><p className="mt-1 text-xs text-zinc-500">Ranked by gross sales</p><div className="mt-5 space-y-3">{topProducts.length ? topProducts.map(([name,data],index)=><div key={name} className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-black text-[#D4450A] shadow-sm">{index+1}</span><span className="min-w-0 flex-1"><strong className="block truncate text-xs text-zinc-900">{name}</strong><span className="text-[10px] text-zinc-500">{data.quantity} sold</span></span><strong className="shrink-0 text-xs text-zinc-900">{money(data.revenue)}</strong></div>):<p className="rounded-2xl border border-dashed border-zinc-200 px-4 py-10 text-center text-xs text-zinc-500">Sales will appear here after your first paid order.</p>}</div></section>
      </div>
      <p className="mt-5 text-[10px] leading-5 text-zinc-400">Reports reflect LinkWe order records. Gross sales are not the same as available payout balance; refunds, commission, completion and payouts are detailed in Finance.</p>
    </div>
  </div>;
}
