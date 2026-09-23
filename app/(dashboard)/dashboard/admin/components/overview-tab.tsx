"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Banknote,
  Package,
  ShieldCheck,
  Store,
  Users,
  RefreshCw,
  Clock3,
  Truck,
  Plus,
  Sparkles,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { getAdminOverviewMetrics } from "@/app/actions/admin-metrics";
type Metrics = Awaited<ReturnType<typeof getAdminOverviewMetrics>>;
const money = (minor: number) =>
  `TTD ${(minor / 100).toLocaleString("en-TT", { maximumFractionDigits: 0 })}`;
export default function OverviewTab() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    try {
      setMetrics(await getAdminOverviewMetrics());
      setUpdated(new Date());
      setError("");
    } catch {
      setError(
        "The dashboard could not refresh. Your last loaded figures are still shown.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  if (!metrics)
    return (
      <div className="space-y-5">
        {error ? (
          <div className="admin-alert" role="alert">
            {error}
            <button className="admin-button ml-3" onClick={() => void load()}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="h-52 animate-pulse rounded-3xl bg-[#dce7e4]" />
            <div className="h-28 animate-pulse rounded-3xl bg-white" />
            <div className="h-72 animate-pulse rounded-3xl bg-white" />
          </>
        )}
      </div>
    );
  const tasks = [
    {
      name: "Vendor verification",
      count: metrics.alerts.pendingVerification,
      detail: "Applications awaiting review",
      href: "/dashboard/admin/verification",
      icon: ShieldCheck,
    },
    {
      name: "Store approvals",
      count: metrics.alerts.pendingStoreApprovals,
      detail: "New businesses waiting to open",
      href: "/dashboard/admin/stores?status=PENDING_APPROVAL",
      icon: Store,
    },
    {
      name: "Vendor follow-ups",
      count: metrics.alerts.vendorDelays,
      detail: "Orders waiting more than 24 hours",
      href: "/dashboard/admin?tab=linkwe-delivery",
      icon: Clock3,
    },
    {
      name: "Payout requests",
      count: metrics.pendingPayouts,
      detail: `${metrics.alerts.payoutPending} waiting over 48 hours`,
      href: "/dashboard/admin?tab=payouts",
      icon: Banknote,
    },
  ];
  return (
    <div className="space-y-6">
      <header className="admin-hero flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="admin-eyebrow">Your marketplace. In good hands.</p>
          <h1>
            A clearer view.
            <br />A better working day.
          </h1>
          <p>
            Keep the people, businesses and daily decisions moving. Your next
            task is just a click away.
          </p>
        </div>
        <div className="relative z-10">
          <Link
            href="/dashboard/admin/onboarding"
            className="admin-button admin-button-primary"
          >
            <Plus size={18} />
            Open Creation Studio
            <ArrowUpRight size={17} />
          </Link>
          <Link
            href="/"
            target="_blank"
            className="mt-4 flex items-center justify-center gap-2 text-xs text-white/70"
          >
            Visit the marketplace
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="admin-muted">A live snapshot of LinkWe</p>
        <button
          className="flex min-h-9 items-center gap-2 text-[11px] text-[#6d8289]"
          disabled={busy}
          onClick={() => void load()}
        >
          <RefreshCw size={13} className={busy ? "animate-spin" : ""} />
          {busy
            ? "Refreshing…"
            : `Updated ${updated?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
        </button>
      </div>
      {error && (
        <p className="admin-alert" role="alert">
          {error}
        </p>
      )}
      <div className="admin-stat-grid">
        {[
          {
            label: "Paid orders today",
            value: metrics.ordersToday,
            note: "Today's customer orders",
            icon: Package,
          },
          {
            label: "Sales today",
            value: money(metrics.revenueTodayMinor),
            note: "Paid order value",
            icon: Banknote,
          },
          {
            label: "Active stores",
            value: metrics.totals.activeVendors,
            note: "Local businesses open for discovery",
            icon: Store,
          },
          {
            label: "Parcels in warehouse",
            value: metrics.pipeline.atWarehouse,
            note: "Ready for their next step",
            icon: Truck,
          },
        ].map((stat) => (
          <div className="admin-stat" key={stat.label}>
            <div className="flex items-center justify-between">
              <small>{stat.label}</small>
              <stat.icon size={17} className="text-[#7c9897]" />
            </div>
            <strong>{stat.value}</strong>
            <p>{stat.note}</p>
          </div>
        ))}
      </div>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="admin-panel-title">Create & manage</h2>
          <span className="admin-muted">Your everyday tools</span>
        </div>
        <div className="admin-quicklinks">
          {[
            { name: "Create a store", kind: "store", icon: Store },
            { name: "Add a product", kind: "product", icon: Package },
            { name: "Add a service", kind: "service", icon: Sparkles },
            { name: "Add a person", kind: "user", icon: Users },
          ].map((item) => (
            <Link
              href={`/dashboard/admin/records/${item.kind}/new`}
              key={item.kind}
            >
              <item.icon size={20} />
              {item.name}
              <Plus size={13} className="ml-auto" />
            </Link>
          ))}
          <Link href="/dashboard/admin/onboarding">
            <Plus size={20} />
            All creation tools
            <ArrowUpRight size={13} className="ml-auto" />
          </Link>
        </div>
      </section>
      <div className="grid gap-5 xl:grid-cols-[1.05fr_1fr]">
        <section className="admin-panel">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <p className="admin-eyebrow">Action desk</p>
              <h2 className="admin-panel-title">What needs your attention</h2>
            </div>
            <span className="admin-badge admin-badge-orange">
              {tasks.reduce((sum, t) => sum + t.count, 0)} tasks
            </span>
          </div>
          <div className="space-y-2">
            {tasks.map((task) => (
              <Link
                href={task.href}
                key={task.name}
                className="flex items-center gap-3 rounded-xl border border-[#edf0f0] px-4 py-4 transition hover:bg-[#fff8f3]"
              >
                <span
                  className={`rounded-xl p-2.5 ${task.count ? "bg-orange-50 text-orange-700" : "bg-[#eff5f2] text-[#668578]"}`}
                >
                  <task.icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-semibold">{task.name}</h3>
                  <p className="mt-1 text-[10px] text-[#7e8f95]">
                    {task.detail}
                  </p>
                </div>
                <strong className="text-xl font-semibold">{task.count}</strong>
                <ChevronRight size={15} className="text-[#a3b0b3]" />
              </Link>
            ))}
          </div>
        </section>
        <section className="admin-panel">
          <p className="admin-eyebrow">Fulfilment flow</p>
          <h2 className="admin-panel-title">From local store to front door</h2>
          <p className="admin-muted mt-2 mb-5">Every parcel has a next step.</p>
          {[
            {
              name: "Vendor preparation",
              count: metrics.pipeline.awaitingVendor,
            },
            { name: "Inbound collections", count: metrics.pipeline.inTransit },
            {
              name: "Warehouse receiving",
              count: metrics.pipeline.atWarehouse,
            },
            { name: "Ready for dispatch", count: metrics.pipeline.readyToShip },
          ].map((stage, index) => (
            <Link
              key={stage.name}
              href="/dashboard/admin?tab=linkwe-delivery"
              className="flex items-center gap-3 border-b border-[#edf1f1] py-4"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#edf4f2] text-[10px] text-[#5d8075]">
                0{index + 1}
              </span>
              <span className="flex-1 text-xs font-medium">{stage.name}</span>
              <strong className="text-lg font-semibold">{stage.count}</strong>
            </Link>
          ))}
          <Link
            href="/dashboard/admin?tab=linkwe-delivery"
            className="admin-button mt-5 w-full"
          >
            Open warehouse & delivery
            <ArrowUpRight size={15} />
          </Link>
        </section>
      </div>
      <section className="admin-panel">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="admin-panel-title">Recent orders</h2>
          <Link
            className="text-xs font-semibold text-[#c14a1d]"
            href="/dashboard/admin?tab=orders"
          >
            View all
            <ArrowUpRight size={13} className="ml-1 inline" />
          </Link>
        </div>
        {!metrics.recentOrders.length ? (
          <div className="admin-empty">
            <CheckCircle2 size={25} className="mx-auto mb-3 text-[#6f9684]" />
            New paid orders will appear here.
          </div>
        ) : (
          metrics.recentOrders.map((order) => (
            <Link
              href={`/dashboard/admin?tab=orders&q=${encodeURIComponent(order.referenceNumber || order.id)}`}
              key={order.id}
              className="flex flex-wrap items-center gap-3 border-t border-[#edf0f0] py-4"
            >
              <Package size={18} className="text-[#90a5aa]" />
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-xs">
                  {order.referenceNumber || order.id}
                </strong>
                <span className="mt-1 block text-[10px] text-[#82939a]">
                  {order.buyer.fullName}
                </span>
              </div>
              <span className="admin-badge">
                {order.status.replaceAll("_", " ")}
              </span>
              <strong className="text-xs">{money(order.totalMinor)}</strong>
              <ChevronRight size={15} />
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
