import Link from "next/link";

import { getTicketForCheckIn } from "@/app/actions/ticket-checkin";
import {
  formatEventDateLong,
  formatEventTime,
} from "@/lib/events/format-datetime";
import { CheckInAdmitPanel } from "./CheckInAdmitPanel";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ qrToken: string }> };

function formatCheckedInAt(date: Date | null): string {
  if (!date) return "unknown time";
  return new Date(date).toLocaleString("en-TT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function StatusBanner({
  status,
  checkedInAt,
}: {
  status: "VALID" | "USED" | "CANCELLED" | "REFUNDED";
  checkedInAt: Date | null;
}) {
  if (status === "VALID") {
    return (
      <div className="rounded-2xl border-2 border-emerald-600 bg-emerald-50 px-5 py-6 text-center">
        <p className="text-3xl font-bold text-emerald-800 sm:text-4xl">✅ Valid ticket</p>
      </div>
    );
  }

  if (status === "USED") {
    return (
      <div className="rounded-2xl border-2 border-amber-600 bg-amber-50 px-5 py-6 text-center">
        <p className="text-2xl font-bold text-amber-900 sm:text-3xl">⚠️ Already checked in</p>
        <p className="mt-2 text-lg font-medium text-amber-800">
          at {formatCheckedInAt(checkedInAt)}
        </p>
      </div>
    );
  }

  const label = status === "CANCELLED" ? "Cancelled" : "Refunded";
  return (
    <div className="rounded-2xl border-2 border-red-600 bg-red-50 px-5 py-6 text-center">
      <p className="text-2xl font-bold text-red-800 sm:text-3xl">
        ❌ {label} — do not admit
      </p>
    </div>
  );
}

export default async function CheckInPage({ params }: Props) {
  const { qrToken } = await params;
  const lookup = await getTicketForCheckIn(qrToken);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-[#1C1C1A]">
      <div className="mx-auto max-w-lg">
        <header className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4450A]">
            LinkWe · Ticket check-in
          </p>
        </header>

        {!lookup.found ? (
          <div className="rounded-2xl border-2 border-red-600 bg-white px-6 py-10 text-center shadow-sm">
            <p className="text-2xl font-bold text-red-700 sm:text-3xl">
              ❌ Invalid ticket
            </p>
            <p className="mt-3 text-base text-zinc-600">
              This QR code is not recognized.
            </p>
          </div>
        ) : (
          <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <StatusBanner status={lookup.status} checkedInAt={lookup.checkedInAt} />

            <div className="space-y-1 border-b border-zinc-100 pb-5">
              <h1 className="text-2xl font-bold leading-tight text-[#1C1C1A] sm:text-3xl">
                {lookup.event.title}
              </h1>
              <p className="text-base text-zinc-600">
                {formatEventDateLong(lookup.event.startDate)} · {formatEventTime(lookup.event.startDate)}
              </p>
              <p className="text-sm font-medium text-zinc-500">{lookup.event.venueLabel}</p>
            </div>

            <dl className="grid gap-3 text-base">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Holder
                </dt>
                <dd className="text-lg font-semibold text-[#1C1C1A]">{lookup.holderName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Ticket type
                </dt>
                <dd className="font-medium text-zinc-800">{lookup.ticketTypeName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Ticket number
                </dt>
                <dd className="font-mono text-lg font-bold text-[#D4450A]">
                  {lookup.ticketNumber}
                </dd>
              </div>
            </dl>

            {lookup.authorized && lookup.status === "VALID" ? (
              <CheckInAdmitPanel qrToken={lookup.qrToken} />
            ) : null}

            {!lookup.authorized ? (
              <p className="rounded-xl bg-zinc-100 px-4 py-3 text-center text-sm text-zinc-600">
                Log in as the event organizer to check in this ticket.{" "}
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(`/checkin/${lookup.qrToken}`)}`}
                  className="font-semibold text-[#D4450A] hover:underline"
                >
                  Sign in
                </Link>
              </p>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
