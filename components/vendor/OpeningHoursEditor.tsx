"use client";

import { useState } from "react";

type TimeSlot = { from: string; to: string };
type DaySchedule = { closed: boolean; allDay: boolean; slots: TimeSlot[] };
type WeekSchedule = Record<string, DaySchedule>;

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

const DEFAULT_SLOT = { from: "08:00", to: "17:00" };

function defaultDaySchedule(day: (typeof DAYS)[number]): DaySchedule {
  const isWeekend = day === "saturday" || day === "sunday";
  return {
    closed: isWeekend,
    allDay: false,
    slots: isWeekend ? [] : [{ ...DEFAULT_SLOT }],
  };
}

/** In-memory only — coerces malformed DB JSON so slots is always an array. */
function normalizeHours(initialHours: WeekSchedule): WeekSchedule {
  const normalized: WeekSchedule = {};
  for (const day of DAYS) {
    const entry = initialHours[day];
    if (!entry || typeof entry !== "object") {
      normalized[day] = defaultDaySchedule(day);
      continue;
    }
    const closed = typeof entry.closed === "boolean" ? entry.closed : defaultDaySchedule(day).closed;
    const allDay = typeof entry.allDay === "boolean" ? entry.allDay : false;
    const slots = Array.isArray(entry.slots) ? entry.slots : [];
    normalized[day] = { closed, allDay, slots };
  }
  return normalized;
}

type Props = {
  initialHours: WeekSchedule;
};

export default function OpeningHoursEditor({ initialHours }: Props) {
  const [schedule, setSchedule] = useState<WeekSchedule>(() => normalizeHours(initialHours));

  function updateDay(day: string, patch: Partial<DaySchedule>) {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...patch },
    }));
  }

  function addSlot(day: string) {
    const current = schedule[day];
    if (current.slots.length >= 3) return;
    updateDay(day, { slots: [...current.slots, { ...DEFAULT_SLOT }] });
  }

  function removeSlot(day: string, index: number) {
    const current = schedule[day];
    const slots = current.slots.filter((_, i) => i !== index);
    updateDay(day, { slots });
  }

  function updateSlot(day: string, index: number, field: "from" | "to", value: string) {
    const current = schedule[day];
    const slots = current.slots.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot));
    updateDay(day, { slots });
  }

  function copyToAll(day: string) {
    const source = schedule[day];
    const updated: WeekSchedule = {};
    for (const d of DAYS) {
      updated[d] = { ...source, slots: source.slots.map((slot) => ({ ...slot })) };
    }
    setSchedule(updated);
  }

  function setWeekdays(day: string) {
    const source = schedule[day];
    const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const updated = { ...schedule };
    for (const d of weekdays) {
      updated[d] = { ...source, slots: source.slots.map((slot) => ({ ...slot })) };
    }
    setSchedule(updated);
  }

  return (
    <div className="flex flex-col gap-1">
      {DAYS.map((day) => {
        const d = schedule[day];
        const isWeekend = day === "saturday" || day === "sunday";

        return (
          <div
            key={day}
            className={`rounded-xl p-4 transition-colors ${
              d.closed ? "bg-zinc-50" : "border border-zinc-200 bg-white"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-24 text-sm font-semibold capitalize text-zinc-900">{day}</span>

                <button
                  type="button"
                  onClick={() => {
                    const nowClosed = !d.closed;
                    updateDay(day, {
                      closed: nowClosed,
                      slots: nowClosed ? [] : (d.slots ?? []).length > 0 ? (d.slots ?? []) : [{ ...DEFAULT_SLOT }],
                    });
                  }}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    d.closed
                      ? "border-zinc-200 bg-zinc-200 text-zinc-600"
                      : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full transition-colors ${d.closed ? "bg-zinc-500" : "bg-zinc-300"}`} />
                  Closed
                </button>

                {!d.closed ? (
                  <button
                    type="button"
                    onClick={() => updateDay(day, { allDay: !d.allDay })}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      d.allDay
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
                    }`}
                  >
                    <span
                      className={`h-3 w-3 rounded-full transition-colors ${d.allDay ? "bg-emerald-500" : "bg-zinc-300"}`}
                    />
                    24 hours
                  </button>
                ) : null}
              </div>

              {!d.closed && !d.allDay ? (
                <div className="flex items-center gap-1">
                  {!isWeekend ? (
                    <button
                      type="button"
                      onClick={() => setWeekdays(day)}
                      className="rounded-lg px-2 py-1 text-[10px] text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-[#D4450A]"
                    >
                      Copy to weekdays
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => copyToAll(day)}
                    className="rounded-lg px-2 py-1 text-[10px] text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-[#D4450A]"
                  >
                    Copy to all
                  </button>
                </div>
              ) : null}
            </div>

            {!d.closed && !d.allDay ? (
              <div className="ml-0 flex min-w-0 flex-col gap-2 sm:ml-32">
                {(d.slots ?? []).map((slot, i) => (
                  <div key={i} className="flex min-w-0 items-center gap-2">
                    <input
                      type="time"
                      value={slot.from}
                      onChange={(e) => updateSlot(day, i, "from", e.target.value)}
                      name={`hours_${day}_from_${i}`}
                      className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm focus:border-[#D4450A] focus:outline-none sm:w-36 sm:flex-none"
                    />
                    <span className="text-xs font-medium text-zinc-400">to</span>
                    <input
                      type="time"
                      value={slot.to}
                      onChange={(e) => updateSlot(day, i, "to", e.target.value)}
                      name={`hours_${day}_to_${i}`}
                      className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm focus:border-[#D4450A] focus:outline-none sm:w-36 sm:flex-none"
                    />
                    {i === 0 && (d.slots ?? []).length < 3 ? (
                      <button
                        type="button"
                        onClick={() => addSlot(day)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-lg leading-none text-zinc-500 transition-colors hover:bg-[#D4450A] hover:text-white"
                        title="Add time slot"
                      >
                        +
                      </button>
                    ) : null}
                    {i > 0 ? (
                      <button
                        type="button"
                        onClick={() => removeSlot(day, i)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm leading-none text-zinc-400 transition-colors hover:bg-red-100 hover:text-red-500"
                        title="Remove slot"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                ))}
                {(d.slots ?? []).length === 0 ? (
                  <button
                    type="button"
                    onClick={() => addSlot(day)}
                    className="flex items-center gap-2 text-sm text-[#D4450A] hover:underline"
                  >
                    + Add opening hours
                  </button>
                ) : null}
              </div>
            ) : null}

            {d.allDay && !d.closed ? (
              <p className="ml-28 text-xs font-medium text-emerald-600 sm:ml-32">Open 24 hours</p>
            ) : null}

            <input type="hidden" name={`hours_${day}_closed`} value={d.closed ? "on" : ""} />
            <input type="hidden" name={`hours_${day}_allDay`} value={d.allDay ? "on" : ""} />
            <input type="hidden" name={`hours_${day}_slotCount`} value={String((d.slots ?? []).length)} />
          </div>
        );
      })}
    </div>
  );
}
