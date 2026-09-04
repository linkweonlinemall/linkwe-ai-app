"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@prisma/client";
import {
  getAdminUsers,
  suspendUser,
  unsuspendUser,
  deleteUser,
  bulkSuspendUsers,
  bulkDeleteUsers,
} from "@/app/actions/admin-users";
import UserDetailPanel from "./admin-user-detail";

type AdminUserRow = Awaited<ReturnType<typeof getAdminUsers>>["users"][number];

const ROLE_BADGE: Record<UserRole, string> = {
  CUSTOMER: "bg-blue-50 text-blue-700",
  VENDOR:   "bg-amber-50 text-amber-700",
  COURIER:  "bg-emerald-50 text-emerald-700",
  ADMIN:    "bg-[#D4450A]/10 text-[#D4450A]",
};

const ROLE_AVATAR: Record<UserRole, string> = {
  CUSTOMER: "bg-blue-100 text-blue-700",
  VENDOR:   "bg-amber-100 text-amber-700",
  COURIER:  "bg-emerald-100 text-emerald-700",
  ADMIN:    "bg-[#D4450A]/10 text-[#D4450A]",
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-TT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type BulkDeleteResult = {
  deleted: string[];
  skipped: { id: string; name: string; reason: string }[];
} | null;

type Props = {
  users: AdminUserRow[];
  total: number;
  page: number;
  totalPages: number;
  currentQ: string;
  currentRole: string;
};

export default function AdminUsersClient({
  users,
  total,
  page,
  totalPages,
  currentQ,
  currentRole,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Inline single-row delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Error state for single actions
  const [actionError, setActionError] = useState<string | null>(null);

  // Bulk delete result (skipped users)
  const [bulkResult, setBulkResult] = useState<BulkDeleteResult>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Detail panel
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  // ── Navigation ──────────────────────────────────────────────────────────────

  function navigate(params: Record<string, string>) {
    const sp = new URLSearchParams({ q: currentQ, role: currentRole, page: String(page) });
    Object.entries(params).forEach(([k, v]) => sp.set(k, v));
    router.push(`/dashboard/admin/users?${sp.toString()}`);
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    navigate({ q: (fd.get("q") as string) ?? "", page: "1" });
  }

  // ── Checkboxes ──────────────────────────────────────────────────────────────

  const allSelected = users.length > 0 && users.every((u) => selected.has(u.id));
  const someSelected = users.some((u) => selected.has(u.id));

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        users.forEach((u) => next.delete(u.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        users.forEach((u) => next.add(u.id));
        return next;
      });
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Single row actions ───────────────────────────────────────────────────────

  function handleSuspend(userId: string, isSuspended: boolean) {
    setActionError(null);
    startTransition(async () => {
      const res = isSuspended ? await unsuspendUser(userId) : await suspendUser(userId);
      if (!res.ok) setActionError(res.error ?? "Action failed.");
      else router.refresh();
    });
  }

  function handleDelete(userId: string) {
    if (confirmDelete !== userId) { setConfirmDelete(userId); return; }
    setConfirmDelete(null);
    setActionError(null);
    startTransition(async () => {
      const res = await deleteUser(userId);
      if (!res.ok) setActionError(res.error ?? "Could not delete user.");
      else router.refresh();
    });
  }

  // ── Bulk actions ─────────────────────────────────────────────────────────────

  const selectedIds = Array.from(selected);

  function handleBulkSuspend() {
    startTransition(async () => {
      await bulkSuspendUsers(selectedIds);
      setSelected(new Set());
      router.refresh();
    });
  }

  function handleBulkDelete() {
    if (!confirmBulkDelete) { setConfirmBulkDelete(true); return; }
    setConfirmBulkDelete(false);
    startTransition(async () => {
      const res = await bulkDeleteUsers(selectedIds);
      setSelected(new Set());
      setBulkResult(res);
      router.refresh();
    });
  }

  const ROLE_FILTERS = [
    { value: "all",      label: "All" },
    { value: "CUSTOMER", label: "Customers" },
    { value: "VENDOR",   label: "Vendors" },
    { value: "COURIER",  label: "Couriers" },
    { value: "ADMIN",    label: "Admins" },
  ];

  return (
    <>
      {/* Search + role filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            name="q"
            defaultValue={currentQ}
            placeholder="Search by name or email…"
            className="w-64 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none focus:ring-1 focus:ring-[#D4450A]"
          />
          <button
            type="submit"
            className="rounded-xl bg-[#D4450A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b93c09]"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => navigate({ role: f.value, page: "1" })}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                currentRole === f.value
                  ? "bg-[#D4450A] text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Single action error */}
      {actionError && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>
      )}

      {/* Bulk delete result */}
      {bulkResult && bulkResult.skipped.length > 0 && (
        <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">
            {bulkResult.deleted.length} deleted, {bulkResult.skipped.length} skipped:
          </p>
          <ul className="mt-1 space-y-0.5 text-xs">
            {bulkResult.skipped.map((s) => (
              <li key={s.id}>
                {s.name} — {s.reason}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setBulkResult(null)}
            className="mt-2 text-xs font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
          <span className="text-sm font-semibold text-amber-800">
            {selected.size} user{selected.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              disabled={isPending}
              onClick={handleBulkSuspend}
              className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
            >
              Suspend all
            </button>
            {confirmBulkDelete ? (
              <div className="flex items-center gap-1.5">
                <span className="max-w-xs text-xs font-medium text-red-700">
                  Remove access for {selected.size} selected user{selected.size !== 1 ? "s" : ""}? Their accounts will be deactivated and anonymized.
                </span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleBulkDelete}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmBulkDelete(false)}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={handleBulkDelete}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Delete all
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="ml-1 text-sm text-zinc-400 hover:text-zinc-700"
              title="Deselect all"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile card list (<md) ── */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white md:hidden">
        {users.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-zinc-400">No users found.</p>
        ) : (
          users.map((u) => (
            <div key={`m-${u.id}`} className="border-b border-zinc-100 last:border-0">
              {/* Top section — tappable to open detail */}
              <div
                className="flex cursor-pointer items-start gap-3 px-4 py-3"
                onClick={() => setDetailUserId(u.id)}
              >
                {/* Checkbox — isolated from row click */}
                <div className="mt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggleOne(u.id)}
                    className="h-4 w-4 rounded border-zinc-300 accent-[#D4450A]"
                  />
                </div>

                {/* Avatar */}
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${ROLE_AVATAR[u.role]}`}>
                  {getInitials(u.fullName)}
                </div>

                {/* Name / email / joined / status */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold leading-tight text-zinc-900">{u.fullName}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_BADGE[u.role]}`}>
                      {u.role.charAt(0) + u.role.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">{u.email}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400">Joined {formatDate(u.createdAt)}</span>
                    {u.suspended ? (
                      <span className="rounded-full bg-[#FFF1ED] px-1.5 py-0.5 text-[9px] font-semibold text-[#D4450A]">
                        Suspended
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons — click-isolated row, non-admins only */}
              {u.role !== "ADMIN" && (
                <div
                  className="flex items-center gap-2 border-t border-zinc-50 px-4 py-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleSuspend(u.id, u.suspended)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                      u.suspended
                        ? "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    {u.suspended ? "Unsuspend" : "Suspend"}
                  </button>
                  {confirmDelete === u.id ? (
                    <>
                      <span className="max-w-[14rem] text-xs font-medium text-red-600">
                        Delete {u.fullName}? Their access will be removed and their account anonymized.
                      </span>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDelete(u.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-50"
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(u.id)}
                      className="rounded-lg border border-red-100 px-2.5 py-1 text-xs font-semibold text-red-500 hover:border-red-200 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Desktop table (md+) ── */}
      <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white md:block">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
              {/* Select all checkbox */}
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-zinc-300 accent-[#D4450A]"
                />
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">User</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Role</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Joined</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-400">
                  No users found.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr
                key={u.id}
                className="group hover:bg-zinc-50/60 transition-colors"
              >
                {/* Checkbox — click doesn't open panel */}
                <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggleOne(u.id)}
                    className="h-4 w-4 rounded border-zinc-300 accent-[#D4450A]"
                  />
                </td>

                {/* Avatar + name/email — click opens panel */}
                <td
                  className="cursor-pointer px-4 py-3"
                  onClick={() => setDetailUserId(u.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${ROLE_AVATAR[u.role]}`}
                    >
                      {getInitials(u.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-zinc-900 group-hover:text-[#D4450A] transition-colors">
                        {u.fullName}
                      </p>
                      <p className="truncate text-xs text-zinc-500">{u.email}</p>
                    </div>
                  </div>
                </td>

                {/* Role */}
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_BADGE[u.role]}`}>
                    {u.role.charAt(0) + u.role.slice(1).toLowerCase()}
                  </span>
                </td>

                {/* Joined */}
                <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                  {formatDate(u.createdAt)}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  {u.suspended ? (
                    <span className="rounded-full bg-[#FFF1ED] px-2 py-0.5 text-xs font-semibold text-[#D4450A]">
                      Suspended
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      Active
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    {u.role !== "ADMIN" && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleSuspend(u.id, u.suspended)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                          u.suspended
                            ? "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                        }`}
                      >
                        {u.suspended ? "Unsuspend" : "Suspend"}
                      </button>
                    )}
                    {u.role !== "ADMIN" && (
                      confirmDelete === u.id ? (
                        <div className="flex max-w-sm items-center gap-1">
                          <span className="text-xs font-medium text-red-600">
                            Delete {u.fullName}? Access will be removed and the account anonymized.
                          </span>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleDelete(u.id)}
                            className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(null)}
                            className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-50"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDelete(u.id)}
                          className="rounded-lg border border-red-100 px-2.5 py-1 text-xs font-semibold text-red-500 hover:border-red-200 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>{/* end desktop table */}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
          <span>{total} users total</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => navigate({ page: String(page - 1) })}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-xs">{page} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => navigate({ page: String(page + 1) })}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Detail slide-over */}
      <UserDetailPanel
        userId={detailUserId}
        onClose={() => setDetailUserId(null)}
        onAction={() => router.refresh()}
      />
    </>
  );
}
