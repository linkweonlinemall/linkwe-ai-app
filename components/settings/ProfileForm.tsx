"use client";

import { useState } from "react";

import { updateProfile } from "@/app/actions/settings";
import RegionSelect from "@/components/ui/RegionSelect";

type Props = {
  user: {
    fullName: string | null;
    email: string;
    phone: string | null;
    region: string | null;
  };
};

export default function ProfileForm({ user }: Props) {
  const [fullName, setFullName] = useState(user.fullName ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [region, setRegion] = useState(user.region ?? "");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    const result = await updateProfile({ fullName, phone, region });
    if ("error" in result) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="mb-4 text-sm font-bold text-zinc-900">Profile</h2>
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
            Full name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
            Email address
          </label>
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-100 px-3.5 py-2.5 text-sm text-zinc-400"
          />
          <p className="mt-1 text-xs text-zinc-400">
            Email cannot be changed. Contact support if needed.
          </p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
            Phone number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 868 XXX XXXX"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
            Region
          </label>
          <RegionSelect
            name="region"
            defaultValue={region}
            onChange={(val) => setRegion(val)}
          />
        </div>
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs font-semibold text-red-700">{error}</p>
          </div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold text-emerald-700">
              Profile updated successfully ✓
            </p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}
