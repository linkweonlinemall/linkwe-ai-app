import Link from "next/link";
import { redirect } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { getMyStoreSubscribers } from "@/app/actions/service-subscription";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";
import { formatSubscriptionIntervalDisplay } from "@/lib/finance/subscription-interval";
import { icn } from "@/lib/iconography";

const CARD_CLASS =
  "rounded-xl border border-[rgba(28,28,26,0.08)] bg-white p-4 shadow-sm";

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-TT", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPriceMinor(priceMinor: number, interval: string): string {
  return `TTD ${(priceMinor / 100).toFixed(2)} ${formatSubscriptionIntervalDisplay(interval)}`;
}

function subscriberStatusBadge(sub: {
  status: "ACTIVE" | "PAST_DUE" | "CANCELED";
  cancelAtPeriodEnd: boolean;
}): { label: string; className: string } {
  if (sub.status === "CANCELED") {
    return { label: "Canceled", className: "bg-zinc-100 text-zinc-600" };
  }
  if (sub.status === "PAST_DUE") {
    return { label: "Past due", className: "bg-red-100 text-red-700" };
  }
  if (sub.cancelAtPeriodEnd) {
    return { label: "Ending soon", className: "bg-amber-100 text-amber-800" };
  }
  return { label: "Active", className: "bg-emerald-100 text-emerald-700" };
}

export default async function VendorSubscribersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");

  const result = await getMyStoreSubscribers();
  if (!result.ok) {
    if (result.error === "no_store") redirect("/onboarding/business/step-3");
    redirect("/login");
  }

  const { subscribers, summary } = result;
  const active = subscribers.filter((s) => s.status !== "CANCELED");
  const past = subscribers.filter((s) => s.status === "CANCELED");

  return (
    <div className="min-w-0 px-4 py-5 sm:px-6 sm:py-8">
      <Link
        href="/dashboard/vendor"
        className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Back to dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Subscribers</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Customers subscribed to your recurring services · {subscribers.length}{" "}
          {subscribers.length === 1 ? "subscriber" : "subscribers"} total
        </p>
      </div>

      {subscribers.length > 0 ? (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className={CARD_CLASS}>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Active subscribers
            </p>
            <p className="mt-2 text-3xl font-black text-zinc-900">{summary.activeCount}</p>
          </div>
          <div className={CARD_CLASS}>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Recurring revenue (gross)
            </p>
            <p className="mt-2 text-3xl font-black text-zinc-900">
              TTD {(summary.monthlyRecurringRevenueMinor / 100).toFixed(2)}
              <span className="text-base font-semibold text-zinc-500"> /mo</span>
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Before LinkWe commission — not your take-home payout
            </p>
          </div>
        </div>
      ) : null}

      {subscribers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-20 text-center">
          <RefreshCw className={`${icn.empty} mb-4`} aria-hidden strokeWidth={1.25} />
          <h2 className="mb-2 text-lg font-bold text-zinc-900">No subscribers yet</h2>
          <p className="mb-6 max-w-sm text-sm text-zinc-500">
            Create and publish a subscription service to start earning recurring revenue from
            customers.
          </p>
          <Link
            href="/dashboard/vendor/services"
            className="rounded-xl bg-[#D4450A] px-6 py-3 text-sm font-bold text-white hover:opacity-90"
          >
            Manage services
          </Link>
        </div>
      ) : (
        <div className="max-w-5xl space-y-8">
          {active.length > 0 ? (
            <section>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-zinc-400">
                Active ({active.length})
              </h2>
              <div className="overflow-hidden rounded-xl border border-[rgba(28,28,26,0.08)] bg-white shadow-sm">
                <div className="divide-y divide-zinc-100 md:hidden">
                  {active.map((sub) => {
                    const badge = subscriberStatusBadge(sub);
                    return <article key={sub.id} className="min-w-0 p-4">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0"><p className="truncate font-semibold text-zinc-900">{sub.customer.fullName ?? "Customer"}</p><Link href={`/service/${sub.product.slug}`} className="mt-1 block break-words text-sm font-medium text-[#D4450A]">{sub.product.name}</Link></div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${badge.className}`}>{badge.label}</span>
                      </div>
                      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-zinc-400">Price</dt><dd className="mt-1 font-medium text-zinc-700">{formatPriceMinor(sub.priceMinor, sub.interval)}</dd></div><div><dt className="text-zinc-400">Next renewal</dt><dd className="mt-1 font-medium text-zinc-700">{sub.status === "ACTIVE" ? formatDate(sub.currentPeriodEnd) : "—"}</dd></div></dl>
                    </article>;
                  })}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-zinc-100 bg-zinc-50/80 text-xs font-bold uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="px-4 py-3">Subscriber</th>
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Subscribed</th>
                        <th className="px-4 py-3">Next renewal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {active.map((sub) => {
                        const badge = subscriberStatusBadge(sub);
                        return (
                          <tr key={sub.id} className="hover:bg-zinc-50/50">
                            <td className="px-4 py-3 font-medium text-zinc-900">
                              {sub.customer.fullName ?? "Customer"}
                            </td>
                            <td className="px-4 py-3">
                              <Link
                                href={`/service/${sub.product.slug}`}
                                className="font-medium text-[#D4450A] hover:underline"
                              >
                                {sub.product.name}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-zinc-600">
                              {formatPriceMinor(sub.priceMinor, sub.interval)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-600">{formatDate(sub.createdAt)}</td>
                            <td className="px-4 py-3 text-zinc-600">
                              {sub.status === "ACTIVE" ? formatDate(sub.currentPeriodEnd) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : null}

          {past.length > 0 ? (
            <section>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-zinc-400">
                Past ({past.length})
              </h2>
              <div className="overflow-hidden rounded-xl border border-[rgba(28,28,26,0.08)] bg-zinc-50/50 shadow-sm">
                <div className="divide-y divide-zinc-200/60 md:hidden">
                  {past.map((sub) => { const badge = subscriberStatusBadge(sub); return <article key={sub.id} className="min-w-0 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-zinc-800">{sub.customer.fullName ?? "Customer"}</p><p className="mt-1 break-words text-sm text-zinc-600">{sub.product.name}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${badge.className}`}>{badge.label}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-zinc-400">Price</dt><dd className="mt-1 font-medium text-zinc-700">{formatPriceMinor(sub.priceMinor, sub.interval)}</dd></div><div><dt className="text-zinc-400">Canceled</dt><dd className="mt-1 font-medium text-zinc-700">{formatDate(sub.canceledAt)}</dd></div></dl></article>; })}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-zinc-200/80 text-xs font-bold uppercase tracking-wide text-zinc-400">
                      <tr>
                        <th className="px-4 py-3">Subscriber</th>
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Subscribed</th>
                        <th className="px-4 py-3">Canceled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/60">
                      {past.map((sub) => {
                        const badge = subscriberStatusBadge(sub);
                        return (
                          <tr key={sub.id} className="text-zinc-600">
                            <td className="px-4 py-3">{sub.customer.fullName ?? "Customer"}</td>
                            <td className="px-4 py-3">{sub.product.name}</td>
                            <td className="px-4 py-3">
                              {formatPriceMinor(sub.priceMinor, sub.interval)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">{formatDate(sub.createdAt)}</td>
                            <td className="px-4 py-3">{formatDate(sub.canceledAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
