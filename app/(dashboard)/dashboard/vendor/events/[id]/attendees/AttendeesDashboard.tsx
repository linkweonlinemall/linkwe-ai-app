"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { checkInTicket } from "@/app/actions/ticket-checkin";
import {
  getEventTicketCounts,
  searchEventTickets,
  setExternalSold,
  type AttendeeStatusFilter,
  type AttendeeTicketRow,
  type EventTicketCounts,
  type EventTicketTypeSales,
} from "@/app/actions/event-attendees";

type TicketsPage = {
  items: AttendeeTicketRow[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
};

type Props = {
  eventId: string;
  eventTitle: string;
  initialCounts: EventTicketCounts;
  initialTickets: TicketsPage;
};

const STATUS_FILTERS: { value: AttendeeStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "not_checked_in", label: "Not checked in" },
  { value: "checked_in", label: "Checked in" },
  { value: "cancelled_refunded", label: "Cancelled / Refunded" },
];

function formatCheckedInAt(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-TT", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function statusBadge(status: AttendeeTicketRow["status"]) {
  switch (status) {
    case "VALID":
      return {
        label: "Valid",
        className: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
      };
    case "USED":
      return {
        label: "Checked in",
        className: "bg-amber-50 text-amber-900 ring-amber-600/20",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        className: "bg-red-50 text-red-800 ring-red-600/20",
      };
    case "REFUNDED":
      return {
        label: "Refunded",
        className: "bg-zinc-100 text-zinc-700 ring-zinc-600/20",
      };
    default:
      return { label: status, className: "bg-zinc-100 text-zinc-700" };
  }
}

