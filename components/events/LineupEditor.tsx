"use client";

import { useRef, useState } from "react";
import { Music, X, Plus, User } from "lucide-react";
import { uploadLineupImage } from "@/app/actions/events";
import { compressImageFile } from "@/lib/images/compress-image";

export type Performer = {
  name: string;
  role: string;
  type: string;
  imageUrl?: string;
};

const PERFORMER_TYPES = [
  "DJ",
  "Artist",
  "Band",
  "Performer",
  "Host",
  "Special Guest",
] as const;

const TYPE_COLORS: Record<string, string> = {
  DJ: "bg-[#D4450A]/10 text-[#D4450A]",
  Artist: "bg-amber-100 text-amber-700",
  Band: "bg-blue-100 text-blue-700",
  Performer: "bg-emerald-100 text-emerald-700",
  Host: "bg-zinc-100 text-zinc-600",
  "Special Guest": "bg-purple-100 text-purple-700",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

type Props = {
  value: Performer[];
  onChange: (lineup: Performer[]) => void;
};

export default function LineupEditor({ value, onChange }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Performer>({
    name: "",
    role: "",
    type: "DJ",
    imageUrl: "",
  });
  const [nameError, setNameError] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    setPhotoError(null);
    const compressed = await compressImageFile(file);
    const fd = new FormData();
    fd.append("image", compressed);
    const result = await uploadLineupImage(fd);
    if ("error" in result) {
      setPhotoError(result.error);
    } else {
      setForm((f) => ({ ...f, imageUrl: result.url }));
    }
    setPhotoUploading(false);
    e.target.value = "";
  }

  function handleAdd() {
    if (!form.name.trim()) {
      setNameError(true);
      return;
    }
    onChange([
      ...value,
      {
        name: form.name.trim(),
        role: form.role.trim(),
        type: form.type,
        imageUrl: form.imageUrl?.trim() || undefined,
      },
    ]);
    setForm({ name: "", role: "", type: "DJ", imageUrl: "" });
    setShowForm(false);
    setNameError(false);
    setPhotoError(null);
  }

  function handleRemove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function handleCancel() {
    setForm({ name: "", role: "", type: "DJ", imageUrl: "" });
    setShowForm(false);
    setNameError(false);
    setPhotoError(null);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D4450A]/10">
          <Music size={14} className="text-[#D4450A]" />
        </span>
        <p className="text-sm font-bold text-zinc-900">Entertainment &amp; Lineup</p>
      </div>

      {/* Performer cards */}
      {value.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          {value.map((p, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5"
            >
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D4450A] text-xs font-bold text-white">
                  {getInitials(p.name)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900 leading-tight">{p.name}</p>
                {p.role && (
                  <p className="text-xs text-zinc-500 leading-tight">{p.role}</p>
                )}
                <span
                  className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE_COLORS[p.type] ?? "bg-zinc-100 text-zinc-600"}`}
                >
                  {p.type}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="ml-1 rounded-full p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
                aria-label={`Remove ${p.name}`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Inline add form */}
      {showForm ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="mb-3 text-xs font-semibold text-zinc-700 uppercase tracking-wide">
            Add performer
          </p>
          <div className="flex flex-col gap-3">
            {/* Photo upload */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Photo <span className="text-zinc-400">(optional)</span>
              </label>
              <div className="flex items-center gap-3">
                {form.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.imageUrl}
                    alt="Performer"
                    className="h-12 w-12 rounded-full object-cover border border-zinc-200"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 border border-zinc-200">
                    <User size={18} />
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <button
                    type="button"
                    disabled={photoUploading}
                    onClick={() => photoInputRef.current?.click()}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {photoUploading ? "Uploading…" : form.imageUrl ? "Change photo" : "Upload photo"}
                  </button>
                  {form.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                      className="text-[11px] text-zinc-400 hover:text-red-500 text-left"
                    >
                      Remove
                    </button>
                  )}
                  {photoError && (
                    <p className="text-[11px] text-red-500">{photoError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Name + Role */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700">
                  Name <span className="text-[#D4450A]">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, name: e.target.value }));
                    setNameError(false);
                  }}
                  placeholder="e.g. DJ Fabio"
                  className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    nameError
                      ? "border-red-400 focus:ring-red-400"
                      : "border-zinc-200 focus:border-[#D4450A] focus:ring-[#D4450A]"
                  } bg-white`}
                />
                {nameError && (
                  <p className="mt-1 text-xs text-red-500">Name is required.</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700">Role</label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  placeholder="e.g. Headliner"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none focus:ring-1 focus:ring-[#D4450A]"
                />
              </div>
            </div>

            {/* Type */}
            <div className="w-1/2 pr-1.5">
              <label className="mb-1 block text-xs font-semibold text-zinc-700">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none focus:ring-1 focus:ring-[#D4450A]"
              >
                {PERFORMER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              className="flex items-center gap-1.5 rounded-xl bg-[#D4450A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b93c09]"
            >
              <Plus size={14} /> Add
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-xl border border-dashed border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-500 hover:border-[#D4450A] hover:text-[#D4450A]"
        >
          <Plus size={14} /> Add performer
        </button>
      )}
    </div>
  );
}
