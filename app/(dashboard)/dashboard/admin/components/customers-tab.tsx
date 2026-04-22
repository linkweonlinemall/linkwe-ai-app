"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

import { getAdminCustomers } from "@/app/actions/admin-customers";

type Customer = Awaited<ReturnType<typeof getAdminCustomers>>[number];

function formatTTD(minor: number): string {
  return (minor / 100).toLocaleString("en-TT", {
    style: "currency",
    currency: "TTD",
  });
}

function relativeTime(date: Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

function formatJoined(date: Date): string {
  return new Date(date).toLocaleDateString("en-TT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getTotalSpend(customer: Customer): number {
  return customer.mainOrders.reduce((s, o) => s + o.totalMinor, 0);
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    PAID: "#1A7FB5",
    PROCESSING: "#E8820C",
    PARTIALLY_IN_HOUSE: "#7F77DD",
    READY_TO_SHIP: "#1B8C5A",
    PACKING_COMPLETE: "#7F77DD",
    SHIPPED: "#1A7FB5",
    DELIVERED: "#1B8C5A",
    COMPLETED: "#1B8C5A",
    CUSTOMER_RECEIVED: "#059669",
    CANCELLED: "#DC2626",
    REFUNDED: "#DC2626",
  };
  return map[status] ?? "#A1A1AA";
}

function getSpendBorderColor(spendMinor: number): string {
  if (spendMinor <= 0) return "#E4E4E7";
  if (spendMinor < 50_000) return "#1A7FB5";
  if (spendMinor < 200_000) return "#E8820C";
  return "#D4450A";
}

export default function CustomersTab() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "most_orders" | "highest_spend">("newest");

  useEffect(() => {
    getAdminCustomers().then((c) => {
      setCustomers(c);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let data = customers;

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.region ?? "").toLowerCase().includes(q),
      );
    }

    return [...data].sort((a, b) => {
      if (sortBy === "most_orders") return b.mainOrders.length - a.mainOrders.length;
      if (sortBy === "highest_spend") return getTotalSpend(b) - getTotalSpend(a);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [customers, search, sortBy]);

  const totalOrders = useMemo(
    () => customers.reduce((s, c) => s + c.mainOrders.length, 0),
    [customers],
  );

  const totalRevenue = useMemo(
    () => customers.reduce((s, c) => s + getTotalSpend(c), 0),
    [customers],
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Customers</h2>
          <p className="mt-0.5 text-sm text-zinc-500">All registered customer accounts</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-zinc-900">{customers.length}</p>
          <p className="text-xs text-zinc-400">total customers</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-4">
        {[
          { label: "Total customers", value: customers.length },
          { label: "Total orders", value: totalOrders },
          {
            label: "Total revenue",
            value: formatTTD(totalRevenue),
          },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">
              {typeof s.value === "number" ? (loading ? "—" : s.value) : loading ? "—" : s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, region…"
          className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#D4450A] focus:outline-none focus:ring-1 focus:ring-[#D4450A]"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700"
        >
          <option value="newest">Newest first</option>
          <option value="most_orders">Most orders</option>
          <option value="highest_spend">Highest spend</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {loading ? (
          <div className="divide-y divide-zinc-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex animate-pulse gap-4 px-4 py-4">
                <div className="h-10 flex-1 rounded-lg bg-zinc-100" />
                <div className="h-10 w-24 rounded-lg bg-zinc-100" />
                <div className="h-10 w-16 rounded-lg bg-zinc-100" />
                <div className="h-10 w-24 rounded-lg bg-zinc-100" />
                <div className="h-10 w-20 rounded-lg bg-zinc-100" />
                <div className="h-10 w-24 rounded-lg bg-zinc-100" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-zinc-500">
            No customers yet. Customers will appear here when they register.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Region</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">Total Spent</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Last Order</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const spend = getTotalSpend(c);
                  const border = getSpendBorderColor(spend);
                  const lastOrder = c.mainOrders[0];
                  return (
                    <Fragment key={c.id}>
                      <tr
                        role="button"
                        tabIndex={0}
                        onClick={() => setExpandedCustomer((prev) => (prev === c.id ? null : c.id))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ")
                            setExpandedCustomer((prev) => (prev === c.id ? null : c.id));
                        }}
                        className="cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50"
                        style={{ borderLeftWidth: 4, borderLeftColor: border, borderLeftStyle: "solid" }}
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-zinc-900">{c.fullName}</p>
                          <p className="text-xs text-zinc-500">{c.email}</p>
                        </td>
                        <td className="px-4 py-3 capitalize text-zinc-700">{c.region?.replace(/_/g, " ") ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-900">{c.mainOrders.length}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-zinc-900">
                          {formatTTD(spend)}
                        </td>
                        <td className="px-4 py-3 text-zinc-600">{formatJoined(c.createdAt)}</td>
                        <td className="px-4 py-3 text-zinc-600">
                          {lastOrder ? (
                            <>
                              <span className="text-zinc-900">{relativeTime(lastOrder.createdAt)}</span>
                              <p className="text-xs text-zinc-400">
                                {lastOrder.referenceNumber ?? `#${lastOrder.id.slice(-8).toUpperCase()}`}
                              </p>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                      {expandedCustomer === c.id ? (
                        <tr className="bg-zinc-50">
                          <td colSpan={6} className="px-4 pb-4 pt-0">
                            <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                              Order history
                            </p>
                            {c.mainOrders.length === 0 ? (
                              <p className="text-xs text-zinc-500">No completed orders yet.</p>
                            ) : (
                              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-zinc-500">
                                      <th className="px-3 py-2">Ref</th>
                                      <th className="px-3 py-2">Status</th>
                                      <th className="px-3 py-2 text-right">Total</th>
                                      <th className="px-3 py-2">Date</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {c.mainOrders.map((o) => {
                                      const col = getStatusColor(o.status);
                                      return (
                                        <tr key={o.id} className="border-b border-zinc-50 last:border-0">
                                          <td className="px-3 py-2">
                                            <span
                                              className="mr-2 inline-block h-2 w-2 rounded-full"
                                              style={{ backgroundColor: col }}
                                            />
                                            {o.referenceNumber ?? o.id.slice(-8).toUpperCase()}
                                          </td>
                                          <td className="px-3 py-2">
                                            <span
                                              className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                              style={{
                                                color: col,
                                                backgroundColor: `${col}18`,
                                              }}
                                            >
                                              {o.status.replace(/_/g, " ")}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-right font-mono">{formatTTD(o.totalMinor)}</td>
                                          <td className="px-3 py-2 text-zinc-600">
                                            {new Date(o.createdAt).toLocaleString("en-TT", {
                                              day: "numeric",
                                              month: "short",
                                              year: "numeric",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
