import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Banknote, Calendar, Clock, ConciergeBell } from "lucide-react";

import CancelBookingButton from "@/components/bookings/CancelBookingButton";
import MarkBookingCompleteButton from "@/components/bookings/MarkBookingCompleteButton";
import PublicNav from "@/components/layout/PublicNav";
import { canCustomerMarkBookingComplete, customerCancelState } from "@/lib/finance/booking-ui";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { icn } from "@/lib/iconography";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "My bookings",
  description: "View and manage your service bookings.",
};

export default async function BookingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const continueHref = user ? getRoleDashboardPath(user.role) : null;

  const bookings = await prisma.productBooking.findMany({
    where: { customerId: session.userId },
    select: {
      id: true,
      bookingDate: true,
      startTime: true,
      endTime: true,
      status: true,
      totalPrice: true,
      amountPaid: true,
      completedAt: true,
      earningsReleased: true,
      customerNotes: true,
      product: {
        select: {
          name: true,
          slug: true,
          images: true,
          cancellationHours: true,
          store: { select: { name: true, slug: true } },
        },
      },
    },
    orderBy: { bookingDate: "desc" },
  });

  function formatDate(d: Date | string) {
    return new Date(d).toLocaleDateString("en-TT", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  function formatTime(t: string) {
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
  }

  const upcoming = bookings.filter(
    (b) => new Date(b.bookingDate) >= new Date() && b.status !== "CANCELLED",
  );
  const past = bookings.filter(
    (b) => new Date(b.bookingDate) < new Date() || b.status === "CANCELLED",
  );

  const STATUS_COLOR: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    CONFIRMED: "bg-emerald-100 text-emerald-700",
    DEPOSIT_PAID: "bg-blue-100 text-blue-700",
    CANCELLED: "bg-red-100 text-red-700",
    COMPLETED: "bg-zinc-100 text-zinc-600",
    NO_SHOW: "bg-red-100 text-red-700",
  };

  function BookingCard({ booking }: { booking: (typeof bookings)[0] }) {
    return (
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-start gap-4 p-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
            {booking.product.images[0] ? (
              <img
                src={booking.product.images[0]}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ConciergeBell className={`${icn.ui} text-zinc-400`} aria-hidden strokeWidth={2} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-zinc-900">{booking.product.name}</p>
                <p className="text-xs text-zinc-500">{booking.product.store.name}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  STATUS_COLOR[booking.status] ?? "bg-zinc-100 text-zinc-600"
                }`}
              >
                {booking.status}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1">
                <Calendar className={icn.inline} aria-hidden strokeWidth={2} />
                {formatDate(booking.bookingDate)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className={icn.inline} aria-hidden strokeWidth={2} />
                {formatTime(booking.startTime)}
                {booking.endTime ? ` – ${formatTime(booking.endTime)}` : ""}
              </span>
              {booking.status === "DEPOSIT_PAID" ? (
                <span className="inline-flex items-center gap-1">
                  <Banknote className={icn.inline} aria-hidden strokeWidth={2} />
                  TTD {(booking.amountPaid ?? 0).toFixed(2)} paid · TTD{" "}
                  {Math.max(0, booking.totalPrice - (booking.amountPaid ?? 0)).toFixed(2)} due
                </span>
              ) : booking.totalPrice != null ? (
                <span className="inline-flex items-center gap-1">
                  <Banknote className={icn.inline} aria-hidden strokeWidth={2} />
                  TTD {(booking.amountPaid ?? booking.totalPrice).toFixed(2)}
                </span>
              ) : null}
            </div>
            {booking.customerNotes ? (
              <p className="mt-1.5 text-xs text-zinc-400">{booking.customerNotes}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-4 py-3">
          <Link
            href={`/service/${booking.product.slug}`}
            className="text-xs font-semibold text-[#D4450A] hover:underline"
          >
            View service →
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {booking.status === "COMPLETED" || booking.earningsReleased ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                Completed
                {booking.completedAt
                  ? ` · ${formatDate(booking.completedAt)}`
                  : ""}
              </span>
            ) : canCustomerMarkBookingComplete({
                status: booking.status,
                earningsReleased: booking.earningsReleased,
                bookingDate: booking.bookingDate,
                endTime: booking.endTime,
              }) ? (
              <MarkBookingCompleteButton
                bookingId={booking.id}
                storeName={booking.product.store.name}
              />
            ) : null}
            {(() => {
              const cancelState = customerCancelState({
                status: booking.status,
                bookingDate: booking.bookingDate,
                startTime: booking.startTime,
                cancellationHours: booking.product.cancellationHours,
              });
              if (cancelState === "cancellable") {
                return (
                  <CancelBookingButton
                    bookingId={booking.id}
                    storeName={booking.product.store.name}
                  />
                );
              }
              if (cancelState === "too_late") {
                return (
                  <span className="text-xs text-zinc-400">
                    To cancel, message the vendor.
                  </span>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-mobile-public lg:pb-0">
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
      />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-zinc-900">
              My <span className="italic text-[#D4450A]">bookings</span>
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {bookings.length} booking{bookings.length !== 1 ? "s" : ""} total
            </p>
          </div>
          <Link
            href="/services"
            className="rounded-xl border-2 border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:border-[#D4450A] hover:text-[#D4450A] transition-colors"
          >
            Browse services
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-20 text-center">
            <Calendar className={`${icn.empty} mb-4`} aria-hidden strokeWidth={1.25} />
            <h2 className="mb-2 text-lg font-bold text-zinc-900">No bookings yet</h2>
            <p className="mb-6 text-sm text-zinc-500">
              Book a service from a local vendor to get started
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
            {upcoming.length > 0 ? (
              <div>
                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-zinc-400">
                  Upcoming ({upcoming.length})
                </h2>
                <div className="flex flex-col gap-3">
                  {upcoming.map((b) => (
                    <BookingCard key={b.id} booking={b} />
                  ))}
                </div>
              </div>
            ) : null}
            {past.length > 0 ? (
              <div>
                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-zinc-400">
                  Past ({past.length})
                </h2>
                <div className="flex flex-col gap-3">
                  {past.map((b) => (
                    <BookingCard key={b.id} booking={b} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
