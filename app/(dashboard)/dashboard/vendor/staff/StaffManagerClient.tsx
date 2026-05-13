"use client";

import { useState } from "react";

import type { StaffMode } from "@prisma/client";

import {
  addStaffOverride,
  createStaffMember,
  deleteStaffMember,
  removeStaffOverride,
  saveStaffAvailability,
  updateStaffMember,
  updateStaffMode,
  updateStaffServices,
} from "@/app/actions/staff";

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
  const date = new Date(d);
  return date.toLocaleDateString("en-TT", {
    weekday: "short", month: "short", day: "numeric",
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

type OverrideRow = {
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
  overrides?: OverrideRow[];
};

type Service = { id: string; name: string };

type Props = {
  initialStaff: StaffMember[];
  initialStaffMode: StaffMode;
  services: Service[];
};

export default function StaffManagerClient({ initialStaff, initialStaffMode, services }: Props) {
  const [staffMode, setStaffModeState] = useState<StaffMode>(initialStaffMode);
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    Record<string, "details" | "services" | "availability" | "overrides">
  >({});
  const [saving, setSaving] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBio, setNewBio] = useState("");
  const [addingStaff, setAddingStaff] = useState(false);

  const [editName, setEditName] = useState<Record<string, string>>({});
  const [editBio, setEditBio] = useState<Record<string, string>>({});
  const [selectedServices, setSelectedServices] = useState<Record<string, Set<string>>>({});
  const [schedules, setSchedules] = useState<Record<string, DaySchedule[]>>({});

  const [overrideDate, setOverrideDate] = useState<Record<string, string>>({});
  const [overrideType, setOverrideType] = useState<Record<string, "block" | "custom">>({});
  const [overrideStart, setOverrideStart] = useState<Record<string, string>>({});
  const [overrideEnd, setOverrideEnd] = useState<Record<string, string>>({});
  const [overrideReason, setOverrideReason] = useState<Record<string, string>>({});
  const [staffOverrides, setStaffOverrides] = useState<Record<string, OverrideRow[]>>(() => {
    const r: Record<string, OverrideRow[]> = {};
    for (const m of initialStaff) {
      r[m.id] = (m.overrides ?? []).map((o) => ({ ...o }));
    }
    return r;
  });

  function getTab(id: string) {
    return activeTab[id] ?? "details";
  }

  function getSchedule(member: StaffMember): DaySchedule[] {
    if (schedules[member.id]) return schedules[member.id];
    return DAYS.map((day) => {
      const existing = member.availability.find((a) => a.dayOfWeek === day.value);
      return {
        dayOfWeek: day.value,
        startTime: existing?.startTime ?? "09:00",
        endTime: existing?.endTime ?? "17:00",
        slotDurationMins: existing?.slotDurationMins ?? 60,
        slotBufferMins: existing?.slotBufferMins ?? 0,
        isActive: existing?.isActive ?? false,
      };
    });
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
    const result = await createStaffMember({ name: newName, bio: newBio });
    if ("ok" in result && result.ok && "staffId" in result && result.staffId) {
      setStaff((prev) => [
        ...prev,
        {
          id: result.staffId,
          name: newName.trim(),
          bio: newBio.trim() || null,
          photoUrl: null,
          isActive: true,
          services: [],
          availability: [],
          overrides: [],
        },
      ]);
      setStaffOverrides((prev) => ({ ...prev, [result.staffId]: [] }));
      setNewName("");
      setNewBio("");
      setShowAddForm(false);
    }
    setAddingStaff(false);
  }

  async function handleSaveDetails(member: StaffMember) {
    setSaving(member.id + "_details");
    await updateStaffMember(member.id, {
      name: editName[member.id] ?? member.name,
      bio: editBio[member.id] ?? member.bio ?? "",
    });
    setStaff((prev) =>
      prev.map((s) =>
        s.id === member.id
          ? {
              ...s,
              name: editName[member.id] ?? s.name,
              bio:
                editBio[member.id] !== undefined ? editBio[member.id] || null : (s.bio ?? null),
            }
          : s,
      ),
    );
    setSaving(null);
  }

  async function handleSaveServices(member: StaffMember) {
    setSaving(member.id + "_services");
    const ids = Array.from(getSelectedServices(member));
    await updateStaffServices(member.id, ids);
    setStaff((prev) =>
      prev.map((s) =>
        s.id === member.id
          ? {
              ...s,
              services: ids.map((serviceId) => ({
                serviceId,
                service: {
                  name: services.find((x) => x.id === serviceId)?.name ?? "Service",
                },
              })),
            }
          : s,
      ),
    );
    setSaving(null);
  }

  async function handleSaveAvailability(member: StaffMember) {
    setSaving(member.id + "_availability");
    const schedule = getSchedule(member);
    await saveStaffAvailability(member.id, schedule);
    setStaff((prev) =>
      prev.map((s) => (s.id === member.id ? { ...s, availability: schedule } : s)),
    );
    setSaving(null);
  }

  async function handleAddOverride(member: StaffMember) {
    const date = overrideDate[member.id];
    if (!date) return;
    setSaving(member.id + "_override");
    const type = overrideType[member.id] ?? "block";
    const result = await addStaffOverride(member.id, {
      date,
      isBlocked: type === "block",
      customStartTime: type === "custom" ? (overrideStart[member.id] ?? "09:00") : undefined,
      customEndTime: type === "custom" ? (overrideEnd[member.id] ?? "17:00") : undefined,
      reason: overrideReason[member.id] || undefined,
    });
    if ("ok" in result && result.ok && "id" in result) {
      setStaffOverrides((prev) => ({
        ...prev,
        [member.id]: [
          ...(prev[member.id] ?? []),
          {
            id: result.id,
            date,
            isBlocked: type === "block",
            customStartTime: type === "custom" ? (overrideStart[member.id] ?? "09:00") : null,
            customEndTime: type === "custom" ? (overrideEnd[member.id] ?? "17:00") : null,
            reason: overrideReason[member.id]?.trim() || null,
          },
        ],
      }));
      setOverrideDate((prev) => ({ ...prev, [member.id]: "" }));
      setOverrideReason((prev) => ({ ...prev, [member.id]: "" }));
    }
    setSaving(null);
  }

  async function handleRemoveOverride(memberId: string, overrideId: string) {
    await removeStaffOverride(overrideId);
    setStaffOverrides((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] ?? []).filter((o) => o.id !== overrideId),
    }));
  }

  async function handleToggleActive(member: StaffMember) {
    await updateStaffMember(member.id, { isActive: !member.isActive });
    setStaff((prev) =>
      prev.map((s) => (s.id === member.id ? { ...s, isActive: !s.isActive } : s)),
    );
  }

  async function handleDelete(member: StaffMember) {
    if (!confirm(`Remove ${member.name} from your team? This cannot be undone.`)) return;
    await deleteStaffMember(member.id);
    setStaff((prev) => prev.filter((s) => s.id !== member.id));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="mb-3 text-sm font-bold text-zinc-900">How do you operate?</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              value: "SOLO" as StaffMode,
              label: "Solo",
              description: "Just you — one calendar for all your services",
              icon: "👤",
            },
            {
              value: "TEAM" as StaffMode,
              label: "Team",
              description: "Multiple staff, each with their own schedule",
              icon: "👥",
            },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => void handleModeChange(opt.value)}
              className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                staffMode === opt.value
                  ? "border-[#D4450A] bg-[#D4450A]/5"
                  : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <span className="text-2xl">{opt.icon}</span>
              <div>
                <p
                  className={`text-sm font-bold ${staffMode === opt.value ? "text-[#D4450A]" : "text-zinc-900"}`}
                >
                  {opt.label}
                </p>
                <p className="text-xs text-zinc-500">{opt.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-zinc-900">
            {staffMode === "SOLO" ? "Your profile" : "Team members"}
          </p>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-white"
            style={{ backgroundColor: "#D4450A" }}
          >
            + Add {staffMode === "SOLO" ? "profile" : "staff member"}
          </button>
        </div>

        {showAddForm ? (
          <div className="rounded-2xl border border-[#D4450A]/20 bg-[#D4450A]/5 p-4">
            <p className="mb-3 text-sm font-bold text-[#D4450A]">New staff member</p>
            <div className="flex flex-col gap-3">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full name *"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
              />
              <textarea
                value={newBio}
                onChange={(e) => setNewBio(e.target.value)}
                placeholder="Short bio (optional)"
                rows={2}
                className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleAddStaff()}
                  disabled={!newName.trim() || addingStaff}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: "#D4450A" }}
                >
                  {addingStaff ? "Adding..." : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewName("");
                    setNewBio("");
                  }}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {staff.length === 0 && !showAddForm ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-12 text-center">
            <span className="mb-3 text-4xl">👥</span>
            <p className="text-sm font-semibold text-zinc-700">No staff members yet</p>
            <p className="mt-1 text-xs text-zinc-400">Add your first staff member to get started</p>
          </div>
        ) : null}

        {staff.map((member) => {
          const expanded = expandedId === member.id;
          const tab = getTab(member.id);
          const schedule = getSchedule(member);
          const memberServices = getSelectedServices(member);
          const overrides = staffOverrides[member.id] ?? [];

          return (
            <div key={member.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : member.id)}
                className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-zinc-50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#D4450A]/10 text-lg font-bold text-[#D4450A]">
                  {member.photoUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={member.photoUrl}
                        alt=""
                        className="h-full w-full rounded-full object-cover"
                      />
                    </>
                  ) : (
                    member.name[0]?.toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-zinc-900">{member.name}</p>
                    {!member.isActive ? (
                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                        Inactive
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-zinc-400">
                    {member.services.length} service{member.services.length !== 1 ? "s" : ""}
                    {" · "}
                    {member.availability.filter((a) => a.isActive).length} active days
                  </p>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`shrink-0 text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {expanded ? (
                <div className="border-t border-zinc-100">
                  <div className="flex border-b border-zinc-100">
                    {(["details", "services", "availability", "overrides"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setActiveTab((prev) => ({ ...prev, [member.id]: t }))}
                        className={`px-4 py-2.5 text-xs font-semibold capitalize transition-colors ${
                          tab === t
                            ? "border-b-2 border-[#D4450A] text-[#D4450A]"
                            : "text-zinc-500 hover:text-zinc-900"
                        }`}
                      >
                        {t === "availability"
                          ? "Schedule"
                          : t === "overrides"
                            ? "Blocked dates"
                            : t}
                      </button>
                    ))}
                  </div>

                  <div className="p-4">
                    {tab === "details" ? (
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-zinc-700">
                            Name
                          </label>
                          <input
                            defaultValue={member.name}
                            onChange={(e) =>
                              setEditName((prev) => ({ ...prev, [member.id]: e.target.value }))
                            }
                            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-zinc-700">
                            Bio
                          </label>
                          <textarea
                            defaultValue={member.bio ?? ""}
                            onChange={(e) =>
                              setEditBio((prev) => ({ ...prev, [member.id]: e.target.value }))
                            }
                            rows={2}
                            className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => void handleSaveDetails(member)}
                            disabled={saving === member.id + "_details"}
                            className="rounded-xl px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            style={{ backgroundColor: "#D4450A" }}
                          >
                            {saving === member.id + "_details" ? "Saving..." : "Save details"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleToggleActive(member)}
                            className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                          >
                            {member.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(member)}
                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {tab === "services" ? (
                      <div className="flex flex-col gap-3">
                        <p className="text-xs text-zinc-500">
                          Select which services this staff member can perform
                        </p>
                        {services.length === 0 ? (
                          <p className="text-xs text-zinc-400">No services created yet</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {services.map((service) => (
                              <label
                                key={service.id}
                                className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2.5 hover:bg-zinc-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={memberServices.has(service.id)}
                                  onChange={() => {
                                    setSelectedServices((prev) => {
                                      const current = new Set(prev[member.id] ?? memberServices);
                                      if (current.has(service.id)) current.delete(service.id);
                                      else current.add(service.id);
                                      return { ...prev, [member.id]: current };
                                    });
                                  }}
                                  className="h-4 w-4 rounded accent-[#D4450A]"
                                />
                                <span className="text-sm font-medium text-zinc-900">
                                  {service.name}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleSaveServices(member)}
                          disabled={saving === member.id + "_services"}
                          className="w-full rounded-xl py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                          style={{ backgroundColor: "#D4450A" }}
                        >
                          {saving === member.id + "_services" ? "Saving..." : "Save services"}
                        </button>
                      </div>
                    ) : null}

                    {tab === "availability" ? (
                      <div className="flex flex-col gap-3">
                        {DAYS.map((day) => {
                          const d = schedule.find((s) => s.dayOfWeek === day.value)!;
                          return (
                            <div
                              key={day.value}
                              className={`rounded-xl border p-3 transition-all ${d.isActive ? "border-zinc-200 bg-white" : "border-zinc-100 bg-zinc-50"}`}
                            >
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = schedule.map((s) =>
                                      s.dayOfWeek === day.value ? { ...s, isActive: !s.isActive } : s,
                                    );
                                    setSchedules((prev) => ({ ...prev, [member.id]: updated }));
                                  }}
                                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${d.isActive ? "bg-[#D4450A]" : "bg-zinc-200"}`}
                                >
                                  <div
                                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${d.isActive ? "translate-x-4" : "translate-x-0.5"}`}
                                  />
                                </button>
                                <span
                                  className={`w-20 text-xs font-semibold ${d.isActive ? "text-zinc-900" : "text-zinc-400"}`}
                                >
                                  {day.label}
                                </span>
                                {d.isActive ? (
                                  <div className="flex flex-1 flex-wrap items-center gap-2">
                                    <select
                                      value={d.startTime}
                                      onChange={(e) => {
                                        const updated = schedule.map((s) =>
                                          s.dayOfWeek === day.value
                                            ? { ...s, startTime: e.target.value }
                                            : s,
                                        );
                                        setSchedules((prev) => ({ ...prev, [member.id]: updated }));
                                      }}
                                      className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs focus:border-[#D4450A] focus:outline-none"
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
                                      onChange={(e) => {
                                        const updated = schedule.map((s) =>
                                          s.dayOfWeek === day.value
                                            ? { ...s, endTime: e.target.value }
                                            : s,
                                        );
                                        setSchedules((prev) => ({ ...prev, [member.id]: updated }));
                                      }}
                                      className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs focus:border-[#D4450A] focus:outline-none"
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
                        <div className="grid grid-cols-2 gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                          <div>
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                              Session duration
                            </label>
                            <select
                              value={schedule.find((s) => s.isActive)?.slotDurationMins ?? 60}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                const updated = schedule.map((s) => ({
                                  ...s,
                                  slotDurationMins: v,
                                }));
                                setSchedules((prev) => ({ ...prev, [member.id]: updated }));
                              }}
                              className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs focus:border-[#D4450A] focus:outline-none"
                            >
                              {[15, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360].map((m) => (
                                <option key={m} value={m}>
                                  {m < 60
                                    ? `${m}m`
                                    : `${Math.floor(m / 60)}h${m % 60 > 0 ? ` ${m % 60}m` : ""}`}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                              Buffer between slots
                            </label>
                            <select
                              value={schedule.find((s) => s.isActive)?.slotBufferMins ?? 0}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                const updated = schedule.map((s) => ({
                                  ...s,
                                  slotBufferMins: v,
                                }));
                                setSchedules((prev) => ({ ...prev, [member.id]: updated }));
                              }}
                              className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs focus:border-[#D4450A] focus:outline-none"
                            >
                              {[0, 5, 10, 15, 20, 30, 45, 60].map((m) => (
                                <option key={m} value={m}>
                                  {m === 0 ? "No buffer" : `${m}m`}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleSaveAvailability(member)}
                          disabled={saving === member.id + "_availability"}
                          className="w-full rounded-xl py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                          style={{ backgroundColor: "#D4450A" }}
                        >
                          {saving === member.id + "_availability" ? "Saving..." : "Save schedule"}
                        </button>
                      </div>
                    ) : null}

                    {tab === "overrides" ? (
                      <div className="flex flex-col gap-3">
                        {overrides.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {overrides.map((o) => (
                              <div
                                key={o.id}
                                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${o.isBlocked ? "border-red-100 bg-red-50" : "border-blue-100 bg-blue-50"}`}
                              >
                                <div>
                                  <p className="text-xs font-semibold text-zinc-900">{formatDate(o.date)}</p>
                                  <p className="text-[10px] text-zinc-500">
                                    {o.isBlocked
                                      ? `Blocked${o.reason ? ` — ${o.reason}` : ""}`
                                      : `Custom: ${formatTime(o.customStartTime ?? "09:00")} – ${formatTime(o.customEndTime ?? "17:00")}`}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => void handleRemoveOverride(member.id, o.id)}
                                  className="text-xs text-red-500 hover:underline"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-400">No blocked dates yet</p>
                        )}
                        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                            Add override
                          </p>
                          <div className="flex flex-col gap-2">
                            <input
                              type="date"
                              value={overrideDate[member.id] ?? ""}
                              onChange={(e) =>
                                setOverrideDate((prev) => ({
                                  ...prev,
                                  [member.id]: e.target.value,
                                }))
                              }
                              min={new Date().toISOString().split("T")[0]}
                              className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs focus:border-[#D4450A] focus:outline-none"
                            />
                            <div className="flex gap-2">
                              {(["block", "custom"] as const).map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() =>
                                    setOverrideType((prev) => ({ ...prev, [member.id]: t }))
                                  }
                                  className={`flex-1 rounded-lg border-2 py-1.5 text-xs font-semibold transition-all ${
                                    (overrideType[member.id] ?? "block") === t
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
                            {(overrideType[member.id] ?? "block") === "custom" ? (
                              <div className="flex items-center gap-2">
                                <select
                                  value={overrideStart[member.id] ?? "09:00"}
                                  onChange={(e) =>
                                    setOverrideStart((prev) => ({
                                      ...prev,
                                      [member.id]: e.target.value,
                                    }))
                                  }
                                  className="flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs focus:border-[#D4450A] focus:outline-none"
                                >
                                  {TIME_OPTIONS.map((t) => (
                                    <option key={t} value={t}>
                                      {formatTime(t)}
                                    </option>
                                  ))}
                                </select>
                                <span className="text-xs text-zinc-400">to</span>
                                <select
                                  value={overrideEnd[member.id] ?? "17:00"}
                                  onChange={(e) =>
                                    setOverrideEnd((prev) => ({
                                      ...prev,
                                      [member.id]: e.target.value,
                                    }))
                                  }
                                  className="flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs focus:border-[#D4450A] focus:outline-none"
                                >
                                  {TIME_OPTIONS.map((t) => (
                                    <option key={t} value={t}>
                                      {formatTime(t)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : null}
                            <input
                              type="text"
                              placeholder="Reason (optional)"
                              value={overrideReason[member.id] ?? ""}
                              onChange={(e) =>
                                setOverrideReason((prev) => ({
                                  ...prev,
                                  [member.id]: e.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs focus:border-[#D4450A] focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => void handleAddOverride(member)}
                              disabled={!overrideDate[member.id] || saving === member.id + "_override"}
                              className="w-full rounded-xl border border-[#D4450A] py-2 text-xs font-semibold text-[#D4450A] hover:bg-[#fff5f0] disabled:opacity-40"
                            >
                              {saving === member.id + "_override" ? "Adding..." : "Add override"}
                            </button>
                          </div>
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
