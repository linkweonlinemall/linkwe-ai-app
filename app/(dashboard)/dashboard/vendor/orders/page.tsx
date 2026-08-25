import Link from "next/link";
import { redirect } from "next/navigation";

import { getVendorBookings } from "@/app/actions/booking";
import { getVendorOnDemandRequests } from "@/app/actions/on-demand";
import { getMyStoreSubscribers } from "@/app/actions/service-subscription";
import OrdersTab from "@/app/(dashboard)/dashboard/vendor/components/tabs/orders-tab";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { vendorSplitOrderListSelect } from "@/lib/vendor/vendor-split-order-query";

type Props = { searchParams: Promise<{ view?: string | string[] }> };

type ServiceOrder = {
  id: string;
  kind: "Booking" | "On-demand" | "Quote" | "Subscription";
  title: string;
  customer: string;
  status: string;
  amountMinor: number;
  date: Date;
  detail: string;
  href: string;
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-TT", { day: "numeric", month: "short", year: "numeric" });
}

function statusBadge(status: string): { label: string; className: string } {
  const label = status.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  if (["PENDING", "PAST_DUE", "ENDING_SOON"].includes(status)) {
    return { label, className: "bg-amber-100 text-amber-800" };
  }
  if (["ACTIVE", "CONFIRMED", "ACCEPTED", "DEPOSIT_PAID"].includes(status)) {
    return { label, className: "bg-emerald-100 text-emerald-700" };
  }
  if (["CANCELLED", "CANCELED", "DECLINED", "NO_SHOW"].includes(status)) {
    return { label, className: "bg-zinc-100 text-zinc-600" };
  }
  if (status === "COMPLETED") {
    return { label, className: "bg-blue-100 text-blue-700" };
  }
  return { label, className: "bg-zinc-100 text-zinc-700" };
}

export default async function VendorOrdersPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) redirect("/onboarding/business/step-3");

  const query = await searchParams;
  const requestedView = Array.isArray(query.view) ? query.view[0] : query.view;
  const view = requestedView === "services" ? "services" : "products";

  const [splitOrders, bookings, requests, subscribersResult] = await Promise.all([
    prisma.splitOrder.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      select: vendorSplitOrderListSelect,
    }),
    getVendorBookings("all"),
    getVendorOnDemandRequests(),
    getMyStoreSubscribers(),
  ]);

  const subscribers = subscribersResult.ok ? subscribersResult.subscribers : [];
  const serviceOrders: ServiceOrder[] = [
    ...bookings.map((booking) => ({
      id: `booking-${booking.id}`,
      kind: "Booking" as const,
      title: booking.product.name,
      customer: booking.customer?.fullName ?? "Customer",
      status: booking.status,
      amountMinor: Math.round(booking.totalPrice * 100),
      date: booking.createdAt,
      detail: `${formatDate(booking.bookingDate)} · ${booking.startTime}`,
      href: `/dashboard/vendor/orders/service/booking/${booking.id}`,
    })),
    ...requests.map((request) => ({
      id: `request-${request.id}`,
      kind: request.requestType === "QUOTE" ? ("Quote" as const) : ("On-demand" as const),
      title: request.service.name,
      customer: request.customer.fullName ?? "Customer",
      status: request.status,
      amountMinor: Math.round((request.quotedPrice ?? 0) * 100),
      date: request.createdAt,
      detail: request.requestType === "QUOTE" ? "Quote request" : "On-demand request",
      href: `/dashboard/vendor/orders/service/request/${request.id}`,
    })),
    ...subscribers.map((subscription) => ({
      id: `subscription-${subscription.id}`,
      kind: "Subscription" as const,
      title: subscription.product.name,
      customer: subscription.customer.fullName ?? "Customer",
      status:
        subscription.status === "ACTIVE" && subscription.cancelAtPeriodEnd
          ? "ENDING_SOON"
          : subscription.status,
      amountMinor: subscription.priceMinor,
      date: subscription.createdAt,
      detail: `Recurring · ${subscription.interval}`,
      href: `/dashboard/vendor/orders/service/subscription/${subscription.id}`,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="min-w-0 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-8">
      <Link href="/dashboard/vendor" className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-800">
        ← Back to dashboard
      </Link>
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Orders</h1>
        <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
          Manage product fulfilment and customer service work in one place
        </p>
      </div>

      <nav className="mb-6 grid w-full max-w-md grid-cols-2 gap-1 rounded-xl border border-zinc-200 bg-white p-1 sm:w-fit" aria-label="Order type">
        <Link
          href="/dashboard/vendor/orders"
          className={`min-w-0 rounded-lg px-2 py-2 text-center text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
            view === "products" ? "bg-[#1C1C1A] text-white" : "text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          Product orders <span className="ml-1 opacity-70">{splitOrders.length}</span>
        </Link>
        <Link
          href="/dashboard/vendor/orders?view=services"
          className={`min-w-0 rounded-lg px-2 py-2 text-center text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
            view === "services" ? "bg-[#1C1C1A] text-white" : "text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          Service orders <span className="ml-1 opacity-70">{serviceOrders.length}</span>
        </Link>
      </nav>

      <div className="max-w-5xl">
        {view === "products" ? (
          <OrdersTab splitOrders={splitOrders} />
        ) : serviceOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
            <h2 className="text-lg font-bold text-zinc-900">No service orders yet</h2>
            <p className="mt-2 text-sm text-zinc-500">Bookings, requests, quotes, and subscribers will appear here.</p>
            <Link href="/dashboard/vendor/services" className="mt-5 inline-flex rounded-xl bg-[#D4450A] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">
              Manage services
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="mb-4 flex flex-wrap gap-2">
              <Link href="/dashboard/vendor/bookings" className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-[#D4450A]">Manage bookings</Link>
              <Link href="/dashboard/vendor/requests" className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-[#D4450A]">Manage requests</Link>
              <Link href="/dashboard/vendor/subscribers" className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-[#D4450A]">Manage subscribers</Link>
            </div>

            {serviceOrders.map((order) => {
              const badge = statusBadge(order.status);
              return (
                <Link
                  key={order.id}
                  href={order.href}
                  className="grid gap-3 rounded-xl border border-[rgba(28,28,26,0.08)] bg-white p-4 shadow-sm transition-colors hover:border-zinc-300 sm:grid-cols-[130px_minmax(0,1fr)_150px_110px] sm:items-center"
                >
                  <div>
                    <span className="rounded-full bg-[#F7F5F2] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-600">{order.kind}</span>
                    <p className="mt-2 text-xs text-zinc-400">{formatDate(order.date)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-zinc-900">{order.title}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">{order.customer} · {order.detail}</p>
                  </div>
                  <div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${badge.className}`}>{badge.label}</span>
                  </div>
                  <p className="text-sm font-bold text-zinc-900 sm:text-right">
                    {order.amountMinor > 0 ? `TTD ${(order.amountMinor / 100).toFixed(2)}` : "—"}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
