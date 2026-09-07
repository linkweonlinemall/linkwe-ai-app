"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { getAdminOverviewMetrics } from "@/app/actions/admin-metrics";
import { DashboardMetricSkeleton } from "@/components/ui/content-skeletons";

type Metrics = Awaited<ReturnType<typeof getAdminOverviewMetrics>>;

const icons = {
  order: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0",
  verify: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Zm-3-10 2 2 4-4",
  store: "M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6",
  payout: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 1 1 0 7H6",
  courier: "M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  people: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87",
  product: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16ZM3.3 7 12 12l8.7-5M12 22V12",
};

function Icon({ path, className = "h-5 w-5" }: { path: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={path} />
    </svg>
  );
}

function formatTTD(minor: number) {
  return (minor / 100).toLocaleString("en-TT", {
    style: "currency",
    currency: "TTD",
    maximumFractionDigits: 0,
  });
}

function relativeTime(value: Date | string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function statusClass(status: string) {
  if (["COMPLETED", "DELIVERED"].includes(status)) return "bg-emerald-50 text-emerald-700 ring-emerald-600/10";
  if (["CANCELLED", "REFUNDED"].includes(status)) return "bg-red-50 text-red-700 ring-red-600/10";
  if (["SHIPPED", "COURIER_PICKED_UP"].includes(status)) return "bg-sky-50 text-sky-700 ring-sky-600/10";
  return "bg-amber-50 text-amber-800 ring-amber-600/10";
}

function KpiCard({ label, value, detail, icon, tone = "dark" }: {
  label: string;
  value: string | number;
  detail: string;
  icon: string;
  tone?: "dark" | "orange" | "blue" | "green";
}) {
  const tones = {
    dark: "bg-[#1C1C1A] text-white",
    orange: "bg-[#D4450A] text-white",
    blue: "bg-[#1A7FB5] text-white",
    green: "bg-emerald-700 text-white",
  };
  return (
    <article className={`relative min-h-36 overflow-hidden rounded-2xl p-5 shadow-sm ${tones[tone]}`}>
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
      <div className="relative flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">{label}</p>
          <span className="rounded-xl bg-white/10 p-2"><Icon path={icon} className="h-4 w-4" /></span>
        </div>
        <div>
          <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-white/65">{detail}</p>
        </div>
      </div>
    </article>
  );
}

function SectionHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4450A]">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-bold tracking-tight text-zinc-950">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export default function OverviewTab() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    let active = true;
    getAdminOverviewMetrics()
      .then((data) => {
        if (!active) return;
        setMetrics(data);
        setLastUpdated(new Date());
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 animate-pulse rounded-2xl bg-zinc-200" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <DashboardMetricSkeleton key={item} />)}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        The command centre could not load. Refresh this page to try again.
      </div>
    );
  }

  const attention = [
    {
      label: "Vendor verification",
      count: metrics.alerts.pendingVerification,
      detail: "Identity and store reviews waiting",
      href: "/dashboard/admin/verification",
      action: "Review vendors",
      icon: icons.verify,
      urgent: metrics.alerts.pendingVerification > 0,
    },
    {
      label: "Vendor delays",
      count: metrics.alerts.vendorDelays,
      detail: "Orders untouched for more than 24 hours",
      href: "/dashboard/admin?tab=orders",
      action: "Open orders",
      icon: icons.order,
      urgent: metrics.alerts.vendorDelays > 0,
    },
    {
      label: "Store approvals",
      count: metrics.alerts.pendingStoreApprovals,
      detail: "Storefronts waiting to go live",
      href: "/dashboard/admin/stores",
      action: "Review stores",
      icon: icons.store,
      urgent: metrics.alerts.pendingStoreApprovals > 0,
    },
    {
      label: "Aged payouts",
      count: metrics.alerts.payoutPending,
      detail: "Vendor or courier requests older than 48 hours",
      href: "/dashboard/admin?tab=payouts",
      action: "Review payouts",
      icon: icons.payout,
      urgent: metrics.alerts.payoutPending > 0,
    },
  ];

  const pipeline = [
    { label: "Awaiting vendor", count: metrics.pipeline.awaitingVendor, href: "/dashboard/admin?tab=orders", color: "bg-amber-500" },
    { label: "In transit", count: metrics.pipeline.inTransit, href: "/dashboard/admin?tab=linkwe-delivery", color: "bg-sky-500" },
    { label: "At warehouse", count: metrics.pipeline.atWarehouse, href: "/dashboard/admin?tab=orders", color: "bg-violet-500" },
    { label: "Ready to ship", count: metrics.pipeline.readyToShip, href: "/dashboard/admin?tab=orders", color: "bg-emerald-500" },
  ];

  const activePipeline = pipeline.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 pb-10">
      <header className="overflow-hidden rounded-3xl bg-[#1C1C1A] px-5 py-6 text-white shadow-sm sm:px-7 sm:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Operations live</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">LinkWe command centre</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
              Verify people, move every order forward, protect payouts, and keep the marketplace healthy from one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/admin/verification" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#D4450A] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#B83A09]">
              <Icon path={icons.verify} className="h-4 w-4" /> Review verification
            </Link>
            <Link href="/dashboard/admin?tab=orders" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15">
              <Icon path={icons.order} className="h-4 w-4" /> Manage orders
            </Link>
          </div>
        </div>
        <p className="mt-5 text-[11px] text-white/35">Updated {lastUpdated.toLocaleTimeString("en-TT", { hour: "numeric", minute: "2-digit" })}</p>
      </header>

      <section>
        <SectionHeader eyebrow="Control desk" title="Needs your attention" action={<span className="text-xs text-zinc-400">Oldest risks first</span>} />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {attention.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`group rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${item.urgent ? "border-orange-200 bg-orange-50/70" : "border-zinc-200 bg-white"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`rounded-xl p-2.5 ${item.urgent ? "bg-[#D4450A] text-white" : "bg-zinc-100 text-zinc-500"}`}>
                  <Icon path={item.icon} className="h-5 w-5" />
                </span>
                <span className={`text-3xl font-bold tabular-nums ${item.urgent ? "text-[#D4450A]" : "text-zinc-300"}`}>{item.count}</span>
              </div>
              <h3 className="mt-4 text-sm font-bold text-zinc-900">{item.label}</h3>
              <p className="mt-1 min-h-10 text-xs leading-5 text-zinc-500">{item.detail}</p>
              <p className="mt-3 text-xs font-bold text-[#D4450A]">{item.count > 0 ? item.action : "All clear"} <span className="transition group-hover:translate-x-0.5">→</span></p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader eyebrow="Today" title="Marketplace performance" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Orders today" value={metrics.ordersToday} detail="Paid marketplace orders" icon={icons.order} tone="orange" />
          <KpiCard label="Revenue today" value={formatTTD(metrics.revenueTodayMinor)} detail="Gross marketplace value" icon={icons.payout} tone="dark" />
          <KpiCard label="Active couriers" value={metrics.activeCouriers} detail={`${metrics.alerts.courierStale} location signal${metrics.alerts.courierStale === 1 ? "" : "s"} need checking`} icon={icons.courier} tone="blue" />
          <KpiCard label="Pending payouts" value={metrics.pendingPayouts} detail="Vendor and courier requests" icon={icons.payout} tone="green" />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeader eyebrow="Fulfilment" title="Order pipeline" action={<span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">{activePipeline} active</span>} />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {pipeline.map((stage) => (
              <Link key={stage.label} href={stage.href} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 transition hover:border-zinc-200 hover:bg-white">
                <span className={`mb-5 block h-2 w-8 rounded-full ${stage.color}`} />
                <p className="text-2xl font-bold tabular-nums text-zinc-950">{stage.count}</p>
                <p className="mt-1 text-xs font-medium leading-5 text-zinc-500">{stage.label}</p>
              </Link>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-100 pt-5">
            <Link href="/dashboard/admin?tab=orders" className="min-h-11 rounded-xl bg-[#1C1C1A] px-4 py-3 text-sm font-bold text-white">Open order desk</Link>
            <Link href="/dashboard/admin?tab=linkwe-delivery" className="min-h-11 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700">Managed delivery</Link>
            <Link href="/dashboard/admin?tab=tickets" className="min-h-11 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700">Ticket orders</Link>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeader eyebrow="Platform" title="Operating capacity" />
          <div className="divide-y divide-zinc-100">
            {[
              ["Active stores", metrics.totals.activeVendors, icons.store, "/dashboard/admin/stores"],
              ["Published products", metrics.totals.publishedProducts, icons.product, "/dashboard/admin/products"],
              ["Customers", metrics.totals.totalCustomers, icons.people, "/dashboard/admin?tab=customers"],
              ["Suspended accounts", metrics.totals.suspendedUsers, icons.people, "/dashboard/admin/users"],
            ].map(([label, value, icon, href]) => (
              <Link key={String(label)} href={String(href)} className="flex min-h-14 items-center gap-3 py-3 transition hover:opacity-70">
                <span className="rounded-lg bg-zinc-100 p-2 text-zinc-500"><Icon path={String(icon)} className="h-4 w-4" /></span>
                <span className="text-sm font-medium text-zinc-600">{label}</span>
                <strong className="ml-auto text-base tabular-nums text-zinc-950">{value}</strong>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="p-5 sm:p-6">
          <SectionHeader eyebrow="Latest activity" title="Recent orders" action={<button type="button" onClick={() => router.push("/dashboard/admin?tab=orders")} className="text-xs font-bold text-[#D4450A]">View all →</button>} />
        </div>
        {metrics.recentOrders.length === 0 ? (
          <p className="border-t border-zinc-100 px-6 py-10 text-center text-sm text-zinc-400">No paid orders yet.</p>
        ) : (
          <div className="divide-y divide-zinc-100 border-t border-zinc-100">
            {metrics.recentOrders.map((order) => (
              <button key={order.id} type="button" onClick={() => router.push("/dashboard/admin?tab=orders")} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-5 py-4 text-left transition hover:bg-zinc-50 sm:grid-cols-[1fr_1fr_auto_auto] sm:px-6">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-bold text-zinc-900">{order.referenceNumber}</p>
                  <p className="mt-1 truncate text-xs text-zinc-500 sm:hidden">{order.buyer.fullName}</p>
                </div>
                <p className="hidden truncate text-sm text-zinc-600 sm:block">{order.buyer.fullName}</p>
                <span className={`hidden rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset sm:inline-flex ${statusClass(order.status)}`}>{order.status.replaceAll("_", " ")}</span>
                <div className="text-right">
                  <p className="text-sm font-bold text-zinc-950">{formatTTD(order.totalMinor)}</p>
                  <p className="mt-1 text-[10px] text-zinc-400">{relativeTime(order.createdAt)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
