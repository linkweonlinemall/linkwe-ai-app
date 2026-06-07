"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { checkInTicket } from "@/app/actions/ticket-checkin";

type Props = {
  qrToken: string;
  /** Ticket's event — from server lookup; match is trivial but auth still enforced. */
  expectedEventId: string;
};

export function CheckInAdmitPanel({ qrToken, expectedEventId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleAdmit() {
    setError(null);
    startTransition(async () => {
      const result = await checkInTicket(qrToken, expectedEventId);
      if (result.ok && result.justCheckedIn) {
        setJustCheckedIn(true);
        router.refresh();
        return;
      }

      if (!result.ok) {
        if (result.reason === "wrong_event") {
          setError("Wrong event — this ticket is for a different event.");
        } else if (result.reason === "already_used" && result.checkedInAt) {
          setError(
            `Already checked in at ${formatCheckedInAt(result.checkedInAt)}`,
          );
        } else if (result.reason === "unauthenticated") {
          setError("Please log in as the event organizer to check in this ticket.");
        } else if (result.reason === "unauthorized") {
          setError("You are not authorized to check in tickets for this event.");
        } else if (result.reason === "cancelled") {
          setError("This ticket was cancelled — do not admit.");
        } else if (result.reason === "refunded") {
          setError("This ticket was refunded — do not admit.");
        } else {
          setError("This ticket cannot be checked in.");
        }
        if (result.reason === "already_used") {
          router.refresh();
        }
      }
    });
  }

  if (justCheckedIn) {
    return (
      <div
        className="rounded-2xl border-2 border-emerald-600 bg-emerald-50 px-6 py-8 text-center"
        role="status"
      >
        <p className="text-3xl font-bold text-emerald-800 sm:text-4xl">✅ Checked in!</p>
        <p className="mt-2 text-base text-emerald-900/80">Guest admitted successfully.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        disabled={isPending}
        onClick={handleAdmit}
        className="w-full rounded-2xl bg-[#D4450A] px-6 py-5 text-xl font-bold text-white shadow-lg transition-opacity hover:opacity-90 disabled:opacity-60 sm:text-2xl"
      >
        {isPending ? "Checking in…" : "Admit / Mark as used"}
      </button>
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-800" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function formatCheckedInAt(date: Date | string): string {
  return new Date(date).toLocaleString("en-TT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
