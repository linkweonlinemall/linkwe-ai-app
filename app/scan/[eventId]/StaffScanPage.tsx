"use client";

import { useParams } from "next/navigation";
import { useState, useTransition } from "react";

import { CheckInScanner } from "@/app/(dashboard)/dashboard/vendor/events/[id]/checkin/CheckInScanner";
import { verifyEventScanCode } from "@/app/actions/ticket-checkin";
import { formatEventDateLong } from "@/lib/events/format-datetime";
import { getCachedEvent, saveCachedEvent } from "@/lib/offline-checkin/event-cache";
import { requestPersistentStorage } from "@/lib/offline-checkin/persist";

type VerifiedEvent = {
  scanCode: string;
  eventTitle: string;
  eventStartDate: string;
  venueName?: string;
};

export function StaffScanPage() {
  const params = useParams();
  const eventId = typeof params.eventId === "string" ? params.eventId : "";

  const [codeInput, setCodeInput] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);
  const [verified, setVerified] = useState<VerifiedEvent | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleStartScanning(e: React.FormEvent) {
    e.preventDefault();
    const code = codeInput.trim();
    if (!code) {
      setGateError("Enter the scan code from your organizer.");
      return;
    }

    setGateError(null);
    startTransition(async () => {
      const online = typeof navigator !== "undefined" && navigator.onLine;

      if (online) {
        const result = await verifyEventScanCode(eventId, code);
        if (!result.valid) {
          setGateError("Invalid scan code");
          return;
        }

        setVerified({
          scanCode: code,
          eventTitle: result.eventTitle,
          eventStartDate: result.eventStartDate,
          venueName: result.venueName,
        });

        void saveCachedEvent({
          eventId,
          scanCode: code,
          eventTitle: result.eventTitle,
          eventStartDate: result.eventStartDate,
          venueName: result.venueName,
          cachedAt: Date.now(),
        });
        void requestPersistentStorage();
        return;
      }

      try {
        const cached = await getCachedEvent(eventId);
        if (!cached) {
          setGateError(
            "You need to connect to the internet once to set up this event for offline scanning.",
          );
          return;
        }
        if (cached.scanCode.trim() !== code) {
          setGateError("Invalid scan code");
          return;
        }

        setVerified({
          scanCode: cached.scanCode,
          eventTitle: cached.eventTitle,
          eventStartDate: cached.eventStartDate,
          venueName: cached.venueName,
        });
      } catch {
        setGateError(
          "You need to connect to the internet once to set up this event for offline scanning.",
        );
      }
    });
  }

  if (verified) {
    const startDate = new Date(verified.eventStartDate);
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Staff check-in
          </p>
          <h1 className="mt-1 text-xl font-bold text-[#1C1C1A] sm:text-2xl">
            {verified.eventTitle}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {formatEventDateLong(startDate)}
            {verified.venueName ? ` · ${verified.venueName}` : ""}
          </p>
        </div>

        <CheckInScanner
          eventId={eventId}
          eventTitle={verified.eventTitle}
          scanCode={verified.scanCode}
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <h1 className="text-2xl font-bold text-[#1C1C1A]">Staff check-in</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">
        Enter the scan code your organizer shared with you, then scan guest tickets.
      </p>

      <form onSubmit={handleStartScanning} className="mt-6 space-y-4">
        <div>
          <label htmlFor="staff-scan-code" className="block text-sm font-semibold text-zinc-700">
            Enter scan code
          </label>
          <input
            id="staff-scan-code"
            type="text"
            value={codeInput}
            onChange={(e) => {
              setCodeInput(e.target.value);
              setGateError(null);
            }}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="e.g. ABCD234567"
            className="mt-2 min-h-[52px] w-full rounded-xl border border-zinc-200 bg-white px-4 font-mono text-lg tracking-wider text-[#1C1C1A] placeholder:font-sans placeholder:tracking-normal placeholder:text-zinc-400 focus:border-[#D4450A] focus:outline-none focus:ring-2 focus:ring-[#D4450A]/20"
          />
        </div>

        {gateError ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800" role="alert">
            {gateError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#D4450A] px-4 py-3 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Checking code…" : "Start scanning"}
        </button>
      </form>
    </div>
  );
}
