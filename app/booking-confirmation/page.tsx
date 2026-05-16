import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type Props = { searchParams: Promise<{ bookingId?: string }> };

export default async function BookingConfirmationPage({ searchParams }: Props) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");

  const booking = params.bookingId
    ? await prisma.productBooking.findFirst({
        where: { id: params.bookingId, customerId: session.userId },
        select: {
          id: true,
          bookingDate: true,
          startTime: true,
          endTime: true,
          status: true,
          totalPrice: true,
          product: {
            select: {
              name: true,
              slug: true,
              store: { select: { name: true, slug: true } },
            },
          },
        },
      })
    : null;

  function formatTime(t: string): string {
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm text-center">
        <div className="mb-4 text-5xl">✅</div>
        <h1 className="text-2xl font-black text-zinc-900">Booking confirmed!</h1>
        <p className="mt-2 text-sm text-zinc-500">Your payment was successful and your booking is confirmed.</p>

        {booking ? (
          <div className="mt-6 rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-left">
            <p className="text-sm font-bold text-zinc-900">{booking.product.name}</p>
            <p className="mt-1 text-xs text-zinc-500">{booking.product.store.name}</p>
            <div className="mt-3 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Date</span>
                <span className="font-semibold text-zinc-900">
                  {new Date(booking.bookingDate).toLocaleDateString("en-TT", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Time</span>
                <span className="font-semibold text-zinc-900">
                  {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
                </span>
              </div>
              <div className="mt-0.5 flex justify-between border-t border-zinc-100 pt-1.5">
                <span className="font-semibold text-zinc-700">Total paid</span>
                <span className="font-black text-[#D4450A]">TTD {booking.totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/services"
            className="w-full rounded-xl py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: "#D4450A" }}
          >
            Browse more services
          </Link>
          <Link
            href="/"
            className="w-full rounded-xl border border-zinc-200 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
