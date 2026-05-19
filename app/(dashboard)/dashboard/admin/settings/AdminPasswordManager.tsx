"use client";

import { useState } from "react";

import { adminChangeUserPassword } from "@/app/actions/settings";

type User = {
  id: string;
  fullName: string | null;
  email: string;
  role: string;
  isActive: boolean;
};

const ROLE_COLOR: Record<string, string> = {
  ADMIN: "bg-[#D4450A] text-white",
  VENDOR: "bg-blue-100 text-blue-700",
  CUSTOMER: "bg-emerald-100 text-emerald-700",
  COURIER: "bg-amber-100 text-amber-700",
};

export default function AdminPasswordManager({ users }: { users: User[] }) {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.fullName ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  async function handleChangePassword() {
    if (!selectedUser) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    const result = await adminChangeUserPassword({
      userId: selectedUser.id,
      newPassword,
      confirmPassword,
    });

    if ("error" in result) {
      setError(result.error);
    } else {
      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setSuccess(false);
        setSelectedUser(null);
      }, 2000);
    }
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="mb-1 text-sm font-bold text-zinc-900">Change any user&apos;s password</h2>
      <p className="mb-4 text-xs text-zinc-500">
        Search for a user and set a new password for them.
      </p>

      {/* Search */}
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email..."
        className="mb-3 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
      />

      {/* User list */}
      {search ? (
        <div className="mb-4 max-h-48 overflow-y-auto rounded-xl border border-zinc-200">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-xs text-zinc-400">No users found</p>
          ) : (
            filtered.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  setSelectedUser(user);
                  setSearch("");
                  setError(null);
                  setSuccess(false);
                }}
                className={`flex w-full items-center gap-3 border-b border-zinc-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-zinc-50 ${
                  selectedUser?.id === user.id ? "bg-[#D4450A]/5" : ""
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-600">
                  {(user.fullName ?? user.email)[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900">
                    {user.fullName ?? "—"}
                  </p>
                  <p className="truncate text-xs text-zinc-400">{user.email}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    ROLE_COLOR[user.role] ?? "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {user.role}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}

      {/* Selected user */}
      {selectedUser ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-[#D4450A]/20 bg-[#D4450A]/5 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D4450A]/20 text-sm font-bold text-[#D4450A]">
              {(selectedUser.fullName ?? selectedUser.email)[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-zinc-900">{selectedUser.fullName ?? "—"}</p>
              <p className="text-xs text-zinc-500">{selectedUser.email}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedUser(null)}
              className="text-xs text-zinc-400 hover:text-zinc-600"
            >
              Change
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
            />
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
                  ? "border-red-300"
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
            onClick={handleChangePassword}
            disabled={
              saving ||
              !newPassword ||
              !confirmPassword ||
              newPassword !== confirmPassword
            }
            className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
          >
            {saving
              ? "Changing password..."
              : `Change password for ${selectedUser.fullName ?? selectedUser.email}`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
