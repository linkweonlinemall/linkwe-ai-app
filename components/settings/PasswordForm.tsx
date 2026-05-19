"use client";

import { useState } from "react";

import { changePassword } from "@/app/actions/settings";

export default function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    const result = await changePassword({ currentPassword, newPassword, confirmPassword });
    if ("error" in result) {
      setError(result.error);
    } else {
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  }

  const strength =
    newPassword.length === 0
      ? null
      : newPassword.length < 8
        ? "weak"
        : newPassword.length < 12
          ? "fair"
          : /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword)
            ? "strong"
            : "good";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="mb-4 text-sm font-bold text-zinc-900">Change password</h2>
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
            Current password
          </label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 pr-10 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              {showCurrent ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
            New password
          </label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 pr-10 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              {showNew ? "Hide" : "Show"}
            </button>
          </div>
          {strength ? (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex gap-1">
                {["weak", "fair", "good", "strong"].map((level, i) => (
                  <div
                    key={level}
                    className={`h-1 w-8 rounded-full transition-colors ${
                      ["weak", "fair", "good", "strong"].indexOf(strength) >= i
                        ? strength === "weak"
                          ? "bg-red-400"
                          : strength === "fair"
                            ? "bg-amber-400"
                            : strength === "good"
                              ? "bg-blue-400"
                              : "bg-emerald-400"
                        : "bg-zinc-200"
                    }`}
                  />
                ))}
              </div>
              <span
                className={`text-xs font-semibold capitalize ${
                  strength === "weak"
                    ? "text-red-500"
                    : strength === "fair"
                      ? "text-amber-500"
                      : strength === "good"
                        ? "text-blue-500"
                        : "text-emerald-500"
                }`}
              >
                {strength}
              </span>
            </div>
          ) : null}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
            Confirm new password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full rounded-xl border bg-zinc-50 px-3.5 py-2.5 text-sm focus:outline-none ${
              confirmPassword && confirmPassword !== newPassword
                ? "border-red-300 focus:border-red-400"
                : "border-zinc-200 focus:border-[#D4450A] focus:bg-white"
            }`}
          />
          {confirmPassword && confirmPassword !== newPassword ? (
            <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
          ) : null}
        </div>
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs font-semibold text-red-700">{error}</p>
          </div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold text-emerald-700">
              Password changed successfully ✓
            </p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !currentPassword || !newPassword || !confirmPassword}
          className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
        >
          {saving ? "Changing password..." : "Change password"}
        </button>
      </div>
    </div>
  );
}
