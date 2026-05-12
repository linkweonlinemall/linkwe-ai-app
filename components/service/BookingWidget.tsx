"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import type {
  BookingPaymentMode,
  ProductAvailabilityOverride,
  ProductAvailabilitySchedule,
  ProductBookingSlot,
} from "@prisma/client";

import { createBooking, getSlotsForDate } from "@/app/actions/booking";
import { formatTime, getAvailableDates } from "@/lib/booking/slots";

type Props = {
  serviceId: string;
  serviceSlug: string;
  serviceName: string;
  price: number;
  serviceDuration: number;
  requiresDeposit: boolean;
  depositAmount: number | null;
  requiresApproval: boolean;
  bookingPaymentMode: BookingPaymentMode;
  advanceBookingDays: number;
  availabilitySchedule: ProductAvailabilitySchedule[];
  availabilityOverrides: ProductAvailabilityOverride[];
  existingSlots: ProductBookingSlot[];
};

type TimeSlot = { startTime: string; endTime: string; available: boolean };

function formatDateDisplay(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString("en-TT", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatDateShort(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString("en-TT", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function BookingWidget({
  serviceId,
  price,
  serviceDuration,
  requiresDeposit,
  depositAmount,
  requiresApproval,
  bookingPaymentMode,
  advanceBookingDays,
  availabilitySchedule,
  availabilityOverrides,
}: Props) {
  const router = useRouter();

  const availableDates = getAvailableDates(
    availabilitySchedule,
    availabilityOverrides,
    advanceBookingDays,
  );

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

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    void getSlotsForDate(serviceId, selectedDate).then((s) => {
      setSlots(s);
      setLoadingSlots(false);
    });
  }, [selectedDate, serviceId]);

  async function handleBook() {
    if (!selectedDate || !selectedSlot) return;
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
              ? `You are booked for ${formatDateDisplay(selectedDate!)} at ${formatTime(selectedSlot!.startTime)}.`
              : `Your request for ${formatDateDisplay(selectedDate!)} at ${formatTime(selectedSlot!.startTime)} has been sent. The provider will confirm shortly.`}
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
          <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-zinc-400">
            Select a date
          </p>
          {availableDates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 py-8 text-center">
              <p className="text-sm text-zinc-500">No available dates</p>
              <p className="mt-1 text-xs text-zinc-400">
                This provider has not set up their schedule yet.
              </p>
            </div>
          ) : (
            <div className="booking-calendar">
              <style>{`
  .booking-calendar .rdp-root {
    --rdp-accent-color: #D4450A;
    --rdp-accent-background-color: #fff5f0;
    --rdp-selected-border: 2px solid #D4450A;
    width: 100%;
    margin: 0;
  }
  .booking-calendar .rdp-month_grid {
    width: 100%;
  }
  .booking-calendar .rdp-day_button {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    font-size: 0.8rem;
  }
  .booking-calendar .rdp-selected .rdp-day_button {
    background-color: #D4450A !important;
    color: white !important;
    border: none !important;
  }
  .booking-calendar .rdp-day_button:hover:not(.rdp-disabled) {
    background-color: #fff5f0 !important;
    color: #D4450A !important;
  }
  .booking-calendar .rdp-disabled .rdp-day_button {
    opacity: 0.25;
    cursor: not-allowed;
  }
  .booking-calendar .rdp-month_caption {
    font-size: 0.875rem;
    font-weight: 700;
    color: #18181b;
    margin-bottom: 8px;
  }
  .booking-calendar .rdp-weekday {
    font-size: 0.7rem;
    font-weight: 600;
    color: #a1a1aa;
  }
  .booking-calendar .rdp-nav button:hover {
    background-color: #fff5f0 !important;
    color: #D4450A !important;
  }
`}</style>
              <DayPicker
                mode="single"
                selected={selectedDate ? new Date(selectedDate + "T00:00:00") : undefined}
                onSelect={(day: Date | undefined) => {
                  if (!day) return;
                  const dateStr = day.toISOString().split("T")[0];
                  if (!availableDates.includes(dateStr)) return;
                  setSelectedDate(dateStr);
                  setStep("time");
                }}
                disabled={(day: Date) => {
                  const dateStr = day.toISOString().split("T")[0];
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (day < today) return true;
                  return !availableDates.includes(dateStr);
                }}
                startMonth={new Date()}
                endMonth={(() => {
                  const d = new Date();
                  d.setDate(d.getDate() + (advanceBookingDays ?? 30));
                  return d;
                })()}
                classNames={{
                  root: "w-full",
                  month: "w-full",
                  month_grid: "w-full",
                }}
              />
            </div>
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
                  {formatTime(selectedSlot.startTime)} – {formatTime(selectedSlot.endTime)}
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
