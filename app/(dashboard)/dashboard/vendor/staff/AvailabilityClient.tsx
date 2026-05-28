"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  IconCalendar,
  IconClock,
  IconEdit,
  IconPlus,
  IconPlayerPause,
  IconTools,
  IconBuildingStore,
  IconScissors,
  IconHeart,
  IconCar,
  IconHome,
  IconSchool,
  IconDeviceDesktop,
  IconX,
} from "@tabler/icons-react";

import {
  toggleServiceAvailability,
  updateServiceAvailability,
  type ServiceAvailabilityUpdate,
} from "@/app/actions/services";
import { getAvailableSlots } from "@/lib/services/get-available-slots";
import {
  formatDayHoursLabel,
  formatScheduleSummary,
  formatTimeCompact,
  parseStoreOpeningHours,
  WEEKDAY_KEYS,
  WEEKDAY_SHORT,
  type WeekSchedule,
} from "@/lib/services/opening-hours";

export type VendorServiceAvailability = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  serviceType: string | null;
  durationMinutes: number;
  bufferMinutes: number;
  maxPerDay: number | null;
  useStoreHours: boolean;
  availableDays: string[];
  availableFrom: string | null;
  availableTo: string | null;
  isAvailable: boolean;
};

type Props = {
  openingHours: unknown;
  services: VendorServiceAvailability[];
};

const DURATION_PRESETS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "1.5 hours", value: 90 },
  { label: "2 hours", value: 120 },
  { label: "3 hours", value: 180 },
  { label: "4 hours", value: 240 },
  { label: "6 hours", value: 360 },
  { label: "8 hours", value: 480 },
] as const;

const BUFFER_PRESETS = [
  { label: "No buffer", value: 0 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hour", value: 60 },
] as const;

function categoryIcon(category: string | null) {
  const c = (category ?? "").toLowerCase();
  if (c.includes("beauty") || c.includes("salon") || c.includes("spa")) return IconScissors;
  if (c.includes("health") || c.includes("wellness")) return IconHeart;
  if (c.includes("auto") || c.includes("car")) return IconCar;
  if (c.includes("home") || c.includes("clean")) return IconHome;
  if (c.includes("education") || c.includes("tutor")) return IconSchool;
  if (c.includes("tech") || c.includes("it") || c.includes("virtual")) return IconDeviceDesktop;
  return IconTools;
}

function durationLabel(mins: number): string {
  const preset = DURATION_PRESETS.find((p) => p.value === mins);
  if (preset) return preset.label;
  if (mins < 60) return `${mins} min`;
  const h = mins / 60;
  return Number.isInteger(h) ? `${h} hr` : `${h.toFixed(1)} hr`;
}

function nextPreviewDate(availableDays: string[], useStoreHours: boolean): string {
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const key = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][d.getDay()]!;
    if (useStoreHours || availableDays.includes(key)) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
}

const CARD = "rounded-[12px] border-[0.5px] border-[#e8e8e8] bg-white";

