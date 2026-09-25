import { redirect } from "next/navigation";

import { getVendorBookings, getVendorBookingStats } from "@/app/actions/booking";
import { getSession } from "@/lib/auth/session";

import VendorBookingsClient from "./VendorBookingsClient";

export default async function VendorBookingsPage({ searchParams }: { searchParams: Promise<{ booking?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [bookings, stats] = await Promise.all([
    getVendorBookings("all"),
    getVendorBookingStats(),
  ]);

  const requestedId = (await searchParams).booking;
  const initialBookingId = bookings.some(booking => booking.id === requestedId) ? requestedId : undefined;

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Bookings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage all bookings across your services
        </p>
      </div>
      <VendorBookingsClient key={initialBookingId ?? "all"} bookings={bookings} stats={stats} initialBookingId={initialBookingId} />
    </div>
  );
}
