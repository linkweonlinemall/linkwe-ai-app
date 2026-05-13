"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  addDateOverride,
  removeDateOverride,
  saveBookingSettings,
  saveWeeklySchedule,
} from "@/app/actions/availability";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    const hour = h.toString().padStart(2, "0");
    const min = m.toString().padStart(2, "0");
    TIME_OPTIONS.push(`${hour}:${min}`);
  }
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatDate(d: Date | string): string {
  const date = new Date(d);
  return date.toLocaleDateString("en-TT", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
    timeZone: "UTC",
  });
}

type DaySchedule = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMins: number;
  slotBufferMins: number;
  isActive: boolean;
};

type Override = {
  id: string;
  date: Date | string;
  isBlocked: boolean;
  customStartTime: string | null;
  customEndTime: string | null;
  reason: string | null;
};

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360];
const BUFFER_OPTIONS = [0, 5, 10, 15, 20, 30, 45, 60];

function nearestOption(value: number, options: number[]): number {
  return options.reduce((closest, opt) =>
    Math.abs(opt - value) < Math.abs(closest - value) ? opt : closest,
  options[0]!);
}

type Props = {
  serviceId: string;
  serviceDuration: number;
  initialSchedule: {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMins: number;
    slotBufferMins: number;
    isActive: boolean;
  }[];
  initialOverrides: Override[];
  initialSettings: {
    advanceBookingDays: number;
    cancellationHours: number;
    requiresApproval: boolean;
    maxGroupSize: number | null;
  };
};

