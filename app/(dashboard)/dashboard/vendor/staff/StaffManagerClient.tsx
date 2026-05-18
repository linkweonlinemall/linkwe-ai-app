"use client";
import { useState } from "react";
import type { StaffMode } from "@prisma/client";
import {
  createStaffMember,
  deleteStaffMember,
  updateStaffMember,
  updateStaffMode,
  updateStaffServices,
  saveStaffAvailability,
  addStaffOverride,
  removeStaffOverride,
} from "@/app/actions/staff";

const DAYS = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 0, label: "Sunday", short: "Sun" },
];

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_OPTIONS.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
  }
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-TT", {
    weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
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

type StaffMember = {
  id: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  isActive: boolean;
  services: { serviceId: string; service: { name: string } }[];
  availability: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMins: number;
    slotBufferMins: number;
    isActive: boolean;
  }[];
  overrides: Override[];
};

type Props = {
  initialStaff: StaffMember[];
  initialStaffMode: StaffMode;
  services: { id: string; name: string }[];
};

function ScheduleEditor({
  member,
  onSaved,
}: {
  member: StaffMember;
  onSaved: () => void;
}) {
  const [schedule, setSchedule] = useState<DaySchedule[]>(
    DAYS.map((day) => {
      const existing = member.availability.find((a) => a.dayOfWeek === day.value);
      return {
        dayOfWeek: day.value,
        startTime: existing?.startTime ?? "09:00",
        endTime: existing?.endTime ?? "17:00",
        slotDurationMins: existing?.slotDurationMins ?? 60,
        slotBufferMins: existing?.slotBufferMins ?? 0,
        isActive: existing?.isActive ?? false,
      };
    })
  );
  const [saving, setSaving] = useState(false);

  function toggleDay(dayValue: number) {
    setSchedule((prev) =>
      prev.map((d) =>
        d.dayOfWeek === dayValue ? { ...d, isActive: !d.isActive } : d
      )
    );
  }

  function updateDay(dayValue: number, field: keyof DaySchedule, value: string | number | boolean) {
    setSchedule((prev) =>
      prev.map((d) => (d.dayOfWeek === dayValue ? { ...d, [field]: value } : d))
    );
  }

  function setAllDuration(mins: number) {
    setSchedule((prev) => prev.map((d) => ({ ...d, slotDurationMins: mins })));
  }

  function setAllBuffer(mins: number) {
    setSchedule((prev) => prev.map((d) => ({ ...d, slotBufferMins: mins })));
  }

  async function handleSave() {
    setSaving(true);
    await saveStaffAvailability(member.id, schedule);
    setSaving(false);
    onSaved();
  }

  const activeDays = schedule.filter((d) => d.isActive);

  return (
    <div className="flex flex-col gap-4">
      {/* Day toggles */}
      <div className="flex flex-col gap-2">
        {DAYS.map((day) => {
          const d = schedule.find((s) => s.dayOfWeek === day.value)!;
          return (
            <div
              key={day.value}
              className={`rounded-xl border p-3 transition-all ${
                d.isActive ? "border-zinc-200 bg-white" : "border-zinc-100 bg-zinc-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    d.isActive ? "bg-[#D4450A]" : "bg-zinc-200"
                  }`}
                >
                  <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    d.isActive ? "translate-x-5" : "translate-x-1"
                  }`} />
                </button>
                <span className={`w-24 text-sm font-semibold ${
                  d.isActive ? "text-zinc-900" : "text-zinc-400"
                }`}>
                  {day.label}
                </span>
                {d.isActive ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <select
                      value={d.startTime}
                      onChange={(e) => updateDay(day.value, "startTime", e.target.value)}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs focus:border-[#D4450A] focus:outline-none"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>{formatTime(t)}</option>
                      ))}
                    </select>
                    <span className="text-xs text-zinc-400">to</span>
                    <select
                      value={d.endTime}
                      onChange={(e) => updateDay(day.value, "endTime", e.target.value)}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs focus:border-[#D4450A] focus:outline-none"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>{formatTime(t)}</option>
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

      {/* Session settings */}
      {activeDays.length > 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-400">
            Session settings — applies to all active days
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Session duration
              </label>
              <select
                value={schedule.find((d) => d.isActive)?.slotDurationMins ?? 60}
                onChange={(e) => setAllDuration(parseInt(e.target.value))}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
              >
                {[15, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360].map((m) => (
                  <option key={m} value={m}>
                    {m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 > 0 ? ` ${m % 60}m` : ""}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Buffer between slots
              </label>
              <select
                value={schedule.find((d) => d.isActive)?.slotBufferMins ?? 0}
                onChange={(e) => setAllBuffer(parseInt(e.target.value))}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
              >
                {[0, 5, 10, 15, 20, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>
                    {m === 0 ? "No buffer" : `${m} min`}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-400">Gap between appointments</p>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
      >
        {saving ? "Saving schedule..." : "Save schedule"}
      </button>
    </div>
  );
}

function BlockedDatesEditor({ member }: { member: StaffMember }) {
  const [overrides, setOverrides] = useState<Override[]>(member.overrides ?? []);
  const [date, setDate] = useState("");
  const [type, setType] = useState<"block" | "custom">("block");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [reason, setReason] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!date) return;
    setAdding(true);
    const result = await addStaffOverride(member.id, {
      date,
      isBlocked: type === "block",
      customStartTime: type === "custom" ? start : undefined,
      customEndTime: type === "custom" ? end : undefined,
      reason: reason || undefined,
    });
    if ("ok" in result && result.ok && "id" in result) {
      setOverrides((prev) => [
        ...prev,
        {
          id: result.id,
          date: new Date(date + "T12:00:00Z"),
          isBlocked: type === "block",
          customStartTime: type === "custom" ? start : null,
          customEndTime: type === "custom" ? end : null,
          reason: reason || null,
        },
      ]);
      setDate("");
      setReason("");
    }
    setAdding(false);
  }

  async function handleRemove(overrideId: string) {
    await removeStaffOverride(overrideId);
    setOverrides((prev) => prev.filter((o) => o.id !== overrideId));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Existing overrides */}
      {overrides.length > 0 ? (
        <div className="flex flex-col gap-2">
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
                <p className="text-sm font-semibold text-zinc-900">
                  {formatDate(o.date)}
                </p>
                <p className="text-xs text-zinc-500">
                  {o.isBlocked
                    ? `Blocked${o.reason ? ` — ${o.reason}` : ""}`
                    : `Custom: ${formatTime(o.customStartTime ?? "09:00")} – ${formatTime(o.customEndTime ?? "17:00")}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(o.id)}
                className="text-xs font-semibold text-red-500 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-400">No blocked dates yet.</p>
      )}

      {/* Add new override */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-400">
          Add blocked date
        </p>
        <div className="flex flex-col gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            {(["block", "custom"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-xl border-2 py-2 text-xs font-bold transition-all ${
                  type === t
                    ? t === "block"
                      ? "border-red-400 bg-red-50 text-red-700"
                      : "border-blue-400 bg-blue-50 text-blue-700"
                    : "border-zinc-200 bg-white text-zinc-600"
                }`}
              >
                {t === "block" ? "🚫 Block day" : "🕐 Custom hours"}
              </button>
            ))}
          </div>
          {type === "custom" ? (
            <div className="flex items-center gap-2">
              <select
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs focus:border-[#D4450A] focus:outline-none"
              >
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
              </select>
              <span className="text-xs text-zinc-400">to</span>
              <select
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs focus:border-[#D4450A] focus:outline-none"
              >
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
              </select>
            </div>
          ) : null}
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!date || adding}
            className="w-full rounded-xl border-2 border-[#D4450A] py-2.5 text-sm font-bold text-[#D4450A] hover:bg-[#D4450A]/5 disabled:opacity-40 transition-colors"
          >
            {adding ? "Adding..." : "Add blocked date"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StaffManagerClient({
  initialStaff,
  initialStaffMode,
  services,
}: Props) {
  const [staffMode, setStaffModeState] = useState<StaffMode>(initialStaffMode);
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [expandedId, setExpandedId] = useState<string | null>(
    initialStaff.length === 1 ? initialStaff[0]?.id ?? null : null
  );
  const [activeSection, setActiveSection] = useState<
    Record<string, "schedule" | "services" | "blocked" | "details">
  >({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [addingStaff, setAddingStaff] = useState(false);
  const [selectedServices, setSelectedServices] = useState<Record<string, Set<string>>>({});
  const [savingServices, setSavingServices] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  function getSection(id: string) {
    return activeSection[id] ?? "schedule";
  }

  function getSelectedServices(member: StaffMember): Set<string> {
    if (selectedServices[member.id]) return selectedServices[member.id];
    return new Set(member.services.map((s) => s.serviceId));
  }

  async function handleModeChange(mode: StaffMode) {
    setStaffModeState(mode);
    await updateStaffMode(mode);
  }

  async function handleAddStaff() {
    if (!newName.trim()) return;
    setAddingStaff(true);
    const result = await createStaffMember({ name: newName });
    if ("ok" in result && result.ok && "staffId" in result) {
      const newMember: StaffMember = {
        id: result.staffId!,
        name: newName,
        bio: null,
        photoUrl: null,
        isActive: true,
        services: [],
        availability: [],
        overrides: [],
      };
      setStaff((prev) => [...prev, newMember]);
      setExpandedId(result.staffId!);
      setNewName("");
      setShowAddForm(false);
    }
    setAddingStaff(false);
  }

  async function handleSaveServices(member: StaffMember) {
    setSavingServices(member.id);
    const ids = Array.from(getSelectedServices(member));
    await updateStaffServices(member.id, ids);
    setSavingServices(null);
    setSavedFeedback(member.id);
    setTimeout(() => setSavedFeedback(null), 2000);
  }

  async function handleToggleActive(member: StaffMember) {
    await updateStaffMember(member.id, { isActive: !member.isActive });
    setStaff((prev) =>
      prev.map((s) => s.id === member.id ? { ...s, isActive: !s.isActive } : s)
    );
  }

  async function handleDelete(member: StaffMember) {
    if (!confirm(`Remove ${member.name}? This cannot be undone.`)) return;
    await deleteStaffMember(member.id);
    setStaff((prev) => prev.filter((s) => s.id !== member.id));
    if (expandedId === member.id) setExpandedId(null);
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Mode selector */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="mb-1 text-sm font-bold text-zinc-900">How do you operate?</p>
        <p className="mb-4 text-xs text-zinc-500">
          This controls how bookings are assigned to staff members.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              value: "SOLO" as StaffMode,
              label: "Solo",
              desc: "Just you — one schedule for all services",
              icon: "👤",
            },
            {
              value: "TEAM" as StaffMode,
              label: "Team",
              desc: "Multiple staff with their own schedules",
              icon: "👥",
            },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleModeChange(opt.value)}
              className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                staffMode === opt.value
                  ? "border-[#D4450A] bg-[#D4450A]/5"
                  : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <span className="text-2xl">{opt.icon}</span>
              <div>
                <p className={`text-sm font-bold ${
                  staffMode === opt.value ? "text-[#D4450A]" : "text-zinc-900"
                }`}>
                  {opt.label}
                </p>
                <p className="text-xs text-zinc-500">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Staff list */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-zinc-900">
              {staffMode === "SOLO" ? "Your schedule" : "Team members"}
            </p>
            <p className="text-xs text-zinc-400">
              {staffMode === "SOLO"
                ? "Set your working hours and blocked dates"
                : `${staff.length} staff member${staff.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          {staffMode === "TEAM" ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="rounded-xl px-4 py-2 text-xs font-bold text-white"
              style={{ backgroundColor: "#D4450A" }}
            >
              + Add staff
            </button>
          ) : null}
        </div>

        {/* Add staff form */}
        {showAddForm ? (
          <div className="rounded-2xl border border-[#D4450A]/20 bg-[#D4450A]/5 p-4">
            <p className="mb-3 text-sm font-bold text-[#D4450A]">New staff member</p>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Full name"
              className="mb-3 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddStaff}
                disabled={!newName.trim() || addingStaff}
                className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: "#D4450A" }}
              >
                {addingStaff ? "Adding..." : "Add"}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setNewName(""); }}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-12 text-center">
            <span className="mb-3 text-4xl">👤</span>
            <p className="text-sm font-semibold text-zinc-700">
              {staffMode === "SOLO" ? "No profile set up yet" : "No staff members yet"}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {staffMode === "SOLO"
                ? "Add yourself to set your working hours"
                : "Add your first staff member"}
            </p>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="mt-4 rounded-xl px-4 py-2 text-xs font-bold text-white"
              style={{ backgroundColor: "#D4450A" }}
            >
              {staffMode === "SOLO" ? "Set up my schedule" : "Add staff member"}
            </button>
          </div>
        ) : null}

        {staff.map((member) => {
          const expanded = expandedId === member.id;
          const section = getSection(member.id);
          const memberServices = getSelectedServices(member);

          return (
            <div
              key={member.id}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
            >
              {/* Card header */}
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : member.id)}
                className="flex w-full items-center gap-4 p-4 text-left hover:bg-zinc-50 transition-colors"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#D4450A]/10 text-lg font-black text-[#D4450A]">
                  {member.photoUrl ? (
                    <img src={member.photoUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
                  ) : (
                    member.name[0]?.toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-zinc-900">{member.name}</p>
                    {!member.isActive ? (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                        Inactive
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-zinc-400">
                    {member.availability.filter((a) => a.isActive).length} active days
                    {staffMode === "TEAM" ? ` · ${member.services.length} service${member.services.length !== 1 ? "s" : ""}` : ""}
                  </p>
                </div>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2"
                  className={`shrink-0 text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Expanded content */}
              {expanded ? (
                <div className="border-t border-zinc-100">
                  {/* Section tabs */}
                  <div className="flex border-b border-zinc-100">
                    {([
                      { key: "schedule", label: "Schedule" },
                      { key: "blocked", label: "Blocked dates" },
                      ...(staffMode === "TEAM" ? [{ key: "services", label: "Services" }] : []),
                      { key: "details", label: "Details" },
                    ] as { key: typeof section; label: string }[]).map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveSection((prev) => ({ ...prev, [member.id]: tab.key }))}
                        className={`px-4 py-3 text-xs font-bold transition-colors ${
                          section === tab.key
                            ? "border-b-2 border-[#D4450A] text-[#D4450A]"
                            : "text-zinc-500 hover:text-zinc-900"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-4">
                    {/* Schedule tab */}
                    {section === "schedule" ? (
                      <ScheduleEditor
                        member={member}
                        onSaved={() => {
                          setSavedFeedback(member.id + "_schedule");
                          setTimeout(() => setSavedFeedback(null), 2000);
                        }}
                      />
                    ) : null}

                    {/* Blocked dates tab */}
                    {section === "blocked" ? (
                      <BlockedDatesEditor member={member} />
                    ) : null}

                    {/* Services tab — team mode only */}
                    {section === "services" && staffMode === "TEAM" ? (
                      <div className="flex flex-col gap-3">
                        <p className="text-xs text-zinc-500">
                          Select which services this staff member can perform.
                          Customers can only book this person for these services.
                        </p>
                        {services.length === 0 ? (
                          <p className="text-sm text-zinc-400">
                            No services created yet. Create a service first.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {services.map((service) => (
                              <button
                                key={service.id}
                                type="button"
                                onClick={() => {
                                  setSelectedServices((prev) => {
                                    const current = new Set(prev[member.id] ?? memberServices);
                                    if (current.has(service.id)) current.delete(service.id);
                                    else current.add(service.id);
                                    return { ...prev, [member.id]: current };
                                  });
                                }}
                                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                                  memberServices.has(service.id)
                                    ? "border-[#D4450A] bg-[#D4450A]/5"
                                    : "border-zinc-200 hover:border-zinc-300"
                                }`}
                              >
                                <div className={`h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
                                  memberServices.has(service.id)
                                    ? "border-[#D4450A] bg-[#D4450A]"
                                    : "border-zinc-300"
                                }`}>
                                  {memberServices.has(service.id) ? (
                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  ) : null}
                                </div>
                                <span className="text-sm font-medium text-zinc-800">
                                  {service.name}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSaveServices(member)}
                          disabled={savingServices === member.id}
                          className="w-full rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
                        >
                          {savingServices === member.id
                            ? "Saving..."
                            : savedFeedback === member.id
                              ? "Saved ✓"
                              : "Save services"}
                        </button>
                      </div>
                    ) : null}

                    {/* Details tab */}
                    {section === "details" ? (
                      <div className="flex flex-col gap-4">
                        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-sm text-zinc-600">
                          <p className="font-semibold text-zinc-900">{member.name}</p>
                          {member.bio ? <p className="mt-1 text-xs">{member.bio}</p> : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(member)}
                            className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
                          >
                            {member.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(member)}
                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