export default function AvailabilityClient({ openingHours: rawHours, services: initialServices }: Props) {
  const openingHours = useMemo(() => parseStoreOpeningHours(rawHours), [rawHours]);
  const [services, setServices] = useState(initialServices);
  const [editing, setEditing] = useState<VendorServiceAvailability | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [durationMinutes, setDurationMinutes] = useState(60);
  const [customDuration, setCustomDuration] = useState("");
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [useStoreHours, setUseStoreHours] = useState(true);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [availableFrom, setAvailableFrom] = useState("09:00");
  const [availableTo, setAvailableTo] = useState("17:00");
  const [maxPerDay, setMaxPerDay] = useState<number | null>(null);

  const hasStoreHours = useMemo(() => {
    if (!openingHours) return false;
    return WEEKDAY_KEYS.some((key) => {
      const day = openingHours[key];
      return day && !day.closed && day.slots.length > 0;
    });
  }, [openingHours]);

  const openEdit = useCallback((service: VendorServiceAvailability) => {
    setEditing(service);
    setError(null);
    setDurationMinutes(service.durationMinutes);
    setCustomDuration("");
    setBufferMinutes(service.bufferMinutes);
    setUseStoreHours(service.useStoreHours);
    setAvailableDays([...service.availableDays]);
    setAvailableFrom(service.availableFrom ?? "09:00");
    setAvailableTo(service.availableTo ?? "17:00");
    setMaxPerDay(service.maxPerDay);
  }, []);

  const closeEdit = () => {
    setEditing(null);
    setError(null);
  };

  const resolvedDuration = useMemo(() => {
    const custom = parseInt(customDuration, 10);
    if (customDuration.trim() && !Number.isNaN(custom) && custom >= 15) return custom;
    return durationMinutes;
  }, [durationMinutes, customDuration]);

  const previewDate = useMemo(
    () => nextPreviewDate(availableDays, useStoreHours),
    [availableDays, useStoreHours],
  );

  const previewDayLabel = useMemo(() => {
    const [y, m, d] = previewDate.split("-").map(Number);
    const anchor = new Date(y, m - 1, d);
    return anchor.toLocaleDateString("en-TT", { weekday: "long" });
  }, [previewDate]);

  const previewSlots = useMemo(() => {
    if (!editing) return [];
    return getAvailableSlots(
      {
        durationMinutes: resolvedDuration,
        bufferMinutes,
        maxPerDay,
        useStoreHours,
        availableDays,
        availableFrom,
        availableTo,
        isAvailable: true,
      },
      previewDate,
      openingHours,
    );
  }, [
    editing,
    resolvedDuration,
    bufferMinutes,
    maxPerDay,
    useStoreHours,
    availableDays,
    availableFrom,
    availableTo,
    previewDate,
    openingHours,
  ]);

  async function handleToggle(serviceId: string, next: boolean) {
    const prev = services;
    setServices((list) => list.map((s) => (s.id === serviceId ? { ...s, isAvailable: next } : s)));
    const result = await toggleServiceAvailability(serviceId, next);
    if ("error" in result) {
      setServices(prev);
    }
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setError(null);

    const payload: ServiceAvailabilityUpdate = {
      durationMinutes: resolvedDuration,
      bufferMinutes,
      maxPerDay,
      useStoreHours,
      availableDays,
      availableFrom: useStoreHours ? null : availableFrom,
      availableTo: useStoreHours ? null : availableTo,
      isAvailable: editing.isAvailable,
    };

    const result = await updateServiceAvailability(editing.id, payload);
    setSaving(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    setServices((list) =>
      list.map((s) =>
        s.id === editing.id
          ? {
              ...s,
              durationMinutes: payload.durationMinutes,
              bufferMinutes: payload.bufferMinutes,
              maxPerDay: payload.maxPerDay,
              useStoreHours: payload.useStoreHours,
              availableDays: payload.availableDays,
              availableFrom: payload.availableFrom,
              availableTo: payload.availableTo,
            }
          : s,
      ),
    );
    closeEdit();
  }

  function toggleDay(day: string) {
    setAvailableDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  const durationSelectValue = DURATION_PRESETS.some((p) => p.value === durationMinutes)
    ? String(durationMinutes)
    : "custom";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Store hours */}
      <section className={`${CARD} p-4 md:p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#FEF0EB] text-[#D4450A]">
              <IconClock className="size-5" stroke={1.75} aria-hidden />
            </span>
            <div>
              <h2 className="text-[13px] font-semibold text-[#1C1C1A]">Store hours — your master schedule</h2>
              <p className="mt-0.5 text-[12px] text-[#7c7b77]">
                All services use these hours by default unless overridden
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/vendor/store/edit"
            className="shrink-0 text-[12px] font-semibold text-[#1A7FB5] hover:underline"
          >
            Edit hours
          </Link>
        </div>

        {hasStoreHours && openingHours ? (
          <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
            {WEEKDAY_KEYS.map((key, i) => {
              const day = openingHours[key];
              const label = formatDayHoursLabel(day ?? { closed: true, allDay: false, slots: [] });
              const open = !!label;
              return (
                <div
                  key={key}
                  className={`flex flex-col items-center rounded-lg px-1 py-2 text-center ${
                    open ? "bg-[#EAF3DE]" : "bg-[var(--color-background-secondary,#F7F5F2)]"
                  }`}
                >
                  <span
                    className={`text-[9px] font-semibold uppercase tracking-wide ${
                      open ? "text-[#3B6D11]" : "text-[#7c7b77]"
                    }`}
                  >
                    {WEEKDAY_SHORT[i]}
                  </span>
                  <span
                    className={`mt-0.5 text-[8px] leading-tight ${open ? "text-[#639922]" : "text-[#a8a7a3]"}`}
                  >
                    {open ? label : "Closed"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-[#F7F5F2] px-3 py-3 text-[12px] text-[#45443f]">
            No store hours set yet.{" "}
            <Link href="/dashboard/vendor/store/edit" className="font-semibold text-[#1A7FB5] hover:underline">
              Add your opening hours
            </Link>{" "}
            so customers know when you&apos;re open.
          </p>
        )}
      </section>

      {/* Services list */}
      <section className={CARD}>
        <div className="border-b border-[#e8e8e8] px-4 py-3.5 md:px-5">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#FEF0EB] text-[#D4450A]">
              <IconTools className="size-5" stroke={1.75} aria-hidden />
            </span>
            <div>
              <h2 className="text-[13px] font-semibold text-[#1C1C1A]">Your services</h2>
              <p className="text-[12px] text-[#7c7b77]">
                {services.length} service{services.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>

        {services.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[#7c7b77] md:px-5">
            No services yet. Add a bookable service to manage availability.
          </p>
        ) : (
          <ul>
            {services.map((service, index) => {
              const Icon = categoryIcon(service.category);
              const scheduleLabel = formatScheduleSummary(
                service.useStoreHours,
                service.availableDays,
                service.availableFrom,
                service.availableTo,
                openingHours,
              );
              return (
                <li
                  key={service.id}
                  className={`flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between md:px-4 ${
                    index > 0 ? "border-t border-[#e8e8e8]" : ""
                  }`}
                  style={{ padding: "14px 16px" }}
                >
                  <div className="flex min-w-0 flex-1 gap-3">
                    <span className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[#FEF0EB] text-[#D4450A]">
                      <Icon className="size-5" stroke={1.75} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[#1C1C1A]">{service.name}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#EAF3DE] px-2 py-0.5 text-[10px] font-medium text-[#3B6D11]">
                          <IconClock className="size-3" stroke={1.75} aria-hidden />
                          {durationLabel(service.durationMinutes)}
                        </span>
                        {service.bufferMinutes > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#FAEEDA] px-2 py-0.5 text-[10px] font-medium text-[#854F0B]">
                            <IconPlayerPause className="size-3" stroke={1.75} aria-hidden />
                            {service.bufferMinutes}m buffer
                          </span>
                        ) : null}
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${
                            service.useStoreHours
                              ? "bg-[#F7F5F2] text-[#45443f]"
                              : "bg-[#E6F1FB] text-[#185FA5]"
                          }`}
                        >
                          {service.useStoreHours ? (
                            <IconBuildingStore className="size-3" stroke={1.75} aria-hidden />
                          ) : (
                            <IconCalendar className="size-3" stroke={1.75} aria-hidden />
                          )}
                          {scheduleLabel}
                        </span>
                        {service.maxPerDay != null ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#EAF3DE] px-2 py-0.5 text-[10px] font-medium text-[#3B6D11]">
                            Max {service.maxPerDay}/day
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={service.isAvailable}
                        onChange={(e) => void handleToggle(service.id, e.target.checked)}
                        aria-label={`${service.name} available for booking`}
                      />
                      <span className="h-6 w-11 rounded-full bg-[#e8e8e8] transition-colors peer-checked:bg-[#D4450A] peer-focus-visible:ring-2 peer-focus-visible:ring-[#D4450A]/40" />
                      <span className="pointer-events-none absolute left-0.5 top-0.5 size-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
                    </label>
                    <button
                      type="button"
                      onClick={() => openEdit(service)}
                      className="flex size-7 items-center justify-center rounded-lg bg-[#F7F5F2] text-[#45443f] hover:bg-[#eceae6]"
                      aria-label={`Edit availability for ${service.name}`}
                    >
                      <IconEdit className="size-4" stroke={1.75} aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <Link
          href="/dashboard/vendor/services/new"
          className="flex items-center gap-2 border-t border-[#e8e8e8] px-4 py-3.5 text-[13px] font-medium text-[#1A7FB5] hover:bg-[#F7F5F2] md:px-4"
          style={{ padding: "14px 16px" }}
        >
          <IconPlus className="size-4" stroke={1.75} aria-hidden />
          Add another service
        </Link>
      </section>

      {/* Editor modal */}
      {editing ? (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="availability-editor-title"
        >
          <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-[14px] bg-white md:max-w-[440px] md:rounded-[14px]">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] px-4 py-3">
              <h3 id="availability-editor-title" className="text-[14px] font-semibold text-[#1C1C1A] pr-2">
                Edit availability — {editing.name}
              </h3>
              <button
                type="button"
                onClick={closeEdit}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[#45443f] hover:bg-[#F7F5F2]"
                aria-label="Close"
              >
                <IconX className="size-5" stroke={1.75} aria-hidden />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-[#45443f]">Duration</span>
                  <select
                    value={durationSelectValue}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setCustomDuration(String(durationMinutes));
                      } else {
                        setCustomDuration("");
                        setDurationMinutes(parseInt(e.target.value, 10));
                      }
                    }}
                    className="w-full rounded-lg border-[0.5px] border-[#e8e8e8] px-3 py-2 text-sm text-[#1C1C1A]"
                  >
                    {DURATION_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                    <option value="custom">Custom</option>
                  </select>
                  {durationSelectValue === "custom" ? (
                    <input
                      type="number"
                      min={15}
                      max={480}
                      step={15}
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      className="mt-2 w-full rounded-lg border-[0.5px] border-[#e8e8e8] px-3 py-2 text-sm"
                      placeholder="Minutes"
                    />
                  ) : null}
                </label>
                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-[#45443f]">Buffer</span>
                  <select
                    value={String(bufferMinutes)}
                    onChange={(e) => setBufferMinutes(parseInt(e.target.value, 10))}
                    className="w-full rounded-lg border-[0.5px] border-[#e8e8e8] px-3 py-2 text-sm text-[#1C1C1A]"
                  >
                    {BUFFER_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <p className="mb-2 text-[12px] font-medium text-[#45443f]">Availability type</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setUseStoreHours(true)}
                    className={`rounded-lg border-2 p-3 text-left transition-colors ${
                      useStoreHours
                        ? "border-[#D4450A] bg-[#FEF0EB]"
                        : "border-[#e8e8e8] bg-white hover:border-[#d4d3cf]"
                    }`}
                  >
                    <p className="text-[13px] font-semibold text-[#1C1C1A]">Follow store hours</p>
                    <p className="mt-1 text-[11px] text-[#7c7b77]">
                      {hasStoreHours ? "Uses your master store schedule" : "Set store hours first"}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseStoreHours(false)}
                    className={`rounded-lg border-2 p-3 text-left transition-colors ${
                      !useStoreHours
                        ? "border-[#D4450A] bg-[#FEF0EB]"
                        : "border-[#e8e8e8] bg-white hover:border-[#d4d3cf]"
                    }`}
                  >
                    <p className="text-[13px] font-semibold text-[#1C1C1A]">Custom schedule</p>
                    <p className="mt-1 text-[11px] text-[#7c7b77]">Pick specific days and times</p>
                  </button>
                </div>
              </div>

              {!useStoreHours ? (
                <div className="space-y-3">
                  <div>
                    <p className="mb-2 text-[12px] font-medium text-[#45443f]">Days</p>
                    <div className="grid grid-cols-7 gap-1">
                      {WEEKDAY_KEYS.map((day, i) => {
                        const active = availableDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={`rounded-md py-1.5 text-[10px] font-semibold sm:text-[11px] ${
                              active
                                ? "bg-[#D4450A] text-white"
                                : "border border-[#e8e8e8] bg-white text-[#45443f]"
                            }`}
                          >
                            {WEEKDAY_SHORT[i]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex-1">
                      <span className="mb-1 block text-[12px] font-medium text-[#45443f]">From</span>
                      <input
                        type="time"
                        value={availableFrom}
                        onChange={(e) => setAvailableFrom(e.target.value)}
                        className="w-full rounded-lg border-[0.5px] border-[#e8e8e8] px-3 py-2 text-sm"
                      />
                    </label>
                    <span className="mt-5 shrink-0 text-[12px] text-[#7c7b77]">to</span>
                    <label className="flex-1">
                      <span className="mb-1 block text-[12px] font-medium text-[#45443f]">To</span>
                      <input
                        type="time"
                        value={availableTo}
                        onChange={(e) => setAvailableTo(e.target.value)}
                        className="w-full rounded-lg border-[0.5px] border-[#e8e8e8] px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              <div className="rounded-lg bg-[#F7F5F2] px-3 py-2.5" style={{ padding: "10px 12px" }}>
                <p className="text-[11px] font-medium text-[#45443f]">
                  {previewDayLabel} — {previewSlots.filter((s) => s.available).length} slots available
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {previewSlots.length === 0 ? (
                    <span className="text-[11px] text-[#7c7b77]">No slots for this day</span>
                  ) : (
                    previewSlots.slice(0, 8).map((slot) => (
                      <span
                        key={slot.time}
                        className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                          slot.available
                            ? "bg-white text-[#3B6D11] border border-[#EAF3DE]"
                            : "bg-[#eceae6] text-[#a8a7a3] line-through"
                        }`}
                      >
                        {formatTimeCompact(slot.time)}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] font-medium text-[#45443f]">Max bookings per day</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setMaxPerDay((v) => (v == null ? 1 : Math.max(1, v - 1)))
                    }
                    className="flex size-8 items-center justify-center rounded-lg border border-[#e8e8e8] text-[#45443f] hover:bg-[#F7F5F2]"
                    aria-label="Decrease max"
                  >
                    −
                  </button>
                  <span className="min-w-[4.5rem] text-center text-sm font-semibold tabular-nums text-[#1C1C1A]">
                    {maxPerDay == null ? "Unlimited" : maxPerDay}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMaxPerDay((v) => (v == null ? 1 : v + 1))}
                    className="flex size-8 items-center justify-center rounded-lg border border-[#e8e8e8] text-[#45443f] hover:bg-[#F7F5F2]"
                    aria-label="Increase max"
                  >
                    +
                  </button>
                  {maxPerDay != null ? (
                    <button
                      type="button"
                      onClick={() => setMaxPerDay(null)}
                      className="text-[11px] font-medium text-[#1A7FB5] hover:underline"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-t border-[#e8e8e8] px-4 py-3">
              <button
                type="button"
                onClick={closeEdit}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-[#45443f] hover:bg-[#F7F5F2]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex-1 rounded-lg bg-[#D4450A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#B83A08] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save availability"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
