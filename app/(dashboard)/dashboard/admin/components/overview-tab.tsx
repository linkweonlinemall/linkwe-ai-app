"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getAdminOverviewMetrics } from "@/app/actions/admin-metrics";
import { DashboardMetricSkeleton } from "@/components/ui/content-skeletons";
import StatCard from "@/components/ui/StatCard";

type Metrics = Awaited<ReturnType<typeof getAdminOverviewMetrics>>;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTTD(minor: number): string {
  return (minor / 100).toLocaleString("en-TT", { style: "currency", currency: "TTD" });
}

function relativeTime(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

const CARD_BORDER = "var(--card-border, rgba(28,28,26,0.08))";

function BandLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
      {children}
    </p>
  );
}

// ─── Status pills (unchanged from Part 3 brand pass) ──────────────────────────

function statusPillClass(status: string): string {
  const map: Record<string, string> = {
    PAID:          "border border-[#BFE0F7] bg-[#EFF8FF] text-[#1A7FB5]",
    PROCESSING:    "border border-[#FEE0B9] bg-[#FFF7ED] text-[#E8820C]",
    READY_TO_SHIP: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    SHIPPED:       "border border-purple-200 bg-purple-50 text-purple-700",
    DELIVERED:     "border border-emerald-200 bg-emerald-50 text-emerald-700",
    COMPLETED:     "border border-emerald-200 bg-emerald-50 text-emerald-700",
    CANCELLED:     "border border-[#FECFBE] bg-[#FFF1ED] text-[#D4450A]",
    REFUNDED:      "border border-[#FECFBE] bg-[#FFF1ED] text-[#D4450A]",
  };
  return map[status] ?? "border border-zinc-200 bg-zinc-100 text-zinc-600";
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PAID: "Order Placed", PROCESSING: "Processing", READY_TO_SHIP: "Ready to Ship",
    SHIPPED: "Shipped", DELIVERED: "Delivered", COMPLETED: "Completed",
    CANCELLED: "Cancelled", REFUNDED: "Refunded",
  };
  return map[status] ?? status;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OverviewTab() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    getAdminOverviewMetrics().then((data) => { setMetrics(data); setLoading(false); });
  }, []);

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const formattedDate = currentTime.toLocaleDateString("en-TT", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const formattedTime = currentTime.toLocaleTimeString("en-TT", { hour: "2-digit", minute: "2-digit" });

  function nav(tab: string) { router.push(`/dashboard/admin?tab=${tab}`); }

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <div className="h-6 w-40 animate-pulse rounded bg-zinc-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <DashboardMetricSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  // ── Band 1: conditional attention cards ──
  const attentionCards = [
    metrics.alerts.payoutPending > 0 && {
      key: "payouts",
      count: metrics.alerts.payoutPending,
      label: "Payouts pending 48h+",
      action: "Review payouts",
      tab: "vendors",
      color: "#D4450A", bg: "#FFF1ED", iconBg: "#FECFBE",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
    },
    metrics.alerts.vendorDelays > 0 && {
      key: "vendors",
      count: metrics.alerts.vendorDelays,
      label: "Vendors unresponsive 24h+",
      action: "View orders",
      tab: "orders",
      color: "#E8820C", bg: "#FFF7ED", iconBg: "#FEE0B9",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    },
    metrics.alerts.courierStale > 0 && {
      key: "couriers",
      count: metrics.alerts.courierStale,
      label: "Courier locations stale",
      action: "Open map",
      tab: "map",
      color: "#1A7FB5", bg: "#EFF8FF", iconBg: "#BFE0F7",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
        </svg>
      ),
    },
  ].filter(Boolean) as {
    key: string; count: number; label: string; action: string; tab: string;
    color: string; bg: string; iconBg: string; icon: React.ReactNode;
  }[];

  const allClear = attentionCards.length === 0;

  // ── Band 2: pipeline stages — same data as before ──
  const pipelineTotal = metrics.pipeline.awaitingVendor + metrics.pipeline.inTransit;

  const pipelineStages = [
    { label: "Awaiting Vendor", count: metrics.pipeline.awaitingVendor, color: "#E8820C", tab: "orders" },
    { label: "In Transit", count: metrics.pipeline.inTransit, color: "#1A7FB5", tab: "linkwe-delivery" },
  ];

  return (
    <div className="flex flex-col gap-8">

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Command Center</h2>
          <p className="mt-0.5 text-sm text-zinc-400">{formattedDate}</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-medium text-zinc-600">Live — {formattedTime}</span>
        </div>
      </div>

      {/* ─── BAND 1 — NEEDS ATTENTION ────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <BandLabel>Needs Attention</BandLabel>

        {allClear ? (
          <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white px-5 py-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" aria-hidden>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500">All clear — nothing needs attention</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {attentionCards.map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={() => nav(card.tab)}
                className="rounded-xl p-4 text-left transition-opacity hover:opacity-90"
                style={{ backgroundColor: card.bg }}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: card.iconBg, color: card.color }}
                    >
                      {card.icon}
                    </div>
                    <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: card.color }}>
                      {card.count}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold" style={{ color: card.color }}>
                    {card.action} →
                  </span>
                </div>
                <p className="text-xs font-medium" style={{ color: card.color }}>
                  {card.label}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ─── BAND 2 — TODAY ──────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <BandLabel>Today</BandLabel>

        {/* 4 metric stat cards — unchanged data */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Orders Today",
              value: metrics.ordersToday,
              sublabel: "New orders placed",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              ),
            },
            {
              label: "Revenue Today",
              value: formatTTD(metrics.revenueTodayMinor),
              sublabel: "Gross revenue",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              ),
            },
            {
              label: "Active Couriers",
              value: metrics.activeCouriers,
              sublabel: "Currently on jobs",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              ),
            },
            {
              label: "Pending Payouts",
              value: metrics.pendingPayouts,
              sublabel: "Awaiting approval",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              ),
            },
          ].map((card) => (
            <StatCard
              key={card.label}
              className="overflow-hidden rounded-2xl"
              icon={card.icon}
              label={card.label}
              sublabel={card.sublabel}
              value={card.value}
            />
          ))}
        </div>

        {/* Pipeline — 4 equal stage cards, zeros shown calmly in muted gray */}
        <div className="rounded-xl border bg-white p-5" style={{ borderColor: CARD_BORDER }}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">Operational Pipeline</h3>
            <span className="text-xs text-zinc-400">{pipelineTotal} active orders</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {pipelineStages.map((stage) => (
              <button
                key={stage.label}
                type="button"
                onClick={() => nav(stage.tab)}
                className="rounded-lg border border-zinc-100 p-4 text-center transition-colors hover:bg-zinc-50"
              >
                <span
                  className="mx-auto mb-2 block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <p className="mb-1 text-[11px] font-medium leading-tight text-zinc-500">
                  {stage.label}
                </p>
                <p
                  className={`text-2xl font-bold tabular-nums ${stage.count === 0 ? "text-zinc-300" : ""}`}
                  style={stage.count > 0 ? { color: stage.color } : undefined}
                >
                  {stage.count}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BAND 3 — PLATFORM ───────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <BandLabel>Platform</BandLabel>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent orders — 2 cols wide */}
          <div className="rounded-xl border bg-white p-5 lg:col-span-2" style={{ borderColor: CARD_BORDER }}>
            <h3 className="mb-4 text-sm font-semibold text-zinc-900">Recent Orders</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Ref</th>
                  <th className="py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Customer</th>
                  <th className="py-2 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">Total</th>
                  <th className="py-2 pl-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Status</th>
                  <th className="py-2 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-zinc-50 transition-colors hover:bg-zinc-50">
                    <td className="py-2.5 font-mono text-xs text-zinc-500">
                      {order.referenceNumber ?? order.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="py-2.5 text-xs text-zinc-900">{order.buyer.fullName}</td>
                    <td className="py-2.5 text-right font-mono text-xs font-medium text-zinc-900">
                      {formatTTD(order.totalMinor)}
                    </td>
                    <td className="py-2.5 pl-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusPillClass(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-xs text-zinc-400">{relativeTime(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Platform totals — white card replacing dark panel */}
          <div className="rounded-xl border bg-white p-5" style={{ borderColor: CARD_BORDER }}>
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Platform Totals
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-zinc-400">Lifetime Revenue</p>
                <p className="mt-1 text-xl font-bold leading-tight" style={{ color: "#D4450A" }}>
                  {formatTTD(metrics.totals.lifetimeRevenueMinor)}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Total Orders</p>
                <p className="mt-1 text-xl font-bold leading-tight text-zinc-900">
                  {metrics.totals.totalOrders}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Active Vendors</p>
                <p className="mt-1 text-xl font-bold leading-tight text-zinc-900">
                  {metrics.totals.activeVendors}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Customers</p>
                <p className="mt-1 text-xl font-bold leading-tight text-zinc-900">
                  {metrics.totals.totalCustomers}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions row */}
        <div className="flex flex-wrap items-center gap-3">
          {[
            { label: "View Orders", tab: "orders" },
            { label: "LinkWe Delivery", tab: "linkwe-delivery" },
            { label: "Operations Map", tab: "map" },
          ].map((action) => (
            <button
              key={action.tab}
              type="button"
              onClick={() => nav(action.tab)}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              {action.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => nav("vendors")}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#D4450A" }}
          >
            Approve Payouts
          </button>
        </div>
      </section>

    </div>
  );
}