export function AttendeesDashboard({
  eventId,
  eventTitle: _eventTitle,
  initialCounts,
  initialTickets,
}: Props) {
  const [counts, setCounts] = useState(initialCounts);
  const [tickets, setTickets] = useState<AttendeeTicketRow[]>(initialTickets.items);
  const [total, setTotal] = useState(initialTickets.total);
  const [page, setPage] = useState(initialTickets.page);
  const [totalPages, setTotalPages] = useState(initialTickets.totalPages);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AttendeeStatusFilter>("all");
  const [listLoading, setListLoading] = useState(false);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const skipInitialSearchRef = useRef(true);

  const refreshCounts = useCallback(async () => {
    const result = await getEventTicketCounts(eventId);
    if ("counts" in result) setCounts(result.counts);
  }, [eventId]);

  const fetchTickets = useCallback(
    async (opts: {
      q: string;
      status: AttendeeStatusFilter;
      page: number;
      append: boolean;
    }) => {
      const reqId = ++requestIdRef.current;
      if (opts.append) setLoadMoreLoading(true);
      else setListLoading(true);
      setListError(null);

      try {
        const result = await searchEventTickets(eventId, {
          q: opts.q,
          status: opts.status,
          page: opts.page,
        });

        if (reqId !== requestIdRef.current) return;

        if ("error" in result) {
          setListError(result.error);
          return;
        }

        setTotal(result.total);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setTickets((prev) => (opts.append ? [...prev, ...result.items] : result.items));
      } catch {
        if (reqId === requestIdRef.current) {
          setListError("Could not load tickets. Please try again.");
        }
      } finally {
        if (reqId === requestIdRef.current) {
          setListLoading(false);
          setLoadMoreLoading(false);
        }
      }
    },
    [eventId],
  );

  useEffect(() => {
    if (skipInitialSearchRef.current && query === "" && statusFilter === "all") {
      skipInitialSearchRef.current = false;
      return;
    }
    skipInitialSearchRef.current = false;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchTickets({ q: query, status: statusFilter, page: 1, append: false });
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, statusFilter, fetchTickets]);

  function handleLoadMore() {
    if (page >= totalPages || loadMoreLoading) return;
    void fetchTickets({
      q: query,
      status: statusFilter,
      page: page + 1,
      append: true,
    });
  }

  function handleManualCheckIn(ticket: AttendeeTicketRow) {
    setCheckInError(null);
    setCheckingInId(ticket.id);
    startTransition(async () => {
      const result = await checkInTicket(ticket.qrToken);
      setCheckingInId(null);

      if (result.ok && result.justCheckedIn) {
        await refreshCounts();
        await fetchTickets({ q: query, status: statusFilter, page: 1, append: false });
        return;
      }

      if (!result.ok) {
        if (result.reason === "already_used") {
          const at =
            result.checkedInAt != null
              ? formatCheckedInAt(new Date(result.checkedInAt).toISOString())
              : "";
          setCheckInError(`Already checked in${at ? ` at ${at}` : ""}.`);
        } else if (result.reason === "unauthorized") {
          setCheckInError("You are not authorized to check in this ticket.");
        } else if (result.reason === "cancelled") {
          setCheckInError("This ticket was cancelled.");
        } else if (result.reason === "refunded") {
          setCheckInError("This ticket was refunded.");
        } else {
          setCheckInError("Could not check in this ticket.");
        }
        await refreshCounts();
        await fetchTickets({ q: query, status: statusFilter, page: 1, append: false });
      }
    });
  }

  const progressPct =
    counts.issued > 0 ? Math.min(100, Math.round((counts.checkedIn / counts.issued) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Check-in progress */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-zinc-500">Check-in progress</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-[#1C1C1A] sm:text-4xl">
          <span className="text-[#D4450A]">{counts.checkedIn}</span>
          <span className="text-zinc-400"> / </span>
          {counts.issued}
          <span className="ml-2 text-lg font-semibold text-zinc-500">checked in</span>
        </p>
        <div
          className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-100"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${counts.checkedIn} of ${counts.issued} checked in`}
        >
          <div
            className="h-full rounded-full bg-[#D4450A] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <CountChip label="Valid (not in)" value={counts.valid} />
          <CountChip label="Checked in" value={counts.used} accent />
          <CountChip label="Cancelled" value={counts.cancelled} />
          <CountChip label="Refunded" value={counts.refunded} />
        </div>

        <div className="mt-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Sales & capacity (informational)
          </p>
          <div className="grid gap-3 sm:grid-cols-1">
            <SalesStatBlock title="Sold so far">
              <p className="text-sm leading-relaxed text-zinc-700">
                <span className="font-bold text-[#D4450A]">{counts.linkweSoldTotal}</span>
                <span className="text-zinc-500"> on LinkWe</span>
                <span className="text-zinc-400"> + </span>
                <span className="font-bold text-[#D4450A]">{counts.externalSoldTotal}</span>
                <span className="text-zinc-500"> external / door</span>
                <span className="text-zinc-400"> = </span>
                <span className="font-bold text-[#1C1C1A]">{counts.realTotalSold}</span>
                <span className="text-zinc-500"> sold</span>
              </p>
            </SalesStatBlock>
            <SalesStatBlock title="Tickets sold vs available">
              <p className="text-2xl font-bold tracking-tight text-[#1C1C1A]">
                <span className="text-[#D4450A]">{counts.realTotalSold}</span>
                <span className="text-zinc-400"> of </span>
                {counts.ticketsAvailable}
                <span className="ml-1 text-base font-semibold text-zinc-500">tickets sold</span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Of the tickets you put up for sale across all types
              </p>
            </SalesStatBlock>
            {counts.eventCapacity != null ? (
              <SalesStatBlock title="Venue capacity">
                <p className="text-2xl font-bold tracking-tight text-[#1C1C1A]">
                  <span className="text-[#D4450A]">{counts.realTotalSold}</span>
                  <span className="text-zinc-400"> of </span>
                  {counts.eventCapacity}
                  <span className="ml-1 text-base font-semibold text-zinc-500">capacity</span>
                </p>
                <p className="mt-1 text-xs text-zinc-500">How full the venue is (all sales sources)</p>
              </SalesStatBlock>
            ) : null}
          </div>
          <p className="text-xs leading-relaxed text-zinc-400">
            Check-in counts above are LinkWe tickets only. External/door sales are tracking only —
            they don&apos;t block LinkWe sales or affect payouts.
          </p>
        </div>
      </section>

      <ExternalSalesSection
        eventId={eventId}
        byType={counts.byType}
        onSaved={async () => {
          await refreshCounts();
        }}
      />

      {/* Search + filter */}
      <section className="space-y-3">
        <label htmlFor="attendee-search" className="sr-only">
          Search attendees
        </label>
        <input
          id="attendee-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, or ticket number…"
          className="min-h-[44px] w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-[#1C1C1A] placeholder:text-zinc-400 focus:border-[#D4450A] focus:outline-none focus:ring-2 focus:ring-[#D4450A]/20"
          autoComplete="off"
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-[#D4450A] text-white"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {checkInError ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800" role="alert">
          {checkInError}
        </p>
      ) : null}

      {listError ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {listError}
        </p>
      ) : null}

      {/* Results */}
      <section aria-live="polite" aria-busy={listLoading}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {listLoading && tickets.length === 0
            ? "Searching…"
            : `${total} ticket${total !== 1 ? "s" : ""}`}
        </p>

        {tickets.length === 0 && !listLoading ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 py-12 text-center">
            <p className="text-sm font-medium text-zinc-600">No tickets match your search</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {tickets.map((ticket) => {
              const badge = statusBadge(ticket.status);
              const canCheckIn = ticket.status === "VALID";

              return (
                <li
                  key={ticket.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-[#1C1C1A]">
                        {ticket.holderName}
                      </p>
                      <p className="truncate text-sm text-zinc-500">{ticket.holderEmail}</p>
                      <p className="mt-2 font-mono text-sm font-bold text-[#D4450A]">
                        {ticket.ticketNumber}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">{ticket.ticketTypeName}</p>
                      {ticket.status === "USED" && ticket.checkedInAt ? (
                        <p className="mt-1 text-xs text-amber-800">
                          Checked in {formatCheckedInAt(ticket.checkedInAt)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      {canCheckIn ? (
                        <button
                          type="button"
                          disabled={isPending && checkingInId === ticket.id}
                          onClick={() => handleManualCheckIn(ticket)}
                          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[#D4450A] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {isPending && checkingInId === ticket.id ? "…" : "Check in"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {listLoading && tickets.length > 0 ? (
          <p className="mt-3 text-center text-sm text-zinc-500">Updating…</p>
        ) : null}

        {page < totalPages ? (
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadMoreLoading}
            className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-xl border-2 border-[#D4450A] bg-white text-sm font-semibold text-[#D4450A] transition-colors hover:bg-[#FEF0EB] disabled:opacity-50"
          >
            {loadMoreLoading ? "Loading…" : `Load more (${tickets.length} of ${total})`}
          </button>
        ) : null}
      </section>
    </div>
  );
}

function ExternalSalesSection({
  eventId,
  byType,
  onSaved,
}: {
  eventId: string;
  byType: EventTicketTypeSales[];
  onSaved: () => Promise<void>;
}) {
  if (byType.length === 0) return null;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-[#1C1C1A]">External / door sales</h2>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
        Tickets sold outside LinkWe (cash, door, other platforms). Informational only — does not
        affect payouts, checkout, or tickets remaining on the public event page.
      </p>
      <ul className="mt-4 space-y-3">
        {byType.map((row) => (
          <ExternalSoldRow key={row.ticketTypeId} eventId={eventId} row={row} onSaved={onSaved} />
        ))}
      </ul>
    </section>
  );
}

function ExternalSoldRow({
  eventId,
  row,
  onSaved,
}: {
  eventId: string;
  row: EventTicketTypeSales;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState(String(row.externalSold));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(String(row.externalSold));
  }, [row.externalSold]);

  async function handleSave() {
    const trimmed = value.trim();
    if (trimmed === "") {
      setError("Enter a whole number (0 or more)");
      return;
    }
    const parsed = parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed < 0 || String(parsed) !== trimmed) {
      setError("Enter a whole number (0 or more)");
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await setExternalSold(eventId, row.ticketTypeId, parsed);
    setSaving(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    setSaved(true);
    await onSaved();
    setTimeout(() => setSaved(false), 2500);
  }

  const parsedPreview = parseInt(value, 10);
  const previewExternal =
    Number.isFinite(parsedPreview) && parsedPreview >= 0 ? parsedPreview : row.externalSold;
  const previewReal = row.linkweSold + previewExternal;

  return (
    <li className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-[#1C1C1A]">{row.name}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            LinkWe sold: {row.linkweSold} · Real total:{" "}
            <span className="font-medium text-zinc-700">{previewReal}</span>
            {row.capacity > 0 ? ` / ${row.capacity} capacity` : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`external-${row.ticketTypeId}`}>
            External sold for {row.name}
          </label>
          <input
            id={`external-${row.ticketTypeId}`}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSaved(false);
              setError(null);
            }}
            className="min-h-[44px] w-24 rounded-xl border border-zinc-200 bg-white px-3 text-center text-base font-semibold text-[#1C1C1A] focus:border-[#D4450A] focus:outline-none focus:ring-2 focus:ring-[#D4450A]/20"
          />
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-[#D4450A] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "…" : "Save"}
          </button>
        </div>
      </div>
      {error ? <p className="mt-2 text-xs font-medium text-red-600">{error}</p> : null}
      {saved ? (
        <p className="mt-2 text-xs font-medium text-emerald-700">Saved</p>
      ) : null}
    </li>
  );
}

function SalesStatBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function CountChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <span
      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        accent ? "bg-[#FEF0EB] text-[#D4450A]" : "bg-zinc-100 text-zinc-700"
      }`}
    >
      {label}
      <span className="font-bold">{value}</span>
    </span>
  );
}
