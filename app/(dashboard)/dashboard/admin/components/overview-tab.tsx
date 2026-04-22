"use client";

import { useEffect, useState } from "react";

import { getAdminOverviewMetrics } from "@/app/actions/admin-metrics";
import Card from "@/components/ui/Card";
import StatCard from "@/components/ui/StatCard";

type Metrics = Awaited<ReturnType<typeof getAdminOverviewMetrics>>;

function formatTTD(minor: number): string {
  return (minor / 100).toLocaleString("en-TT", {
    style: "currency",
    currency: "TTD",
  });
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

function SkeletonCard() {
  return (
    <Card className="animate-pulse rounded-2xl" padding="md">
      <div className="mb-3 h-3 w-20 rounded bg-zinc-200" />
      <div className="mb-2 h-8 w-24 rounded bg-zinc-200" />
      <div className="h-3 w-32 rounded bg-zinc-100" />
    </Card>
  );
}

export default function OverviewTab() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    getAdminOverviewMetrics().then((data) => {
      setMetrics(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const formattedDate = currentTime.toLocaleDateString("en-TT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedTime = currentTime.toLocaleTimeString("en-TT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-2 h-7 w-48 animate-pulse rounded bg-zinc-200" />
            <div className="h-4 w-64 animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const pipelineTotal =
    metrics.pipeline.awaitingVendor +
    metrics.pipeline.inTransit +
    metrics.pipeline.atWarehouse +
    metrics.pipeline.readyToShip;

  const pipelineStages = [
    { label: "Awaiting Vendor", count: metrics.pipeline.awaitingVendor, color: "#E8820C", tab: "warehouse" },
    { label: "In Transit", count: metrics.pipeline.inTransit, color: "#1A7FB5", tab: "couriers" },
    { label: "At Warehouse", count: metrics.pipeline.atWarehouse, color: "#7F77DD", tab: "warehouse" },
    { label: "Ready to Ship", count: metrics.pipeline.readyToShip, color: "#1B8C5A", tab: "warehouse" },
  ];

  const alertList = [
    metrics.alerts.vendorDelays > 0 && {
      type: "warning" as const,
      message: `${metrics.alerts.vendorDelays} vendor${metrics.alerts.vendorDelays !== 1 ? "s" : ""} haven't responded in over 24 hours`,
      tab: "warehouse",
    },
    metrics.alerts.courierStale > 0 && {
      type: "info" as const,
      message: `${metrics.alerts.courierStale} courier location${metrics.alerts.courierStale !== 1 ? "s" : ""} not updated in 5+ minutes`,
      tab: "couriers",
    },
    metrics.alerts.payoutPending > 0 && {
      type: "warning" as const,
      message: `${metrics.alerts.payoutPending} payout request${metrics.alerts.payoutPending !== 1 ? "s" : ""} pending over 48 hours`,
      tab: "vendors",
    },
  ].filter(Boolean) as { type: "warning" | "info"; message: string; tab: string }[];

  const statusPillClass = (status: string) => {
    const map: Record<string, string> = {
      PAID: "border border-blue-200 bg-blue-50 text-blue-700",
      PROCESSING: "border border-amber-200 bg-amber-50 text-amber-700",
      READY_TO_SHIP: "border border-emerald-200 bg-emerald-50 text-emerald-700",
      SHIPPED: "border border-purple-200 bg-purple-50 text-purple-700",
      DELIVERED: "border border-teal-200 bg-teal-50 text-teal-700",
      COMPLETED: "border border-emerald-200 bg-emerald-50 text-emerald-700",
      CANCELLED: "border border-red-200 bg-red-50 text-red-700",
      REFUNDED: "border border-red-200 bg-red-50 text-red-700",
    };
    return map[status] ?? "border border-zinc-200 bg-zinc-100 text-zinc-600";
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      PAID: "Order Placed",
      PROCESSING: "Processing",
      READY_TO_SHIP: "Ready to Ship",
      SHIPPED: "Shipped",
      DELIVERED: "Delivered",
      COMPLETED: "Completed",
      CANCELLED: "Cancelled",
      REFUNDED: "Refunded",
    };
    return map[status] ?? status;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mb-1 text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Command Center
          </h2>
          <p className="mb-6 text-sm" style={{ color: "var(--text-muted)" }}>
            {formattedDate}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ backgroundColor: "#22C55E" }}
            />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: "#22C55E" }} />
          </span>
          <span className="text-xs font-medium text-zinc-600">Live — {formattedTime}</span>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Orders Today",
            value: metrics.ordersToday,
            sublabel: "New orders placed",
            icon: (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            ),
          },
          {
            label: "Revenue Today",
            value: formatTTD(metrics.revenueTodayMinor),
            sublabel: "Gross revenue",
            icon: (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            ),
          },
          {
            label: "Pending Payouts",
            value: metrics.pendingPayouts,
            sublabel: "Awaiting approval",
            icon: (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
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

      <Card className="rounded-xl" padding="md" style={{ border: "1px solid var(--card-border)" }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Operational Pipeline
          </h2>
          <span className="text-xs text-zinc-400">{pipelineTotal} active orders</span>
        </div>

        {pipelineTotal === 0 ? (
          <div className="flex h-10 items-center justify-center rounded-xl bg-zinc-100">
            <span className="text-xs text-zinc-400">No active orders in pipeline</span>
          </div>
        ) : (
          <>
            <div className="flex h-10 gap-0.5 overflow-hidden rounded-xl">
              {pipelineStages.map((stage) => {
                const pct = (stage.count / pipelineTotal) * 100;
                if (pct === 0) return null;
                return (
                  <button
                    key={stage.label}
                    type="button"
                    onClick={() => {
                      const url = new URL(window.location.href);
                      url.searchParams.set("tab", stage.tab);
                      window.history.pushState({}, "", url.toString());
                      window.dispatchEvent(new PopStateEvent("popstate"));
                    }}
                    className="flex cursor-pointer items-center justify-center text-xs font-bold text-white transition-opacity hover:opacity-90"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: stage.color,
                      minWidth: pct > 0 ? "2rem" : "0",
                    }}
                    title={`${stage.label}: ${stage.count}`}
                  >
                    {pct > 8 ? stage.count : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              {pipelineStages.map((stage) => (
                <div key={stage.label} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: stage.color }} />
                  <span className="text-xs text-zinc-600">
                    {stage.label}: <span className="font-semibold">{stage.count}</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl" padding="md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Alerts</h2>
            {alertList.length > 0 ? (
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: "#E8820C" }}
              >
                {alertList.length}
              </span>
            ) : null}
          </div>
          {alertList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#22C55E"
                strokeWidth="2"
                className="mb-2"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <p className="text-xs text-zinc-400">All clear — no alerts</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {alertList.map((alert, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set("tab", alert.tab);
                    window.history.pushState({}, "", url.toString());
                    window.dispatchEvent(new PopStateEvent("popstate"));
                  }}
                  className="flex w-full items-start gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-zinc-50"
                >
                  <span
                    className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: alert.type === "warning" ? "#E8820C" : "#1A7FB5" }}
                  />
                  <p className="text-xs text-zinc-700">{alert.message}</p>
                </button>
              ))}
            </div>
          )}
        </Card>

        <div
          className="rounded-xl bg-white p-5 lg:col-span-2"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Recent Orders
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Ref</th>
                <th className="py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Customer</th>
                <th className="py-2 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">Total</th>
                <th className="py-2 pl-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Status
                </th>
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
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl p-6 shadow-sm" style={{ backgroundColor: "#1C1C1A" }}>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">Platform Totals</p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-zinc-500">Lifetime Revenue</p>
              <p className="mt-1 text-2xl font-bold" style={{ color: "#D4450A" }}>
                {formatTTD(metrics.totals.lifetimeRevenueMinor)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Total Orders</p>
              <p className="mt-1 text-2xl font-bold text-white">{metrics.totals.totalOrders}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Active Vendors</p>
              <p className="mt-1 text-2xl font-bold text-white">{metrics.totals.activeVendors}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Customers</p>
              <p className="mt-1 text-2xl font-bold text-white">{metrics.totals.totalCustomers}</p>
            </div>
          </div>
        </div>

        <Card className="rounded-2xl" padding="lg">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">Quick Actions</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Process Warehouse", tab: "warehouse", color: "#7F77DD" },
              { label: "View Couriers", tab: "couriers", color: "#1A7FB5" },
              { label: "Approve Payouts", tab: "vendors", color: "#E8820C" },
              { label: "Operations Map", tab: "map", color: "#1B8C5A" },
            ].map((action) => (
              <button
                key={action.tab}
                type="button"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("tab", action.tab);
                  window.history.pushState({}, "", url.toString());
                  window.dispatchEvent(new PopStateEvent("popstate"));
                }}
                className="rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all hover:text-white"
                style={{
                  borderColor: action.color,
                  color: action.color,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = action.color;
                  (e.currentTarget as HTMLButtonElement).style.color = "white";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = action.color;
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