export default function AvailabilityEditor({
  serviceId,
  serviceDuration,
  initialSchedule,
  initialOverrides,
  initialSettings,
}: Props) {
  const router = useRouter();

  // Build day schedule state — one entry per day
  const [schedule, setSchedule] = useState<DaySchedule[]>(() =>
    DAYS.map((day) => {
      const existing = initialSchedule.find((s) => s.dayOfWeek === day.value);
      return {
        dayOfWeek: day.value,
        startTime: existing?.startTime ?? "09:00",
        endTime: existing?.endTime ?? "17:00",
        slotDurationMins: nearestOption(
          existing?.slotDurationMins ?? serviceDuration,
          DURATION_OPTIONS,
        ),
        slotBufferMins: nearestOption(
          existing?.slotBufferMins ?? 0,
          BUFFER_OPTIONS,
        ),
        isActive: existing?.isActive ?? false,
      };
    }),
  );

  const [overrides, setOverrides] = useState<Override[]>(initialOverrides);
  useEffect(() => {
    setOverrides(initialOverrides);
  }, [initialOverrides]);

  const [settings, setSettings] = useState(initialSettings);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  const [overrideDate, setOverrideDate] = useState("");
  const [overrideType, setOverrideType] = useState<"block" | "custom">("block");
  const [overrideStart, setOverrideStart] = useState("09:00");
  const [overrideEnd, setOverrideEnd] = useState("17:00");
  const [overrideReason, setOverrideReason] = useState("");
  const [addingOverride, setAddingOverride] = useState(false);

  function updateDay(dayOfWeek: number, changes: Partial<DaySchedule>) {
    setSchedule((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...changes } : d)),
    );
  }

  async function handleSaveSchedule() {
    setSavingSchedule(true);
    const result = await saveWeeklySchedule(serviceId, schedule);
    if ("ok" in result && result.ok) {
      setScheduleSuccess(true);
      setTimeout(() => setScheduleSuccess(false), 3000);
      router.refresh();
    }
    setSavingSchedule(false);
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    const result = await saveBookingSettings(serviceId, settings);
    if ("ok" in result && result.ok) {
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
      router.refresh();
    }
    setSavingSettings(false);
  }

  async function handleAddOverride() {
    if (!overrideDate) return;
    setAddingOverride(true);
    const result = await addDateOverride(serviceId, {
      date: overrideDate,
      isBlocked: overrideType === "block",
      customStartTime: overrideType === "custom" ? overrideStart : undefined,
      customEndTime: overrideType === "custom" ? overrideEnd : undefined,
      reason: overrideReason || undefined,
    });
    if ("ok" in result && result.ok) {
      setOverrideDate("");
      setOverrideReason("");
      router.refresh();
    }
    setAddingOverride(false);
  }

  async function handleRemoveOverride(id: string) {
    const result = await removeDateOverride(id);
    if ("ok" in result && result.ok) {
      setOverrides((prev) => prev.filter((o) => o.id !== id));
      router.refresh();
    }
  }

  const firstActive = schedule.find((d) => d.isActive) ?? schedule[1]!;
  const slotDuration = firstActive.slotDurationMins;
  const slotBuffer = firstActive.slotBufferMins;

  function updateAllDays(changes: Partial<DaySchedule>) {
    setSchedule((prev) => prev.map((d) => ({ ...d, ...changes })));
  }

  const resolvedSlotDuration = DURATION_OPTIONS.includes(slotDuration)
    ? slotDuration
    : nearestOption(slotDuration, DURATION_OPTIONS);

  const resolvedSlotBuffer = BUFFER_OPTIONS.includes(slotBuffer)
    ? slotBuffer
    : nearestOption(slotBuffer, BUFFER_OPTIONS);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Weekly Schedule</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Set your working hours for each day of the week
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {DAYS.map((day) => {
            const d = schedule.find((s) => s.dayOfWeek === day.value)!;
            return (
              <div
                key={day.value}
                className={`rounded-xl border p-4 transition-all ${
                  d.isActive ? "border-zinc-200 bg-white" : "border-zinc-100 bg-zinc-50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => updateDay(day.value, { isActive: !d.isActive })}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      d.isActive ? "bg-[#D4450A]" : "bg-zinc-200"
                    }`}
                  >
                    <div
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        d.isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>

                  <span
                    className={`w-24 text-sm font-semibold ${d.isActive ? "text-zinc-900" : "text-zinc-400"}`}
                  >
                    {day.label}
                  </span>

                  {d.isActive ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <select
                        value={d.startTime}
                        onChange={(e) =>
                          updateDay(day.value, { startTime: e.target.value })
                        }
                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium focus:border-[#D4450A] focus:outline-none"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {formatTime(t)}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-zinc-400">to</span>
                      <select
                        value={d.endTime}
                        onChange={(e) => updateDay(day.value, { endTime: e.target.value })}
                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium focus:border-[#D4450A] focus:outline-none"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {formatTime(t)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-400">Closed</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-400">
            Slot settings — applies to all days
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Session duration (minutes)
              </label>
              <select
                value={resolvedSlotDuration}
                onChange={(e) =>
                  updateAllDays({ slotDurationMins: parseInt(e.target.value, 10) })
                }
                className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
              >
                {DURATION_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 > 0 ? ` ${m % 60}m` : ""}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Buffer between slots (minutes)
              </label>
              <select
                value={resolvedSlotBuffer}
                onChange={(e) =>
                  updateAllDays({ slotBufferMins: parseInt(e.target.value, 10) })
                }
                className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
              >
                {BUFFER_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m === 0 ? "No buffer" : `${m} min`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            With {resolvedSlotDuration} min sessions and {resolvedSlotBuffer} min buffer,
            each booking takes {resolvedSlotDuration + resolvedSlotBuffer} minutes of your
            calendar.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveSchedule}
          disabled={savingSchedule}
          className="mt-5 w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: "#D4450A" }}
        >
          {savingSchedule ? "Saving..." : scheduleSuccess ? "✓ Schedule saved" : "Save schedule"}
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="mb-5">
          <h2 className="text-base font-bold text-zinc-900">Date Overrides</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Block specific dates or set custom hours for a day
          </p>
        </div>

        {overrides.length > 0 ? (
          <div className="mb-5 flex flex-col gap-2">
            {overrides.map((o) => (
              <div
                key={o.id}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                  o.isBlocked
                    ? "border-red-100 bg-red-50"
                    : "border-blue-100 bg-blue-50"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{formatDate(o.date)}</p>
                  <p className="text-xs text-zinc-500">
                    {o.isBlocked
                      ? `Blocked${o.reason ? ` — ${o.reason}` : ""}`
                      : `Custom hours: ${formatTime(o.customStartTime!)} – ${formatTime(o.customEndTime!)}${o.reason ? ` — ${o.reason}` : ""}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRemoveOverride(o.id)}
                  className="text-xs font-medium text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-5 text-xs text-zinc-400">No date overrides yet.</p>
        )}

        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-400">
            Add override
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Date</label>
              <input
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOverrideType("block")}
                  className={`flex-1 rounded-lg border-2 py-2 text-xs font-semibold transition-all ${
                    overrideType === "block"
                      ? "border-red-400 bg-red-50 text-red-700"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                  }`}
                >
                  🚫 Block this day
                </button>
                <button
                  type="button"
                  onClick={() => setOverrideType("custom")}
                  className={`flex-1 rounded-lg border-2 py-2 text-xs font-semibold transition-all ${
                    overrideType === "custom"
                      ? "border-blue-400 bg-blue-50 text-blue-700"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                  }`}
                >
                  🕐 Custom hours
                </button>
              </div>
            </div>

            {overrideType === "custom" ? (
              <div className="flex items-center gap-2">
                <select
                  value={overrideStart}
                  onChange={(e) => setOverrideStart(e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs focus:border-[#D4450A] focus:outline-none"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {formatTime(t)}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-zinc-400">to</span>
                <select
                  value={overrideEnd}
                  onChange={(e) => setOverrideEnd(e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs focus:border-[#D4450A] focus:outline-none"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {formatTime(t)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Reason (optional)
              </label>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Public holiday, Staff training..."
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleAddOverride}
              disabled={!overrideDate || addingOverride}
              className="w-full rounded-xl border border-[#D4450A] py-2.5 text-sm font-semibold text-[#D4450A] transition-colors hover:bg-[#fff5f0] disabled:opacity-40"
            >
              {addingOverride ? "Adding..." : "Add override"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="mb-5">
          <h2 className="text-base font-bold text-zinc-900">Booking Settings</h2>
          <p className="mt-0.5 text-xs text-zinc-500">Control how customers can book this service</p>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
              How many days ahead can customers book?
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={settings.advanceBookingDays}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    advanceBookingDays: parseInt(e.target.value, 10) || 0,
                  }))
                }
                min={1}
                max={365}
                className="w-24 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
              />
              <span className="text-sm text-zinc-500">days in advance</span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Cancellation window (hours before appointment)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={settings.cancellationHours}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    cancellationHours: parseInt(e.target.value, 10) || 0,
                  }))
                }
                min={0}
                max={168}
                className="w-24 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
              />
              <span className="text-sm text-zinc-500">hours notice required to cancel</span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Max group size (optional)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={settings.maxGroupSize ?? ""}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    maxGroupSize: e.target.value ? parseInt(e.target.value, 10) : null,
                  }))
                }
                min={1}
                placeholder="1"
                className="w-24 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
              />
              <span className="text-sm text-zinc-500">
                people per booking (leave blank for 1)
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Require approval</p>
              <p className="text-xs text-zinc-500">
                You manually confirm each booking before it is accepted
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setSettings((s) => ({ ...s, requiresApproval: !s.requiresApproval }))
              }
              className={`relative h-6 w-11 rounded-full transition-colors ${
                settings.requiresApproval ? "bg-[#D4450A]" : "bg-zinc-200"
              }`}
            >
              <div
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  settings.requiresApproval ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={savingSettings}
          className="mt-5 w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: "#D4450A" }}
        >
          {savingSettings ? "Saving..." : settingsSuccess ? "✓ Settings saved" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
