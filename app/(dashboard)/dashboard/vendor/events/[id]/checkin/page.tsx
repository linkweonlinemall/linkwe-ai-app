import Link from "next/link";

import { formatEventDateLong } from "@/lib/events/format-datetime";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { CheckInScanner } from "./CheckInScanner";
import { StaffScanCodePanel } from "./StaffScanCodePanel";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EventCheckInPage({ params }: Props) {
  const { id } = await params;

  const session = await getSession();
  if (!session || session.role !== "VENDOR") redirect("/login");

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) redirect("/dashboard/vendor");

  const event = await prisma.event.findFirst({
    where: { id, storeId: store.id },
    select: {
      id: true,
      title: true,
      startDate: true,
      venueName: true,
      scanCode: true,
      scanCodeSetAt: true,
    },
  });
  if (!event) redirect("/dashboard/vendor/events");

  return (
    <div className="mx-auto max-w-lg px-4 py-8 text-[#1C1C1A]">
      <Link
        href={`/dashboard/vendor/events/${id}/tickets`}
        className="mb-4 inline-block text-sm font-medium text-zinc-500 hover:text-[#D4450A]"
      >
        ← Back to tickets
      </Link>
      <h1 className="text-2xl font-bold sm:text-3xl">Check in — {event.title}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {formatEventDateLong(event.startDate)}
        {event.venueName ? ` · ${event.venueName}` : ""}
      </p>

      <Link
        href={`/dashboard/vendor/events/${id}/attendees`}
        className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border-2 border-[#D4450A] bg-white px-4 py-3 text-sm font-semibold text-[#D4450A] transition-colors hover:bg-[#FEF0EB] sm:w-auto"
      >
        View attendees
      </Link>

      <div className="mt-6 space-y-6">
        <StaffScanCodePanel
          eventId={event.id}
          initialScanCode={event.scanCode}
          initialScanCodeSetAt={event.scanCodeSetAt?.toISOString() ?? null}
        />
        <CheckInScanner eventId={event.id} eventTitle={event.title} />
      </div>
    </div>
  );
}
