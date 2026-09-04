"use client";

import { useEffect, useState, useTransition } from "react";
import type { UserRole } from "@prisma/client";
import {
  getAdminUserDetail,
  suspendUser,
  unsuspendUser,
  deleteUser,
} from "@/app/actions/admin-users";

type DetailData = Awaited<ReturnType<typeof getAdminUserDetail>>;

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

const ID_STATUS_BADGE: Record<string, string> = {
  UNSUBMITTED: "bg-zinc-100 text-zinc-500",
  PENDING:     "bg-amber-50 text-amber-700",
  APPROVED:    "bg-emerald-50 text-emerald-700",
  REJECTED:    "bg-[#FFF1ED] text-[#D4450A]",
};

const STORE_STATUS_BADGE: Record<string, string> = {
  DRAFT:            "bg-zinc-100 text-zinc-500",
  ACTIVE:           "bg-emerald-50 text-emerald-700",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700",
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-TT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTTD(minor: number) {
  return "TTD " + (minor / 100).toLocaleString("en-TT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function starRating(avg: number) {
  const stars = Math.round(avg * 2) / 2;
  return `${stars.toFixed(1)} ★`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="shrink-0 text-xs text-zinc-500">{label}</span>
      <span className="text-right text-xs font-medium text-zinc-800">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
        {title}
      </p>
      <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-100 bg-zinc-50 px-3">
        {children}
      </div>
    </div>
  );
}

type Props = {
  userId: string | null;
  onClose: () => void;
  onAction: () => void;
};

export default function UserDetailPanel({ userId, onClose, onAction }: Props) {
  const [data, setData] = useState<DetailData>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isOpen = userId !== null;

  useEffect(() => {
    if (!userId) {
      setData(null);
      setConfirmDelete(false);
      setActionError(null);
      return;
    }
    setLoading(true);
    setError(null);
    getAdminUserDetail(userId)
      .then(setData)
      .catch(() => setError("Could not load user details."))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  function handleSuspend() {
    if (!data) return;
    const { user } = data;
    setActionError(null);
    startTransition(async () => {
      const res = user.suspended ? await unsuspendUser(user.id) : await suspendUser(user.id);
      if (!res.ok) { setActionError(res.error ?? "Action failed."); return; }
      onAction();
      onClose();
    });
  }

  function handleDelete() {
    if (!data) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setActionError(null);
    startTransition(async () => {
      const res = await deleteUser(data.user.id);
      if (!res.ok) { setActionError(res.error ?? "Could not delete."); setConfirmDelete(false); return; }
      onAction();
      onClose();
    });
  }

  const user = data?.user ?? null;
  const store = user?.storesOwned?.[0] ?? null;
  const { vendorStats, customerStats } = data ?? {};

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-96 flex-col bg-white shadow-2xl transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <p className="text-sm font-semibold text-zinc-800">User Details</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center py-16 text-sm text-zinc-400">
              Loading…
            </div>
          )}
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          {user && !loading && (
            <>
              {/* Identity header */}
              <div className="mb-5 flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold ${ROLE_AVATAR[user.role]}`}
                >
                  {getInitials(user.fullName)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-zinc-900">{user.fullName}</p>
                  <p className="truncate text-xs text-zinc-500">{user.email}</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_BADGE[user.role]}`}
                  >
                    {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                  </span>
                </div>
              </div>

              {/* Account */}
              <Section title="Account">
                <Row
                  label="User ID"
                  value={
                    <button
                      type="button"
                      title="Click to copy"
                      className="font-mono text-[10px] text-zinc-600 hover:text-[#D4450A]"
                      onClick={() => navigator.clipboard.writeText(user.id).catch(() => {})}
                    >
                      {user.id.slice(0, 16)}…
                    </button>
                  }
                />
                <Row label="Joined" value={formatDate(user.createdAt)} />
                <Row label="Last active" value={formatDate(user.updatedAt)} />
                <Row
                  label="Status"
                  value={
                    user.suspended ? (
                      <span className="rounded-full bg-[#FFF1ED] px-2 py-0.5 text-[10px] font-semibold text-[#D4450A]">
                        Suspended
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        Active
                      </span>
                    )
                  }
                />
              </Section>

              {/* ── VENDOR: Store Performance ── */}
              {user.role === "VENDOR" && store && vendorStats && (
                <Section title="Store Performance">
                  <Row
                    label="Store"
                    value={
                      <a
                        href={`/store/${store.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#D4450A] hover:underline"
                      >
                        {store.name} ↗
                      </a>
                    }
                  />
                  <Row
                    label="Status"
                    value={
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STORE_STATUS_BADGE[store.status] ?? "bg-zinc-100 text-zinc-500"}`}
                      >
                        {store.status.replace(/_/g, " ")}
                      </span>
                    }
                  />
                  <Row label="Products listed" value={store._count.products} />
                  <Row
                    label="Total orders"
                    value={vendorStats.completedOrders + vendorStats.pendingOrders}
                  />
                  <Row
                    label="Pending orders"
                    value={
                      <span
                        className={
                          vendorStats.pendingOrders > 0 ? "font-semibold text-amber-700" : ""
                        }
                      >
                        {vendorStats.pendingOrders}
                      </span>
                    }
                  />
                  <Row label="Total earnings" value={formatTTD(vendorStats.totalEarningsMinor)} />
                  <Row label="Bookings" value={vendorStats.totalBookings} />
                  <Row label="On-demand requests" value={vendorStats.onDemandRequests} />
                  <Row
                    label="Reviews"
                    value={
                      vendorStats.reviewCount > 0
                        ? `${vendorStats.reviewCount} · ${starRating(vendorStats.avgRating)}`
                        : "None yet"
                    }
                  />
                </Section>
              )}

              {/* ── VENDOR: no store yet ── */}
              {user.role === "VENDOR" && !store && (
                <Section title="Store Performance">
                  <div className="py-3 text-center text-xs text-zinc-400">
                    No store created yet.
                  </div>
                </Section>
              )}

              {/* ── CUSTOMER: Activity ── */}
              {user.role === "CUSTOMER" && customerStats && (
                <Section title="Activity">
                  <Row label="Orders placed" value={customerStats.totalOrders} />
                  <Row label="Total spent" value={formatTTD(customerStats.totalSpentMinor)} />
                  <Row label="Bookings made" value={customerStats.totalBookings} />
                  <Row label="On-demand requests" value={customerStats.onDemandRequests} />
                  <Row label="Reviews written" value={customerStats.reviewsWritten} />
                </Section>
              )}

              {/* ── COURIER: Basic info ── */}
              {user.role === "COURIER" && (
                <Section title="Courier Info">
                  {user.region && <Row label="Region" value={user.region} />}
                  {user.vehicleType && <Row label="Vehicle type" value={user.vehicleType} />}
                  <div className="py-3 text-center text-xs text-zinc-400">
                    Detailed courier stats coming soon.
                  </div>
                </Section>
              )}

              {/* Identity Verification */}
              <Section title="Identity Verification">
                <Row
                  label="Status"
                  value={
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ID_STATUS_BADGE[user.idVerificationStatus] ?? "bg-zinc-100 text-zinc-500"}`}
                    >
                      {user.idVerificationStatus.replace(/_/g, " ")}
                    </span>
                  }
                />
                {user.idDocumentUrl && (
                  <Row
                    label="Document"
                    value={
                      <a
                        href={user.idDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#D4450A] hover:underline"
                      >
                        View document ↗
                      </a>
                    }
                  />
                )}
              </Section>

              {actionError && (
                <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
                  {actionError}
                </div>
              )}
            </>
          )}
        </div>

        {/* Action footer */}
        {user && (
          <div className="border-t border-zinc-100 px-5 py-4">
            <div className="flex flex-col gap-2">
              {user.role !== "ADMIN" && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSuspend}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                    user.suspended
                      ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {user.suspended ? "Unsuspend user" : "Suspend user"}
                </button>
              )}
              {user.role !== "ADMIN" && (
                confirmDelete ? (
                  <div className="space-y-2">
                    <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium leading-5 text-red-700">
                      Delete {user.fullName}? Their access will be removed and their account details anonymized. Order and payment records will be preserved.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={handleDelete}
                        className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Yes, delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleDelete}
                    className="w-full rounded-xl border border-red-100 px-4 py-2.5 text-sm font-semibold text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete user
                  </button>
                )
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-500 hover:bg-zinc-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
