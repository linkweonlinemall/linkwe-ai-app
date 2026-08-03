import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Banknote, ConciergeBell, RefreshCw } from "lucide-react";

import { getMyServiceSubscriptions } from "@/app/actions/service-subscription";
import SubscriptionManageActions from "@/components/subscriptions/SubscriptionManageActions";
import { getSession } from "@/lib/auth/session";
import { formatSubscriptionIntervalDisplay } from "@/lib/finance/subscription-interval";
import { formatSubscriptionPeriodEnd } from "@/lib/finance/subscription-format";
import { icn } from "@/lib/iconography";

export const metadata: Metadata = {
  title: "My subscriptions",
  description: "View and manage your service subscriptions.",
};

function formatCanceledDate(d: Date | null): string {
  if (!d) return "Unknown date";
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

export default async function CustomerSubscriptionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const result = await getMyServiceSubscriptions();
  if (!result.ok) redirect("/login");

  const { subscriptions } = result;
  const active = subscriptions.filter((s) => s.status === "ACTIVE");
  const past = subscriptions.filter((s) => s.status === "CANCELED");

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-mobile-public lg:pb-0">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard/customer"
              className="mb-2 inline-block text-xs font-semibold text-zinc-500 hover:text-[#D4450A]"
            >
              ← Back to dashboard
            </Link>
            <h1 className="font-display text-3xl font-bold text-zinc-900">
              My <span className="italic text-[#D4450A]">subscriptions</span>
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {subscriptions.length} subscription{subscriptions.length !== 1 ? "s" : ""} total
            </p>
          </div>
          <Link
            href="/services"
            className="shrink-0 rounded-xl border-2 border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 transition-colors hover:border-[#D4450A] hover:text-[#D4450A]"
          >
            Browse services
          </Link>
        </div>

        {subscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-20 text-center">
            <RefreshCw className={`${icn.empty} mb-4`} aria-hidden strokeWidth={1.25} />
            <h2 className="mb-2 text-lg font-bold text-zinc-900">
              You don&apos;t have any subscriptions yet
            </h2>
            <p className="mb-6 text-sm text-zinc-500">
              Subscribe to a recurring service from a local vendor to get started
            </p>
            <Link
              href="/services"
              className="rounded-xl bg-[#D4450A] px-6 py-3 text-sm font-bold text-white hover:opacity-90"
            >
              Browse services
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {active.length > 0 ? (
              <section>
                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-zinc-400">
                  Active subscriptions ({active.length})
                </h2>
                <div className="flex flex-col gap-3">
                  {active.map((sub) => {
                    const periodEndLabel = formatSubscriptionPeriodEnd(sub.currentPeriodEnd);
                    return (
                      <article
                        key={sub.id}
                        className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
                      >
                        <div className="flex items-start gap-4 p-4">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                            {sub.product.images[0] ? (
                              <img
                                src={sub.product.images[0]}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <ConciergeBell
                                  className={`${icn.ui} text-zinc-400`}
                                  aria-hidden
                                  strokeWidth={2}
                                />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <Link
                                  href={`/service/${sub.product.slug}`}
                                  className="text-sm font-bold text-zinc-900 hover:text-[#D4450A]"
                                >
                                  {sub.product.name}
                                </Link>
                                <Link
                                  href={`/store/${sub.store.slug}`}
                                  className="mt-0.5 block text-xs text-zinc-500 hover:text-[#D4450A]"
                                >
                                  {sub.store.name}
                                </Link>
                              </div>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                  sub.cancelAtPeriodEnd
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {sub.cancelAtPeriodEnd ? "Ending soon" : "Active"}
                              </span>
                            </div>
                            <p className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-500">
                              <Banknote className={icn.inline} aria-hidden strokeWidth={2} />
                              {formatPriceMinor(sub.priceMinor, sub.interval)}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {sub.cancelAtPeriodEnd
                                ? `Ends on ${periodEndLabel}`
                                : "Renews automatically"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3">
                          <Link
                            href={`/service/${sub.product.slug}`}
                            className="text-xs font-semibold text-[#D4450A] hover:underline"
                          >
                            View service →
                          </Link>
                          <SubscriptionManageActions
                            subscriptionId={sub.id}
                            cancelAtPeriodEnd={sub.cancelAtPeriodEnd}
                            currentPeriodEnd={sub.currentPeriodEnd}
                            layout="card"
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {past.length > 0 ? (
              <section>
                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-zinc-400">
                  Past subscriptions ({past.length})
                </h2>
                <div className="flex flex-col gap-3">
                  {past.map((sub) => (
                    <article
                      key={sub.id}
                      className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/80 shadow-sm"
                    >
                      <div className="flex items-start gap-4 p-4">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100 opacity-80">
                          {sub.product.images[0] ? (
                            <img
                              src={sub.product.images[0]}
                              alt=""
                              className="h-full w-full object-cover grayscale"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <ConciergeBell
                                className={`${icn.ui} text-zinc-400`}
                                aria-hidden
                                strokeWidth={2}
                              />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-zinc-700">{sub.product.name}</p>
                          <p className="text-xs text-zinc-500">{sub.store.name}</p>
                          <p className="mt-2 text-xs text-zinc-500">
                            Canceled on {formatCanceledDate(sub.canceledAt)}
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">
                            {formatPriceMinor(sub.priceMinor, sub.interval)}
                          </p>
                        </div>
                      </div>
                      {sub.product.isPublished ? (
                        <div className="border-t border-zinc-200/80 px-4 py-3">
                          <Link
                            href={`/service/${sub.product.slug}`}
                            className="text-xs font-semibold text-[#D4450A] hover:underline"
                          >
                            Subscribe again →
                          </Link>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
