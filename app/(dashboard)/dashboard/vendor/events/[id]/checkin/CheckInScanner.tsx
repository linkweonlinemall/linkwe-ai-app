"use client";

import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";

import {
  checkInTicket,
  getTicketForCheckIn,
  type TicketCheckInLookup,
} from "@/app/actions/ticket-checkin";

const SCANNER_ELEMENT_ID = "vendor-checkin-qr-reader";
const DEBUG_LOG_MAX = 15;

type View = "scanning" | "result" | "camera_unavailable";

type Props = {
  eventId: string;
  eventTitle: string;
};

function parseCheckInToken(decoded: string): string | null {
  const trimmed = decoded.trim();
  if (!trimmed.includes("/checkin/")) return null;

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      const marker = "/checkin/";
      const idx = url.pathname.indexOf(marker);
      if (idx === -1) return null;
      const token = url.pathname.slice(idx + marker.length).split("/")[0]?.trim();
      return token || null;
    }
  } catch {
    /* fall through to regex */
  }

  const match = trimmed.match(/\/checkin\/([^/?#\s]+)/);
  return match?.[1]?.trim() ?? null;
}

function formatCheckedInAt(date: Date | string | null | undefined): string {
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

function isCameraPermissionOrMissingError(err: unknown): boolean {
  if (err instanceof DOMException) {
    return (
      err.name === "NotAllowedError" ||
      err.name === "NotFoundError" ||
      err.name === "SecurityError"
    );
  }
  if (typeof err === "string") {
    const lower = err.toLowerCase();
    return (
      lower.includes("notallowed") ||
      lower.includes("permission denied") ||
      lower.includes("permission") ||
      lower.includes("requested device not found")
    );
  }
  if (err instanceof Error) {
    if (err.name === "NotAllowedError" || err.name === "NotFoundError") {
      return true;
    }
    const lower = err.message.toLowerCase();
    return (
      lower.includes("notallowed") ||
      lower.includes("permission denied") ||
      lower.includes("permission") ||
      lower.includes("requested device not found")
    );
  }
  return false;
}

function formatCameraError(err: unknown): string {
  const named = err as { name?: string; message?: string };
  return `${named?.name ?? "Error"}: ${named?.message ?? String(err)}`;
}

async function waitForScannerMount(elementId: string, maxFrames = 8): Promise<boolean> {
  for (let i = 0; i < maxFrames; i++) {
    if (document.getElementById(elementId)) return true;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  return !!document.getElementById(elementId);
}

export function CheckInScanner({ eventId, eventTitle }: Props) {
  const reactId = useId();
  const elementId = `${SCANNER_ELEMENT_ID}-${reactId.replace(/:/g, "")}`;

  const [view, setView] = useState<View>("scanning");
  const [scanGeneration, setScanGeneration] = useState(0);
  const [lookup, setLookup] = useState<TicketCheckInLookup | null>(null);
  const [foreignQr, setForeignQr] = useState(false);
  const [admitted, setAdmitted] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const decodeLoggedRef = useRef(false);
  const stopScannerRef = useRef<() => Promise<void>>(async () => {});
  const pushLogRef = useRef<(message: string) => void>(() => {});

  const pushLog = useCallback((message: string) => {
    const ts = new Date().toISOString().slice(11, 23);
    setDebugLog((prev) => [...prev, `${ts} ${message}`].slice(-DEBUG_LOG_MAX));
  }, []);

  pushLogRef.current = pushLog;

  const stopScanner = useCallback(async () => {
    const instance = scannerRef.current;
    pushLogRef.current(
      `stopScanner called (isScanning=${instance?.isScanning ?? "n/a"}, hasInstance=${!!instance})`,
    );
    scannerRef.current = null;
    if (!instance) return;
    try {
      if (instance.isScanning) {
        await instance.stop();
      }
    } catch {
      /* start() may not have finished — safe to ignore */
    }
    try {
      instance.clear();
    } catch {
      /* DOM may already be torn down */
    }
  }, []);

  stopScannerRef.current = stopScanner;

  const processToken = useCallback(
    async (token: string) => {
      if (processingRef.current) return;
      processingRef.current = true;
      await stopScannerRef.current();

      setForeignQr(false);
      setAdmitted(false);
      setActionError(null);
      setView("result");

      const result = await getTicketForCheckIn(token);
      setLookup(result);
    },
    [],
  );

  const handleDecodedRef = useRef<(decodedText: string) => void>(() => {});
  handleDecodedRef.current = (decodedText: string) => {
    void (async () => {
      if (processingRef.current) return;

      const token = parseCheckInToken(decodedText);
      if (!token) {
        processingRef.current = true;
        await stopScannerRef.current();
        setForeignQr(true);
        setLookup(null);
        setView("result");
        return;
      }

      await processToken(token);
    })();
  };

  useEffect(() => {
    if (view !== "scanning") return;

    const log = (message: string) => pushLogRef.current(message);
    log(`effect run (view=${view}, gen=${scanGeneration})`);

    let cancelled = false;

    const startCamera = async (isRetry: boolean) => {
      try {
        setCameraError(null);
        if (isRetry) log(`startCamera retry (gen=${scanGeneration})`);

        const { Html5Qrcode } = await import("html5-qrcode");
        log("import done");
        if (cancelled) {
          log("aborted after import (cancelled)");
          return;
        }

        const mounted = await waitForScannerMount(elementId);
        log(mounted ? "mount node found" : "mount node MISSING");
        if (cancelled) {
          log("aborted after mount wait (cancelled)");
          return;
        }
        if (!mounted) {
          throw new Error(`Scanner mount node #${elementId} not found`);
        }

        const instance = new Html5Qrcode(elementId);
        scannerRef.current = instance;
        log("Html5Qrcode constructed");

        log("start() called");
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (text) => {
            if (!decodeLoggedRef.current) {
              decodeLoggedRef.current = true;
              pushLogRef.current("decode callback fired (first)");
            }
            handleDecodedRef.current(text);
          },
          () => {
            /* per-frame decode miss — ignore */
          },
        );
        log("start() resolved — streaming");
      } catch (err) {
        log(`catch: ${formatCameraError(err)}${isRetry ? " (retry)" : ""}`);
        console.error(`[checkin-scanner] camera start failed${isRetry ? " (retry)" : ""}:`, err);
        if (cancelled) {
          log("catch ignored (cancelled)");
          return;
        }

        await stopScannerRef.current();

        const errorText = formatCameraError(err);
        setCameraError(errorText);

        if (isCameraPermissionOrMissingError(err)) {
          setView("camera_unavailable");
          return;
        }

        if (!isRetry) {
          console.error("[checkin-scanner] retrying camera start after transient error");
          log("scheduling retry");
          await startCamera(true);
          return;
        }

        setView("camera_unavailable");
      }
    };

    decodeLoggedRef.current = false;
    void startCamera(false);

    return () => {
      log("effect cleanup running");
      cancelled = true;
      void stopScannerRef.current();
    };
  }, [view, scanGeneration, elementId]);

  function handleScanNext() {
    processingRef.current = false;
    setLookup(null);
    setForeignQr(false);
    setAdmitted(false);
    setActionError(null);
    setManualToken("");
    setCameraError(null);
    decodeLoggedRef.current = false;
    setView("scanning");
    setScanGeneration((n) => {
      const next = n + 1;
      pushLog(`scan next → gen=${next}`);
      return next;
    });
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = manualToken.trim();
    if (!raw) return;
    const token = parseCheckInToken(raw) ?? raw;
    void processToken(token);
  }

  function handleAdmit(qrToken: string) {
    setActionError(null);
    startTransition(async () => {
      const result = await checkInTicket(qrToken);
      if (result.ok && result.justCheckedIn) {
        setAdmitted(true);
        const refreshed = await getTicketForCheckIn(qrToken);
        setLookup(refreshed);
        return;
      }

      if (!result.ok) {
        if (result.reason === "already_used") {
          setActionError(`Already checked in at ${formatCheckedInAt(result.checkedInAt)}`);
          const refreshed = await getTicketForCheckIn(qrToken);
          setLookup(refreshed);
        } else if (result.reason === "unauthorized") {
          setActionError("You are not authorized to check in this ticket.");
        } else if (result.reason === "cancelled") {
          setActionError("This ticket was cancelled — do not admit.");
        } else if (result.reason === "refunded") {
          setActionError("This ticket was refunded — do not admit.");
        } else if (result.reason === "unauthenticated") {
          setActionError("Please sign in again.");
        } else {
          setActionError("This ticket cannot be checked in.");
        }
      }
    });
  }

  const wrongEvent =
    lookup?.found === true && lookup.eventId !== eventId;

  const canAdmit =
    lookup?.found === true &&
    !wrongEvent &&
    lookup.authorized &&
    lookup.status === "VALID" &&
    !admitted;

  const getUserMediaStatus =
    typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia
      ? "available"
      : "MISSING";

  return (
    <div className="space-y-6">
      {view === "scanning" ? (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-black">
          <div id={elementId} className="min-h-[280px] w-full" />
        </div>
      ) : null}

      {view === "camera_unavailable" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-center">
          <p className="text-base font-semibold text-amber-900">
            Camera unavailable — check browser permissions
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Allow camera access for this site, or enter a token manually below.
          </p>
          <p className="mt-2 text-xs font-mono text-amber-800">
            getUserMedia: {getUserMediaStatus}
          </p>
          {cameraError ? (
            <p className="mt-2 break-all text-xs font-mono text-amber-700">{cameraError}</p>
          ) : null}
        </div>
      ) : null}

      {(view === "camera_unavailable" || view === "scanning") && (
        <form onSubmit={handleManualSubmit} className="space-y-2">
          <label htmlFor="manual-token" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Manual token (from QR URL)
          </label>
          <div className="flex gap-2">
            <input
              id="manual-token"
              type="text"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Paste token or full /checkin/… URL"
              className="min-h-[44px] flex-1 rounded-xl border border-zinc-200 px-3 text-base text-[#1C1C1A]"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-[#D4450A] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Look up
            </button>
          </div>
        </form>
      )}

      {view === "result" ? (
        <ResultCard
          lookup={lookup}
          foreignQr={foreignQr}
          wrongEvent={wrongEvent}
          admitted={admitted}
          canAdmit={canAdmit}
          isPending={isPending}
          actionError={actionError}
          onAdmit={handleAdmit}
          onScanNext={handleScanNext}
        />
      ) : null}

      <div className="mt-4 max-h-40 overflow-y-auto rounded-lg border border-zinc-300 bg-zinc-100 p-2">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Debug sequence (last {DEBUG_LOG_MAX})
        </p>
        {debugLog.length === 0 ? (
          <p className="font-mono text-[10px] text-zinc-400">—</p>
        ) : (
          debugLog.map((line, index) => (
            <p key={`${index}-${line}`} className="font-mono text-[10px] leading-snug text-zinc-700">
              {line}
            </p>
          ))
        )}
      </div>
    </div>
  );
}

function ResultCard({
  lookup,
  foreignQr,
  wrongEvent,
  admitted,
  canAdmit,
  isPending,
  actionError,
  onAdmit,
  onScanNext,
}: {
  lookup: TicketCheckInLookup | null;
  foreignQr: boolean;
  wrongEvent: boolean;
  admitted: boolean;
  canAdmit: boolean;
  isPending: boolean;
  actionError: string | null;
  onAdmit: (qrToken: string) => void;
  onScanNext: () => void;
}) {
  if (foreignQr) {
    return (
      <div className="space-y-4">
        <StatusBlock variant="invalid" title="❌ Invalid ticket" subtitle="This QR is not a LinkWe check-in code." />
        <ScanNextButton onClick={onScanNext} />
      </div>
    );
  }

  if (!lookup?.found) {
    return (
      <div className="space-y-4">
        <StatusBlock
          variant="invalid"
          title="❌ Invalid ticket"
          subtitle="This QR code is not recognized."
        />
        <ScanNextButton onClick={onScanNext} />
      </div>
    );
  }

  if (wrongEvent) {
    return (
      <div className="space-y-4">
        <StatusBlock
          variant="warning"
          title="⚠️ Wrong event"
          subtitle="This ticket is for a different event."
        />
        <TicketDetails lookup={lookup} />
        <ScanNextButton onClick={onScanNext} />
      </div>
    );
  }

  if (admitted) {
    return (
      <div className="space-y-4">
        <StatusBlock variant="success" title="✅ Checked in!" subtitle="Guest admitted successfully." />
        <TicketDetails lookup={lookup} />
        <ScanNextButton onClick={onScanNext} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TicketStatusBanner status={lookup.status} checkedInAt={lookup.checkedInAt} />
      <TicketDetails lookup={lookup} />
      {canAdmit ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => onAdmit(lookup.qrToken)}
          className="w-full rounded-2xl bg-[#D4450A] px-6 py-5 text-xl font-bold text-white shadow-lg hover:opacity-90 disabled:opacity-60 sm:text-2xl"
        >
          {isPending ? "Checking in…" : "Admit / Mark as used"}
        </button>
      ) : null}
      {lookup.found && !lookup.authorized && lookup.status === "VALID" ? (
        <p className="rounded-xl bg-zinc-100 px-4 py-3 text-center text-sm text-zinc-600">
          You are not authorized to admit tickets for this event.
        </p>
      ) : null}
      {actionError ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-800" role="alert">
          {actionError}
        </p>
      ) : null}
      <ScanNextButton onClick={onScanNext} />
    </div>
  );
}

function TicketStatusBanner({
  status,
  checkedInAt,
}: {
  status: "VALID" | "USED" | "CANCELLED" | "REFUNDED";
  checkedInAt: Date | null;
}) {
  if (status === "VALID") {
    return <StatusBlock variant="valid" title="✅ Valid" subtitle="Ready to admit" />;
  }
  if (status === "USED") {
    return (
      <StatusBlock
        variant="warning"
        title="⚠️ Already checked in"
        subtitle={formatCheckedInAt(checkedInAt)}
      />
    );
  }
  const label = status === "CANCELLED" ? "Cancelled" : "Refunded";
  return (
    <StatusBlock variant="invalid" title={`❌ ${label}`} subtitle="Do not admit" />
  );
}

function TicketDetails({ lookup }: { lookup: Extract<TicketCheckInLookup, { found: true }> }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-[#1C1C1A]">
      <p className="text-lg font-bold">{lookup.event.title}</p>
      <dl className="mt-3 grid gap-2 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase text-zinc-400">Holder</dt>
          <dd className="font-semibold">{lookup.holderName}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-zinc-400">Ticket type</dt>
          <dd>{lookup.ticketTypeName}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-zinc-400">Ticket number</dt>
          <dd className="font-mono text-base font-bold text-[#D4450A]">{lookup.ticketNumber}</dd>
        </div>
      </dl>
    </div>
  );
}

function StatusBlock({
  variant,
  title,
  subtitle,
}: {
  variant: "valid" | "warning" | "invalid" | "success";
  title: string;
  subtitle: string;
}) {
  const styles = {
    valid: "border-emerald-600 bg-emerald-50 text-emerald-900",
    success: "border-emerald-600 bg-emerald-50 text-emerald-900",
    warning: "border-amber-600 bg-amber-50 text-amber-900",
    invalid: "border-red-600 bg-red-50 text-red-900",
  }[variant];

  return (
    <div className={`rounded-2xl border-2 px-5 py-6 text-center ${styles}`}>
      <p className="text-2xl font-bold sm:text-3xl">{title}</p>
      <p className="mt-2 text-base font-medium opacity-90">{subtitle}</p>
    </div>
  );
}

function ScanNextButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border-2 border-[#D4450A] bg-white px-4 py-3 text-base font-semibold text-[#D4450A] hover:bg-orange-50"
    >
      Scan next
    </button>
  );
}
