import type { EventCheckInReportResult } from "@/app/actions/ticket-checkin";

function formatScanTime(iso: string | null): string {
  if (!iso) return "unknown time";
  return new Date(iso).toLocaleString("en-TT", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDeviceDisplay(opts: {
  label: string | null | undefined;
  deviceId: string | null | undefined;
  source: string | null | undefined;
}): string {
  if (opts.label?.trim()) return opts.label.trim();
  if (opts.source === "ONLINE") return "Online check-in";
  if (opts.deviceId) {
    const short = opts.deviceId.length > 6 ? opts.deviceId.slice(-6) : opts.deviceId;
    return `device ${short}`;
  }
  if (opts.source === "OFFLINE") return "unknown device";
  return "Online check-in";
}

type Props = {
  report: Extract<EventCheckInReportResult, { ok: true }>;
};

export function DuplicateScansReport({ report }: Props) {
  const { duplicates, summary } = report;

  if (duplicates.length === 0) {
    return (
      <p className="text-sm text-zinc-400">
        No duplicate scans
        {summary.totalOfflineSynced > 0
          ? ` · ${summary.totalOfflineSynced} offline check-in${summary.totalOfflineSynced === 1 ? "" : "s"} synced`
          : ""}
      </p>
    );
  }

  const uniqueTicketCount = new Set(duplicates.map((d) => d.ticketNumber)).size;

  return (
    <section className="rounded-2xl border border-[#D4450A]/30 bg-[#D4450A]/5 p-5 shadow-sm">
      <h2 className="text-lg font-bold text-[#D4450A]">⚠️ Duplicate scans detected</h2>
      <p className="mt-1 text-sm text-zinc-700">
        {uniqueTicketCount} ticket{uniqueTicketCount === 1 ? "" : "s"} were scanned more than once.
        First scan counted; later scans flagged.
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        {summary.totalDuplicates} duplicate attempt{summary.totalDuplicates === 1 ? "" : "s"}
        {summary.totalOfflineSynced > 0
          ? ` · ${summary.totalOfflineSynced} offline check-in${summary.totalOfflineSynced === 1 ? "" : "s"} synced`
          : ""}
      </p>

      <ul className="mt-4 space-y-3">
        {duplicates.map((entry, index) => (
          <li
            key={`${entry.ticketNumber}-${entry.duplicateScannedAt}-${index}`}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-[#1C1C1A]"
          >
            <p className="font-semibold">
              <span className="font-mono text-[#D4450A]">{entry.ticketNumber}</span>
              <span className="text-zinc-400"> · </span>
              {entry.holderName}
            </p>
            <dl className="mt-2 space-y-1 text-zinc-600">
              <div>
                <dt className="sr-only">Admitted</dt>
                <dd>
                  Admitted {formatScanTime(entry.admittedScannedAt)} ·{" "}
                  {formatDeviceDisplay({
                    label: entry.admittedDeviceLabel,
                    deviceId: entry.admittedDeviceId,
                    source: entry.admittedSource,
                  })}
                </dd>
              </div>
              <div>
                <dt className="sr-only">Duplicate attempt</dt>
                <dd>
                  Duplicate attempt {formatScanTime(entry.duplicateScannedAt)} ·{" "}
                  {formatDeviceDisplay({
                    label: entry.duplicateDeviceLabel,
                    deviceId: entry.duplicateDeviceId,
                    source: entry.duplicateSource,
                  })}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
