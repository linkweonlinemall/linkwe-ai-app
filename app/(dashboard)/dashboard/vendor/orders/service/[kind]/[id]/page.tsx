import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ kind: string; id: string }> };

type DetailRow = {
  label: string;
  value: string;
};

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-TT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(status: string): string {
  return status.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function statusClass(status: string): string {
  if (["ACTIVE", "CONFIRMED", "ACCEPTED", "DEPOSIT_PAID"].includes(status)) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (["PENDING", "PAST_DUE"].includes(status)) return "bg-amber-100 text-amber-800";
  if (["COMPLETED"].includes(status)) return "bg-blue-100 text-blue-700";
  return "bg-zinc-100 text-zinc-600";
}

export default async function VendorServiceOrderDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");

  const { kind, id } = await params;
  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) redirect("/onboarding/business/step-3");

  let title = "";
  let customer = "Customer";
  let customerEmail = "—";
  let status = "";
  let amount = "—";
  let createdAt: Date | null = null;
  let manageHref = "";
  let manageLabel = "";
  let rows: DetailRow[] = [];
  let notes: string | null = null;

  if (kind === "booking") {
    const booking = await prisma.productBooking.findFirst({
      where: { id, product: { storeId: store.id, isService: true } },
      select: {
        bookingDate: true,
        startTime: true,
        endTime: true,
        status: true,
        totalPrice: true,
        amountPaid: true,
        guestCount: true,
        customerNotes: true,
        vendorNotes: true,
        meetingLink: true,
        createdAt: true,
        customerId: true,
        product: { select: { name: true, serviceType: true, slug: true } },
      },
    });
    if (!booking) notFound();
    const buyer = await prisma.user.findUnique({
      where: { id: booking.customerId },
      select: { fullName: true, email: true },
    });
    title = booking.product.name;
    customer = buyer?.fullName ?? "Customer";
    customerEmail = buyer?.email ?? "—";
    status = booking.status;
    amount = `TTD ${booking.totalPrice.toFixed(2)}`;
    createdAt = booking.createdAt;
    manageHref = "/dashboard/vendor/bookings";
    manageLabel = "Manage booking";
    notes = booking.vendorNotes ?? booking.customerNotes;
    rows = [
      { label: "Appointment date", value: formatDate(booking.bookingDate) },
      { label: "Time", value: `${booking.startTime}–${booking.endTime}` },
      { label: "Service type", value: formatStatus(booking.product.serviceType ?? "BOOKABLE") },
      { label: "Guests", value: String(booking.guestCount) },
      { label: "Paid online", value: booking.amountPaid != null ? `TTD ${booking.amountPaid.toFixed(2)}` : "No payment recorded" },
      ...(booking.meetingLink ? [{ label: "Meeting link", value: booking.meetingLink }] : []),
    ];
  } else if (kind === "request") {
    const request = await prisma.onDemandRequest.findFirst({
      where: { id, storeId: store.id },
      select: {
        description: true,
        customerAddress: true,
        status: true,
        requestType: true,
        quotedPrice: true,
        amountPaid: true,
        estimatedArrival: true,
        vendorNotes: true,
        declineReason: true,
        createdAt: true,
        service: { select: { name: true, slug: true } },
        customer: { select: { fullName: true, email: true, phone: true } },
      },
    });
    if (!request) notFound();
    title = request.service.name;
    customer = request.customer.fullName ?? "Customer";
    customerEmail = request.customer.email;
    status = request.status;
    amount = request.quotedPrice != null ? `TTD ${request.quotedPrice.toFixed(2)}` : "Not quoted";
    createdAt = request.createdAt;
    manageHref = "/dashboard/vendor/requests";
    manageLabel = request.requestType === "QUOTE" ? "Manage quote" : "Manage request";
    notes = request.vendorNotes ?? request.description;
    rows = [
      { label: "Request type", value: request.requestType === "QUOTE" ? "Quote" : "On-demand" },
      { label: "Customer phone", value: request.customer.phone ?? "—" },
      { label: "Service address", value: request.customerAddress ?? "—" },
      { label: "Estimated arrival", value: request.estimatedArrival ?? "—" },
      { label: "Paid online", value: request.amountPaid != null ? `TTD ${request.amountPaid.toFixed(2)}` : "No payment recorded" },
      ...(request.declineReason ? [{ label: "Decline reason", value: request.declineReason }] : []),
    ];
  } else if (kind === "subscription") {
    const subscription = await prisma.customerServiceSubscription.findFirst({
      where: { id, storeId: store.id },
      select: {
        status: true,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: true,
        canceledAt: true,
        priceMinor: true,
        interval: true,
        createdAt: true,
        product: { select: { name: true, slug: true } },
        customer: { select: { fullName: true, email: true } },
      },
    });
    if (!subscription) notFound();
    title = subscription.product.name;
    customer = subscription.customer.fullName ?? "Customer";
    customerEmail = subscription.customer.email;
    status = subscription.cancelAtPeriodEnd ? "ENDING_SOON" : subscription.status;
    amount = `TTD ${(subscription.priceMinor / 100).toFixed(2)}`;
    createdAt = subscription.createdAt;
    manageHref = "/dashboard/vendor/subscribers";
    manageLabel = "Manage subscriber";
    rows = [
      { label: "Billing interval", value: formatStatus(subscription.interval) },
      { label: "Next renewal / end", value: formatDate(subscription.currentPeriodEnd) },
      { label: "Cancellation scheduled", value: subscription.cancelAtPeriodEnd ? "Yes" : "No" },
      ...(subscription.canceledAt ? [{ label: "Canceled", value: formatDate(subscription.canceledAt) }] : []),
    ];
  } else {
    notFound();
  }

  return (
    <div className="px-6 py-8">
      <Link href="/dashboard/vendor/orders?view=services" className="mb-5 inline-flex text-sm text-zinc-500 hover:text-zinc-800">
        ← Back to service orders
      </Link>

      <div className="max-w-4xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Service order</p>
            <h1 className="mt-1 text-2xl font-bold text-zinc-900">{title}</h1>
            <p className="mt-1 text-sm text-zinc-500">Received {formatDate(createdAt)}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(status)}`}>
            {formatStatus(status)}
          </span>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-sm font-bold text-zinc-900">Order details</h2>
            <dl className="mt-4 divide-y divide-zinc-100">
              {rows.map((row) => (
                <div key={row.label} className="grid gap-1 py-3 sm:grid-cols-[170px_1fr]">
                  <dt className="text-xs font-semibold text-zinc-500">{row.label}</dt>
                  <dd className="break-words text-sm text-zinc-900">{row.value}</dd>
                </div>
              ))}
            </dl>
            {notes ? (
              <div className="mt-5 rounded-xl bg-zinc-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Notes / request</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{notes}</p>
              </div>
            ) : null}
          </section>

          <aside className="space-y-5">
            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-zinc-900">Customer</h2>
              <p className="mt-3 text-sm font-semibold text-zinc-900">{customer}</p>
              <p className="mt-1 break-all text-xs text-zinc-500">{customerEmail}</p>
            </section>
            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Order value</p>
              <p className="mt-2 text-2xl font-black text-zinc-900">{amount}</p>
              <Link href={manageHref} className="mt-5 flex w-full justify-center rounded-xl bg-[#D4450A] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90">
                {manageLabel}
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
