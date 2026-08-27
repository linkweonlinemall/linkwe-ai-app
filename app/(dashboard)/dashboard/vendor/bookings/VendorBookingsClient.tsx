"use client";

import { useState } from "react";

import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

import { toast } from "sonner";

import { updateBookingMeetingLink, updateBookingStatus } from "@/app/actions/booking";

type Booking = {
  id: string;
  bookingDate: Date | string;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number;
  amountPaid: number | null;
  guestCount: number;
  customerNotes: string | null;
  vendorNotes: string | null;
  meetingLink: string | null;
  createdAt: Date | string;
  product: {
    name: string;
    slug: string;
    serviceType: string | null;
    serviceDuration: number | null;
    requiresDeposit: boolean;
    depositAmount: number | null;
  };
  customerId?: string;
  customer?: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
  } | null;
};

type Stats = {
  pending: number;
  upcoming: number;
  completed: number;
  total: number;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  PENDING: {
    label: "Pending",
    color: "bg-amber-50 text-amber-700 border-amber-100",
    dot: "bg-amber-500",
  },
  DEPOSIT_PAID: {
    label: "Deposit paid",
    color: "bg-blue-50 text-blue-700 border-blue-100",
    dot: "bg-blue-500",
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-emerald-50 text-emerald-700 border-emerald-100",
    dot: "bg-emerald-500",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-50 text-red-600 border-red-100",
    dot: "bg-red-500",
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-blue-50 text-blue-700 border-blue-100",
    dot: "bg-blue-500",
  },
  NO_SHOW: {
    label: "No show",
    color: "bg-zinc-100 text-zinc-500 border-zinc-200",
    dot: "bg-zinc-400",
  },
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

function formatBookingDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-TT", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

export default function VendorBookingsClient({
  bookings,
  stats,
}: {
  bookings: Booking[];
  stats: Stats;
}) {
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [localBookings, setLocalBookings] = useState<Booking[]>(bookings);
  const [vendorNoteInput, setVendorNoteInput] = useState<Record<string, string>>({});
  const [view, setView] = useState<"list" | "calendar">("list");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [editingMeetingLink, setEditingMeetingLink] = useState<string | null>(null);
  const [meetingLinkValue, setMeetingLinkValue] = useState<Record<string, string>>({});
  const [savingLink, setSavingLink] = useState<string | null>(null);

  const filtered =
    filter === "all" ? localBookings : localBookings.filter((b) => b.status === filter);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((b) => b.id)));
    }
  }

  async function handleBulkStatus(status: "CONFIRMED" | "CANCELLED") {
    if (selectedIds.size === 0) return;
    const ids = [...selectedIds];
    setBulkLoading(true);

    const succeededIds: string[] = [];
    const failedIds: string[] = [];
    let firstError = "";

    for (const id of ids) {
      const result = await updateBookingStatus(id, status, vendorNoteInput[id]);
      if (result.ok) {
        succeededIds.push(id);
      } else {
        failedIds.push(id);
        if (!firstError) firstError = "error" in result ? result.error : "Operation failed";
      }
    }

    if (succeededIds.length > 0) {
      setLocalBookings((prev) =>
        prev.map((b) => (succeededIds.includes(b.id) ? { ...b, status } : b)),
      );
    }
    setSelectedIds(new Set());
    setBulkLoading(false);

    const verb = status === "CANCELLED" ? "cancelled" : "confirmed";

    if (failedIds.length === 0) {
      toast.success(
        `${succeededIds.length} booking${succeededIds.length !== 1 ? "s" : ""} ${verb}.`,
      );
    } else if (succeededIds.length === 0) {
      toast.error(firstError);
    } else {
      toast.error(
        `${succeededIds.length} ${verb}, ${failedIds.length} failed: ${firstError}`,
      );
    }
  }

  function getBookingsForDate(date: Date): Booking[] {
    const dateStr = date.toISOString().split("T")[0];
    return localBookings.filter(
      (b) => new Date(b.bookingDate).toISOString().split("T")[0] === dateStr,
    );
  }

  function getDatesWithBookings(): Date[] {
    const seen = new Set<string>();
    const dates: Date[] = [];
    for (const b of localBookings) {
      const dateStr = new Date(b.bookingDate).toISOString().split("T")[0];
      if (!seen.has(dateStr)) {
        seen.add(dateStr);
        dates.push(new Date(`${dateStr}T00:00:00`));
      }
    }
    return dates;
  }

  async function handleSaveMeetingLink(bookingId: string) {
    setSavingLink(bookingId);
    const result = await updateBookingMeetingLink(
      bookingId,
      meetingLinkValue[bookingId] ?? "",
    );
    setSavingLink(null);
    if ("ok" in result && result.ok) {
      const raw = meetingLinkValue[bookingId] ?? "";
      const nextLink = raw.trim() || null;
      setLocalBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, meetingLink: nextLink } : b)),
      );
    }
    setEditingMeetingLink(null);
  }

  async function handleStatusUpdate(
    bookingId: string,
    status: "CONFIRMED" | "CANCELLED" | "NO_SHOW",
  ) {
    setLoadingId(bookingId);
    const result = await updateBookingStatus(
      bookingId,
      status,
      vendorNoteInput[bookingId],
    );
    if (result.ok) {
      setLocalBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                status,
                vendorNotes: vendorNoteInput[bookingId] ?? b.vendorNotes,
              }
            : b,
        ),
      );
      if (status === "CANCELLED") {
        const refunded = "refundedTTD" in result && result.refundedTTD > 0;
        toast.success(
          refunded
            ? `Booking cancelled. TTD ${(result as { refundedTTD: number }).refundedTTD.toFixed(2)} refunded.`
            : "Booking cancelled.",
        );
      } else if (status === "CONFIRMED") {
        toast.success("Booking confirmed.");
      } else {
        toast.success("No-show recorded.");
      }
    } else {
      const errorMsg = "error" in result ? result.error : "Something went wrong.";
      toast.error(errorMsg);
    }
    setLoadingId(null);
  }

  const isUpcoming = (b: Booking) => new Date(b.bookingDate) >= new Date();

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Pending",
            value: stats.pending,
            color: "text-amber-600",
            bg: "bg-amber-50 border-amber-100",
          },
          {
            label: "Upcoming",
            value: stats.upcoming,
            color: "text-emerald-600",
            bg: "bg-emerald-50 border-emerald-100",
          },
          {
            label: "Completed",
            value: stats.completed,
            color: "text-blue-600",
            bg: "bg-blue-50 border-blue-100",
          },
          { label: "Total", value: stats.total, color: "text-zinc-700", bg: "bg-zinc-50 border-zinc-200" },
        ].map((stat) => (
        <div key={stat.label} className={`min-w-0 rounded-2xl border px-3 py-3 sm:px-4 ${stat.bg}`}>
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-xs font-medium text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex items-center justify-between">
        <div className="flex overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <button
            type="button"
            onClick={() => setView("list")}
            className={`px-4 py-2 text-xs font-semibold transition-colors ${
              view === "list"
                ? "bg-[#D4450A] text-white"
                : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            📋 List
          </button>
          <button
            type="button"
            onClick={() => setView("calendar")}
            className={`px-4 py-2 text-xs font-semibold transition-colors ${
              view === "calendar"
                ? "bg-[#D4450A] text-white"
                : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            📅 Calendar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              filter === f.value
                ? "bg-[#D4450A] text-white shadow-sm"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {f.label}
            {f.value === "PENDING" && stats.pending > 0 ? (
              <span className="ml-1.5 rounded-full bg-white/30 px-1.5 text-[10px] font-bold">
                {stats.pending}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {selectedIds.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#D4450A]/20 bg-[#D4450A]/5 px-4 py-3">
          <span className="text-xs font-semibold text-[#D4450A]">
            {selectedIds.size} selected
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              disabled={bulkLoading}
              onClick={() => void handleBulkStatus("CONFIRMED")}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              ✓ Confirm all
            </button>
            <button
              type="button"
              disabled={bulkLoading}
              onClick={() => void handleBulkStatus("CANCELLED")}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              ✕ Cancel all
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      {view === "calendar" ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <style>{`
      .bookings-calendar .rdp-root {
        --rdp-accent-color: #D4450A;
        --rdp-accent-background-color: #fff5f0;
        margin: 0;
        width: 100%;
      }
      .bookings-calendar .rdp-month_grid { width: 100%; }
      .bookings-calendar .rdp-day_button {
        width: min(40px, 10vw); height: min(40px, 10vw);
        border-radius: 10px;
        font-size: 0.85rem;
        position: relative;
      }
      .bookings-calendar .rdp-selected .rdp-day_button {
        background-color: #D4450A !important;
        color: white !important;
      }
      .bookings-calendar .rdp-caption_label {
        font-size: 0.9rem;
        font-weight: 700;
        color: #18181b;
      }
      .bookings-calendar .rdp-weekday {
        font-size: 0.7rem;
        font-weight: 600;
        color: #a1a1aa;
      }
    `}</style>
          <div className="bookings-calendar">
            <DayPicker
              mode="single"
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              modifiers={{
                hasBooking: getDatesWithBookings(),
              }}
              modifiersStyles={{
                hasBooking: {
                  fontWeight: "900",
                  color: "#D4450A",
                  textDecoration: "underline",
                },
              }}
              onSelect={(day: Date | undefined) => {
                if (!day) return;
                const dayBookings = getBookingsForDate(day);
                if (dayBookings.length > 0) {
                  setFilter("all");
                  setView("list");
                  setExpandedId(dayBookings[0]?.id ?? null);
                }
              }}
              styles={{
                root: { width: "100%" },
                month: { width: "100%" },
              }}
            />
          </div>

          <div className="mt-4 border-t border-zinc-100 pt-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-400">
              Bookings this month
            </p>
            {localBookings
              .filter((b) => {
                const d = new Date(b.bookingDate);
                return (
                  d.getMonth() === calendarMonth.getMonth() &&
                  d.getFullYear() === calendarMonth.getFullYear()
                );
              })
              .sort((a, b) => new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime())
              .map((booking) => {
                const statusCfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.PENDING;
                return (
                  <div
                    key={booking.id}
                    className="mb-2 flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5"
                  >
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white">
                      <p className="text-sm font-black leading-none text-zinc-900">
                        {new Date(booking.bookingDate).getUTCDate()}
                      </p>
                      <p className="text-[9px] font-semibold uppercase text-zinc-400">
                        {new Date(booking.bookingDate).toLocaleDateString("en-TT", {
                          month: "short",
                          timeZone: "UTC",
                        })}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-zinc-900">{booking.product.name}</p>
                      <p className="text-[10px] text-zinc-500">
                        {formatTime(booking.startTime)} · {booking.customer?.fullName ?? "Customer"}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-16 text-center">
          <span className="mb-3 text-4xl">📅</span>
          <p className="text-sm font-semibold text-zinc-700">No bookings found</p>
          <p className="mt-1 text-xs text-zinc-400">
            {filter === "PENDING" ? "No pending requests right now" : "Nothing here yet"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={selectedIds.size === filtered.length && filtered.length > 0}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded accent-[#D4450A]"
            />
            <span className="text-xs text-zinc-500">Select all</span>
          </div>

          {filtered.map((booking) => {
            const statusCfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.PENDING;
            const expanded = expandedId === booking.id;
            const loading = loadingId === booking.id;
            const upcoming = isUpcoming(booking);
            const isSelected = selectedIds.has(booking.id);

            return (
              <div
                key={booking.id}
                className={`min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${
                  isSelected ? "border-[#D4450A]/40 ring-1 ring-[#D4450A]/20" : "border-zinc-200"
                }`}
              >
                <div className="flex min-w-0 items-start gap-2 p-3 sm:gap-3 sm:p-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(booking.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 h-4 w-4 shrink-0 rounded accent-[#D4450A]"
                  />

                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : booking.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left sm:gap-4"
                  >
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-zinc-100 sm:h-14 sm:w-14">
                      <p className="text-lg font-black leading-none text-zinc-900">
                        {new Date(booking.bookingDate).getUTCDate()}
                      </p>
                      <p className="text-[10px] font-semibold uppercase text-zinc-400">
                        {new Date(booking.bookingDate).toLocaleDateString("en-TT", {
                          month: "short",
                          timeZone: "UTC",
                        })}
                      </p>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-zinc-900">{booking.product.name}</p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusCfg.color}`}
                        >
                          <span
                            className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${statusCfg.dot}`}
                          />
                          {statusCfg.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
                        {" · "}
                        {booking.customer?.fullName ?? "Customer"}
                      </p>
                      {booking.status === "DEPOSIT_PAID" ? (
                        <p className="mt-0.5 text-xs font-semibold text-[#D4450A]">
                          TTD {(booking.amountPaid ?? 0).toFixed(2)} deposit · TTD{" "}
                          {Math.max(0, booking.totalPrice - (booking.amountPaid ?? 0)).toFixed(2)} due
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs font-semibold text-[#D4450A]">
                          TTD {(booking.amountPaid ?? booking.totalPrice).toFixed(2)}
                        </p>
                      )}
                    </div>

                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`mt-1 shrink-0 text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>

                {expanded ? (
                  <div className="border-t border-zinc-100 px-4 pb-4 pt-3">
                    <div className="mb-4 grid grid-cols-1 gap-3 text-xs min-[430px]:grid-cols-2 min-[430px]:gap-x-6 min-[430px]:gap-y-2">
                      <div>
                        <p className="text-zinc-400">Date</p>
                        <p className="break-all font-semibold text-zinc-900">
                          {formatBookingDate(booking.bookingDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-400">Time</p>
                        <p className="font-semibold text-zinc-900">
                          {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-400">Customer</p>
                        <p className="font-semibold text-zinc-900">
                          {booking.customer?.fullName ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-400">Email</p>
                        <p className="font-semibold text-zinc-900">
                          {booking.customer?.email ?? "—"}
                        </p>
                      </div>
                      {booking.customer?.phone ? (
                        <div>
                          <p className="text-zinc-400">Phone</p>
                          <p className="font-semibold text-zinc-900">{booking.customer.phone}</p>
                        </div>
                      ) : null}
                      {booking.guestCount > 1 ? (
                        <div>
                          <p className="text-zinc-400">Guests</p>
                          <p className="font-semibold text-zinc-900">{booking.guestCount}</p>
                        </div>
                      ) : null}
                      {booking.customerNotes ? (
                        <div className="min-[430px]:col-span-2">
                          <p className="text-zinc-400">Customer notes</p>
                          <p className="font-semibold text-zinc-900">{booking.customerNotes}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="mb-3">
                      <label className="mb-1 block text-xs font-semibold text-zinc-700">
                        Your notes (optional)
                      </label>
                      <textarea
                        value={vendorNoteInput[booking.id] ?? booking.vendorNotes ?? ""}
                        onChange={(e) =>
                          setVendorNoteInput((prev) => ({
                            ...prev,
                            [booking.id]: e.target.value,
                          }))
                        }
                        placeholder="Add a private note..."
                        rows={2}
                        className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs focus:border-[#D4450A] focus:outline-none"
                      />
                    </div>

                    {booking.product.serviceType === "VIRTUAL" ? (
                      <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
                        <div className="mb-1.5 flex items-center justify-between">
                          <p className="text-xs font-bold text-blue-900">💻 Meeting link</p>
                          {editingMeetingLink !== booking.id ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMeetingLink(booking.id);
                                setMeetingLinkValue((prev) => ({
                                  ...prev,
                                  [booking.id]: booking.meetingLink ?? "",
                                }));
                              }}
                              className="text-xs font-medium text-blue-700 hover:underline"
                            >
                              {booking.meetingLink ? "Edit" : "Add link"}
                            </button>
                          ) : null}
                        </div>
                        {editingMeetingLink === booking.id ? (
                          <div className="flex flex-col gap-2">
                            <input
                              type="url"
                              value={meetingLinkValue[booking.id] ?? ""}
                              onChange={(e) =>
                                setMeetingLinkValue((prev) => ({
                                  ...prev,
                                  [booking.id]: e.target.value,
                                }))
                              }
                              placeholder="https://zoom.us/j/..."
                              className="w-full rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs focus:border-blue-400 focus:outline-none"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => void handleSaveMeetingLink(booking.id)}
                                disabled={savingLink === booking.id}
                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                {savingLink === booking.id ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingMeetingLink(null)}
                                className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : booking.meetingLink ? (
                          <a
                            href={booking.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate text-xs font-medium text-blue-700 hover:underline"
                          >
                            {booking.meetingLink}
                          </a>
                        ) : (
                          <p className="text-xs text-blue-600">No meeting link added yet</p>
                        )}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      {booking.status === "PENDING" ? (
                        <>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => void handleStatusUpdate(booking.id, "CONFIRMED")}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            ✓ Confirm
                          </button>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => void handleStatusUpdate(booking.id, "CANCELLED")}
                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                          >
                            ✕ Decline
                          </button>
                        </>
                      ) : null}
                      {["CONFIRMED", "DEPOSIT_PAID"].includes(booking.status) && upcoming ? (
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => void handleStatusUpdate(booking.id, "CANCELLED")}
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                        >
                          Cancel booking
                        </button>
                      ) : null}
                      {["CONFIRMED", "DEPOSIT_PAID"].includes(booking.status) && !upcoming ? (
                        <>
                          <span className="text-xs text-zinc-400">
                            Awaiting customer confirmation — you&apos;ll be paid when they
                            confirm, or automatically after 48h.
                          </span>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => void handleStatusUpdate(booking.id, "NO_SHOW")}
                            className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
                          >
                            No show
                          </button>
                        </>
                      ) : null}
                      {loading ? (
                        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                          Updating...
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
