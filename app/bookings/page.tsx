import { redirect } from "next/navigation";
import type { Metadata } from "next";
import PublicNav from "@/components/layout/PublicNav";
import BookingsClient from "@/components/customer/BookingsClient";
import styles from "@/components/customer/customer.module.css";
import { canCustomerMarkBookingComplete, customerCancelState } from "@/lib/finance/booking-ui";
import { getBookingScheduledStart, getBookingScheduledEnd } from "@/lib/finance/booking-schedule";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
export const metadata: Metadata = { title: "My bookings", description: "Your appointments, payments and local experts, all in one place." };
export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=%2Fbookings");
  const bookings = await prisma.productBooking.findMany({
    where: { customerId: session.userId }, orderBy: { bookingDate: "desc" },
    select: {
      id: true, bookingDate: true, startTime: true, endTime: true, status: true, totalPrice: true, amountPaid: true,
      guestCount: true, customerNotes: true, cancellationReason: true, meetingLink: true, completedAt: true,
      earningsReleased: true, couponSnapshot: true, staffMember: { select: { name: true } },
      product: { select: { name: true, slug: true, images: true, cancellationHours: true, serviceLocation: true, address: true, store: { select: { id: true, name: true, slug: true } } } },
    },
  });
  const rows = bookings.map(b => ({ ...b, bookingDate: b.bookingDate.toISOString(), startsAt: getBookingScheduledStart(b.bookingDate, b.startTime).toISOString(), endsAt: getBookingScheduledEnd(b.bookingDate, b.endTime).toISOString(), completedAt: b.completedAt?.toISOString() ?? null, staffName: b.staffMember?.name ?? null, canComplete: canCustomerMarkBookingComplete(b), cancelState: b.earningsReleased ? "not_applicable" : customerCancelState({ ...b, cancellationHours: b.product.cancellationHours }) }));
  // eslint-disable-next-line react-hooks/purity -- One server-request snapshot, passed unchanged to the client.
  const now = Date.now();
  const dashboardHref = getRoleDashboardPath(session.role);
  return <div className={`${styles.page} pb-mobile-public lg:pb-0`}><PublicNav user={{ name: session.fullName ?? "Account", href: dashboardHref }} dashboardHref={dashboardHref} /><main className={styles.container}><BookingsClient bookings={rows} now={now} paymentNotice={(await searchParams).payment} /><footer className={styles.footer}>We people. We business. We local.</footer></main></div>;
}
