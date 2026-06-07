"use client";

import { useState, useTransition } from "react";

import { generateEventScanCode } from "@/app/actions/events";
import { getAppBaseUrl } from "@/lib/app-base-url";

type Props = {
  eventId: string;
  initialScanCode: string | null;
  initialScanCodeSetAt: string | null;
};

function formatGeneratedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-TT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function actionErrorMessage(reason?: string): string {
  switch (reason) {
    case "unauthenticated":
      return "Please sign in again.";
    case "Unauthorized":
      return "You are not authorized to manage this event.";
    case "Event not found":
      return "Event not found.";
    default:
      return reason ?? "Could not generate scan code. Please try again.";
  }
}

export function StaffScanCodePanel({
  eventId,
  initialScanCode,
  initialScanCodeSetAt,
}: Props) {
  const [scanCode, setScanCode] = useState(initialScanCode);
  const [scanCodeSetAt, setScanCodeSetAt] = useState(initialScanCodeSetAt);
  const [error, setError] = useState<string | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [isPending, startTransition] = useTransition();

  const staffScanUrl = `${getAppBaseUrl()}/scan/${eventId}`;

  async function copyText(text: string, kind: "code" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  function runGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateEventScanCode(eventId);
      if (result.ok && result.code) {
        setScanCode(result.code);
        setScanCodeSetAt(new Date().toISOString());
        setConfirmRegenerate(false);
        return;
      }
      setError(actionErrorMessage(result.reason));
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-[#1C1C1A]">Staff scanning</h2>
      <p className="mt-1 text-sm leading-relaxed text-zinc-600">
        Share this code with your door staff so they can scan tickets on their own phones — no
        login needed.
      </p>

      {error ? (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {!scanCode ? (
        <button
          type="button"
          onClick={() => runGenerate()}
          disabled={isPending}
          className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#D4450A] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
        >
          {isPending ? "Generating…" : "Generate scan code"}
        </button>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl bg-[#F5F5F5] px-4 py-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Scan code</p>
            <p
              className="mt-2 font-mono text-3xl font-bold tracking-wider text-[#1C1C1A] sm:text-4xl"
              aria-label={`Staff scan code ${scanCode}`}
            >
              {scanCode}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Staff link</p>
            <p className="mt-1 break-all font-mono text-sm text-zinc-700">{staffScanUrl}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyText(staffScanUrl, "link")}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-[#D4450A] bg-white px-4 py-2 text-sm font-semibold text-[#D4450A] transition-colors hover:bg-[#FEF0EB]"
              >
                {copied === "link" ? "Copied!" : "Copy link"}
              </button>
              <button
                type="button"
                onClick={() => void copyText(scanCode, "code")}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-[#D4450A] bg-white px-4 py-2 text-sm font-semibold text-[#D4450A] transition-colors hover:bg-[#FEF0EB]"
              >
                {copied === "code" ? "Copied!" : "Copy code"}
              </button>
            </div>
          </div>

          {confirmRegenerate ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-sm leading-relaxed text-amber-950">
                This will disable the current code. Staff using the old code will need the new one.
                Continue?
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => runGenerate()}
                  disabled={isPending}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#D4450A] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? "Regenerating…" : "Continue"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRegenerate(false)}
                  disabled={isPending}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRegenerate(true)}
              disabled={isPending}
              className="text-sm font-semibold text-zinc-500 underline-offset-2 hover:text-[#D4450A] hover:underline disabled:opacity-50"
            >
              Regenerate code
            </button>
          )}

          {scanCodeSetAt ? (
            <p className="text-xs text-zinc-400">Generated {formatGeneratedAt(scanCodeSetAt)}</p>
          ) : null}
        </div>
      )}
    </section>
  );
}
