"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductBookingSlot } from "@prisma/client";

import { createBooking } from "@/app/actions/booking";
import { formatTime, generateSlotsFromStaff, getAvailableDatesFromStaff } from "@/lib/booking/slots";

type StaffMemberProp = {
  id: string;
  name: string;
  photoUrl: string | null;
  availability: {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMins: number;
    slotBufferMins: number;
    isActive: boolean;
  }[];
  overrides: {
    id: string;
    date: Date | string;
    isBlocked: boolean;
    customStartTime: string | null;
    customEndTime: string | null;
    reason: string | null;
  }[];
};

type Props = {
  serviceId: string;
  serviceSlug: string;
  serviceName: string;
  price: number;
  serviceDuration: number;
  requiresDeposit: boolean;
  depositAmount: number | null;
  requiresApproval: boolean;
  bookingPaymentMode: string;
  advanceBookingDays: number;
  staffMode: string;
  staff: StaffMemberProp[];
  existingSlots: ProductBookingSlot[];
};

type TimeSlot = {
  startTime: string;
  endTime: string;
  available: boolean;
  availableStaff?: string[];
};

function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-TT", {
    weekday: "long", month: "long", day: "numeric",
    timeZone: "UTC",
  });
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-TT", {
    weekday: "short", month: "short", day: "numeric",
    timeZone: "UTC",
  });
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function CustomCalendar({
  availableDates,
  selectedDate,
  onSelectDate,
}: {
  availableDates: string[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const availableSet = new Set(availableDates);

  // Get first day of month and total days
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((v) => v - 1);
    } else setViewMonth((v) => v - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((v) => v + 1);
    } else setViewMonth((v) => v + 1);
  }

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="w-full select-none">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-zinc-900">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="mb-1 grid grid-cols-7">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-1 text-center text-[10px] font-bold uppercase tracking-wide text-zinc-400">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;

          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const cellDate = new Date(viewYear, viewMonth, day);
          const isPast = cellDate < today;
          const isAvailable = availableSet.has(dateStr);
          const isSelected = selectedDate === dateStr;
          const isToday = cellDate.toDateString() === today.toDateString();

          return (
            <button
              key={i}
              type="button"
              disabled={isPast || !isAvailable}
              onClick={() => onSelectDate(dateStr)}
              className={`
                relative flex h-9 w-full items-center justify-center rounded-lg text-sm font-medium transition-all
                ${
                  isSelected
                    ? "bg-[#D4450A] text-white font-bold shadow-sm"
                    : isAvailable && !isPast
                      ? "bg-[#D4450A]/8 text-[#D4450A] font-semibold hover:bg-[#D4450A] hover:text-white cursor-pointer"
                      : isPast
                        ? "text-zinc-200 cursor-not-allowed"
                        : "text-zinc-300 cursor-not-allowed"
                }
                ${isToday && !isSelected ? "ring-1 ring-[#D4450A]/30" : ""}
              `}
            >
              {day}
              {isAvailable && !isPast && !isSelected ? (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#D4450A]" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function BookingWidget({
  serviceId,
  serviceName,
  price,
  serviceDuration,
  requiresDeposit,
  depositAmount,
  requiresApproval,
  bookingPaymentMode,
  advanceBookingDays,
  staff,
  existingSlots,
}: Props) {
  const router = useRouter();

  const [step, setStep] = useState<"date" | "time" | "confirm">("date");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"online" | "arrival">(
    bookingPaymentMode === "ONLINE_ONLY"
      ? "online"
      : bookingPaymentMode === "ON_ARRIVAL_ONLY"
        ? "arrival"
        : "arrival",
  );
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [confirmedDate, setConfirmedDate] = useState<string | null>(null);
  const [confirmedSlot, setConfirmedSlot] = useState<TimeSlot | null>(null);
  const [bookedSlots, setBookedSlots] = useState<{ date: string; startTime: string }[]>([]);

  const localBookedAsSlots = useMemo(
    () =>
      bookedSlots.map((b) => ({
        date: b.date,
        startTime: b.startTime,
        endTime: b.startTime,
        isAvailable: false,
        maxBookings: 1,
        currentBookings: 1,
        productId: serviceId,
        id: "local",
        updatedAt: new Date(),
        createdAt: new Date(),
      })),
    [bookedSlots, serviceId],
  );

  const availableDates = getAvailableDatesFromStaff(
    staff,
    [...existingSlots, ...localBookedAsSlots],
    advanceBookingDays,
    serviceDuration,
  );

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    const date = new Date(`${selectedDate}T12:00:00Z`);
    const allBookedSlots = [...existingSlots, ...localBookedAsSlots];
    const staffSlots = generateSlotsFromStaff(date, staff, allBookedSlots, serviceDuration);
    setSlots(staffSlots);
    setLoadingSlots(false);
  }, [selectedDate, staff, existingSlots, serviceDuration, localBookedAsSlots]);

  async function handleBook() {
    if (!selectedDate || !selectedSlot) {
      setBookingError("Please select a date and time before confirming.");
      return;
    }
    setBooking(true);
    setBookingError(null);

    const result = await createBooking({
      serviceId,
      date: selectedDate,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      customerNotes: notes || undefined,
      paymentMethod,
    });

    if ("error" in result) {
      if (result.error === "not_logged_in") {
        router.push("/login");
        return;
      }
      setBookingError(
        result.error === "slot_unavailable"
          ? "This slot is no longer available. Please choose another time."
          : "Something went wrong. Please try again.",
      );
      setBooking(false);
      return;
    }

    // If paying online, redirect to Stripe checkout
    if (paymentMethod === "online" && result.ok) {
      try {
        const stripeRes = await fetch("/api/booking-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: result.bookingId,
            serviceId,
            serviceName,
            price: requiresDeposit && depositAmount ? depositAmount : price,
            successUrl: `${window.location.origin}/booking-confirmation?bookingId=${result.bookingId}`,
            cancelUrl: window.location.href,
          }),
        });
        const stripeData = await stripeRes.json();
        if (stripeData.url) {
          window.location.href = stripeData.url;
          return;
        }
      } catch {
        setBookingError("Could not start payment. Please try again.");
        setBooking(false);
        return;
      }
    }

    setBookedSlots((prev) => [...prev, { date: selectedDate!, startTime: selectedSlot!.startTime }]);
    setConfirmedDate(selectedDate);
    setConfirmedSlot(selectedSlot);
    setConfirmed(true);
    setBookingStatus(result.status ?? null);
    setBooking(false);
  }

  if (confirmed) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-5 text-center">
          <p className="mb-2 text-3xl">✅</p>
          <p className="text-sm font-bold text-emerald-900">
            {bookingStatus === "CONFIRMED" ? "Booking confirmed!" : "Booking request sent!"}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-emerald-700">
            {bookingStatus === "CONFIRMED"
              ? `You are booked for ${formatDateDisplay(confirmedDate ?? "")} at ${confirmedSlot ? formatTime(confirmedSlot.startTime) : ""}.`
              : `Your request for ${formatDateDisplay(confirmedDate ?? "")} at ${confirmedSlot ? formatTime(confirmedSlot.startTime) : ""} has been sent. The provider will confirm shortly.`}
          </p>
          {paymentMethod === "arrival" ? (
            <p className="mt-2 text-xs font-semibold text-emerald-800">
              💵 Payment on arrival — TTD {price.toFixed(2)}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            setConfirmed(false);
            setStep("date");
            setSelectedDate(null);
            setSelectedSlot(null);
            setConfirmedDate(null);
            setConfirmedSlot(null);
            setNotes("");
          }}
          className="text-center text-xs font-medium text-zinc-500 hover:text-zinc-900"
        >
          Book another slot
        </button>
      </div>
    );
  }

  const steps = ["date", "time", "confirm"] as const;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                step === s
                  ? "bg-[#D4450A] text-white"
                  : i < steps.indexOf(step)
                    ? "bg-emerald-500 text-white"
                    : "bg-zinc-100 text-zinc-400"
              }`}
            >
              {i < steps.indexOf(step) ? "✓" : i + 1}
            </div>
            <span
              className={`text-[10px] font-medium capitalize ${step === s ? "text-zinc-900" : "text-zinc-400"}`}
            >
              {s === "confirm" ? "Confirm" : s === "date" ? "Date" : "Time"}
            </span>
            {i < 2 ? <div className="mx-1 h-px w-4 bg-zinc-200" /> : null}
          </div>
        ))}
      </div>

      {step === "date" ? (
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-400">
            Select a date
          </p>
          {availableDates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center">
              <span className="mb-3 block text-3xl">📅</span>
              <p className="text-sm font-semibold text-zinc-700">No available dates</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                This provider has not set their availability yet. Contact them directly to arrange a session.
              </p>
              <a
                href="mailto:?subject=Booking enquiry"
                className="mt-3 inline-block rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
              >
                Contact provider →
              </a>
            </div>
          ) : (
            <CustomCalendar
              availableDates={availableDates}
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setStep("time");
              }}
            />
          )}
        </div>
      ) : null}

      {step === "time" && selectedDate ? (
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Select a time
            </p>
            <button
              type="button"
              onClick={() => setStep("date")}
              className="text-xs text-[#D4450A] hover:underline"
            >
              ← Change date
            </button>
          </div>
          <p className="mb-2 text-xs font-semibold text-zinc-600">
            {formatDateDisplay(selectedDate)}
          </p>
          {loadingSlots ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-[#D4450A]" />
            </div>
          ) : slots.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 py-6 text-center">
              <p className="text-sm text-zinc-500">No available slots</p>
              <button
                type="button"
                onClick={() => setStep("date")}
                className="mt-2 text-xs text-[#D4450A] hover:underline"
              >
                Choose another date
              </button>
            </div>
          ) : (
            <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1">
              {slots.map((slot) => (
                <button
                  key={slot.startTime}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => {
                    setSelectedSlot(slot);
                    setStep("confirm");
                  }}
                  className={`rounded-xl border-2 px-3 py-2.5 text-center text-xs font-semibold transition-all ${
                    !slot.available
                      ? "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300 line-through"
                      : selectedSlot?.startTime === slot.startTime
                        ? "border-[#D4450A] bg-[#D4450A]/5 text-[#D4450A]"
                        : "border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  {formatTime(slot.startTime)}
                  <span className="block text-[9px] font-normal text-zinc-400">
                    {serviceDuration < 60
                      ? `${serviceDuration}m`
                      : `${Math.floor(serviceDuration / 60)}h${serviceDuration % 60 > 0 ? `${serviceDuration % 60}m` : ""}`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {step === "confirm" && selectedDate && selectedSlot ? (
        <div className="flex flex-col gap-3">
          <div className="mb-0.5 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Confirm booking
            </p>
            <button
              type="button"
              onClick={() => setStep("time")}
              className="text-xs text-[#D4450A] hover:underline"
            >
              ← Change time
            </button>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Date</span>
                <span className="font-semibold text-zinc-900">
                  {formatDateDisplay(selectedDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Time</span>
                <span className="font-semibold text-zinc-900">
                  {selectedSlot
                    ? `${formatTime(selectedSlot.startTime)} – ${formatTime(selectedSlot.endTime)}`
                    : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Duration</span>
                <span className="font-semibold text-zinc-900">
                  {serviceDuration < 60
                    ? `${serviceDuration} min`
                    : `${Math.floor(serviceDuration / 60)}h${serviceDuration % 60 > 0 ? ` ${serviceDuration % 60}m` : ""}`}
                </span>
              </div>
              <div className="mt-0.5 flex justify-between border-t border-zinc-200 pt-1.5">
                <span className="font-semibold text-zinc-700">Total</span>
                <span className="font-black text-[#D4450A]">TTD {price.toFixed(2)}</span>
              </div>
              {requiresDeposit && depositAmount ? (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Deposit required</span>
                  <span className="font-semibold text-amber-700">
                    TTD {depositAmount.toFixed(2)}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {bookingPaymentMode !== "ONLINE_ONLY" && bookingPaymentMode !== "ON_ARRIVAL_ONLY" ? (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-zinc-700">Payment method</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("arrival")}
                  className={`flex-1 rounded-xl border-2 px-3 py-2.5 text-center text-xs font-semibold transition-all ${
                    paymentMethod === "arrival"
                      ? "border-[#D4450A] bg-[#D4450A]/5 text-[#D4450A]"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                  }`}
                >
                  💵 Pay on arrival
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("online")}
                  className={`flex-1 rounded-xl border-2 px-3 py-2.5 text-center text-xs font-semibold transition-all ${
                    paymentMethod === "online"
                      ? "border-[#D4450A] bg-[#D4450A]/5 text-[#D4450A]"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                  }`}
                >
                  💳 Pay online
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5 text-center text-xs font-semibold text-zinc-700">
              {bookingPaymentMode === "ONLINE_ONLY"
                ? "💳 Online payment required"
                : "💵 Pay on arrival"}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Notes for provider (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests or information..."
              rows={2}
              className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs focus:border-[#D4450A] focus:outline-none"
            />
          </div>

          {requiresApproval ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ⏳ This booking requires provider approval. You will be notified once confirmed.
            </p>
          ) : null}

          {bookingError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{bookingError}</p>
          ) : null}

          <button
            type="button"
            onClick={() => void handleBook()}
            disabled={booking}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "#D4450A" }}
          >
            {booking
              ? "Booking..."
              : requiresApproval
                ? "Request booking"
                : paymentMethod === "online"
                  ? "Book & pay online"
                  : "Confirm booking"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
