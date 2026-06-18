"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { IdVerificationStatus, StoreStatus } from "@prisma/client";
import { useState } from "react";

import {
  adminDeleteStore,
  chargeVendorSubscriptionFromBalance,
  setVendorPlan,
  updateStoreStatus,
} from "@/app/actions/admin-stores";

type StoreRow = {
  id: string;
  name: string;
  slug: string;
  status: StoreStatus;
  subscriptionPlan: "STARTER" | "GROWTH" | "PRO";
  region: string;
  logoUrl: string | null;
  createdAt: Date;
  owner: {
    fullName: string;
    email: string;
    idVerificationStatus: IdVerificationStatus;
  };
  _count: { products: number };
};

type Props = {
  stores: StoreRow[];
  page: number;
  totalPages: number;
  currentQ: string;
  currentStatus: string;
  currentSort: string;
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700",
};

const ID_STATUS_COLORS: Record<string, string> = {
  UNSUBMITTED: "bg-zinc-100 text-zinc-500",
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-[#FFF1ED] text-[#D4450A]",
};

export default function AdminStoresClient({
  stores,
  page,
  totalPages,
  currentQ,
  currentStatus,
  currentSort,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelected((prev) => (prev.length === stores.length ? [] : stores.map((s) => s.id)));
  }

  async function handleBulkStatus(status: string) {
    if (selected.length === 0) return;
    setLoading("bulk");
    for (const id of selected) {
      await updateStoreStatus(id, status);
    }
    setSelected([]);
    setLoading(null);
    router.refresh();
  }

  async function handleBulkDelete() {
    if (selected.length === 0) return;
    if (!confirm(`Delete ${selected.length} stores? This cannot be undone.`)) return;
    setLoading("bulk");
    for (const id of selected) {
      await adminDeleteStore(id);
    }
    setSelected([]);
    setLoading(null);
    router.refresh();
  }

  function updateUrl(params: Record<string, string>) {
    const qs = new URLSearchParams({
      q: currentQ,
      status: currentStatus,
      sort: currentSort,
      page: "1",
      ...params,
    });
    router.push(`/dashboard/admin/stores?${qs}`);
  }

  async function handleStatusChange(id: string, status: string) {
    if (loading === "bulk") return;
    setLoading(id);
    await updateStoreStatus(id, status);
    setLoading(null);
    router.refresh();
  }

  async function handlePlanChange(id: string, plan: string) {
    if (loading === "bulk") return;
    setLoading(id);
    await setVendorPlan(id, plan);
    setLoading(null);
    router.refresh();
  }

  async function handleChargeSubscription(id: string) {
    if (loading === "bulk") return;
    setLoading(id);
    const result = await chargeVendorSubscriptionFromBalance(id);
    setLoading(null);
    router.refresh();
    if (result.ok) {
      if (result.charged) {
        alert("Charged from balance");
      } else {
        alert(`Not charged: ${result.reason ?? "unknown"}`);
      }
    } else {
      alert(`Not charged: ${result.error ?? "unknown"}`);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (
      !confirm(
        `Delete "${name}"? This will remove all products and data. Cannot be undone.`,
      )
    )
      return;
    if (loading === "bulk") return;
    setLoading(id);
    await adminDeleteStore(id);
    setLoading(null);
    router.refresh();
  }

  function formatDate(date: Date): string {
    const d = new Date(date);
    const day = d.getUTCDate();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    return `${day} ${month} ${year}`;
  }

  return (
    <div>
      <div
        className="
          mb-4 flex flex-wrap gap-3 rounded-2xl border border-zinc-200 bg-white
          p-4 shadow-sm
        "
      >
        <input
          defaultValue={currentQ}
          placeholder="Search stores, vendors, emails..."
          className="
            min-w-48 flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm
            focus:border-[#D4450A] focus:outline-none
          "
          onKeyDown={(e) => {
            if (e.key === "Enter")
              updateUrl({ q: (e.target as HTMLInputElement).value });
          }}
        />
        <select
          value={currentStatus}
          className="
            rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm
            focus:outline-none
          "
          onChange={(e) => updateUrl({ status: e.target.value })}
        >
          <option value="all">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_APPROVAL">Pending approval</option>
        </select>
        <select
          value={currentSort}
          className="
            rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm
            focus:outline-none
          "
          onChange={(e) => updateUrl({ sort: e.target.value })}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name_asc">Name A-Z</option>
        </select>
      </div>

      {selected.length > 0 ? (
        <div
          className="
            mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#D4450A]/20
            bg-[#D4450A]/10 p-3
          "
        >
          <span className="text-sm font-medium text-[#D4450A]">
            {selected.length} store{selected.length !== 1 ? "s" : ""} selected
          </span>
          <button
            type="button"
            disabled={loading === "bulk"}
            className="
              rounded-lg bg-emerald-500 px-3 py-1.5 text-xs text-white
              hover:opacity-90 disabled:opacity-50
            "
            onClick={() => handleBulkStatus("ACTIVE")}
          >
            Activate
          </button>
          <button
            type="button"
            disabled={loading === "bulk"}
            className="
              rounded-lg bg-amber-500 px-3 py-1.5 text-xs text-white
              hover:opacity-90 disabled:opacity-50
            "
            onClick={() => handleBulkStatus("SUSPENDED")}
          >
            Suspend
          </button>
          <button
            type="button"
            disabled={loading === "bulk"}
            className="
              rounded-lg bg-zinc-500 px-3 py-1.5 text-xs text-white
              hover:opacity-90 disabled:opacity-50
            "
            onClick={() => handleBulkStatus("DRAFT")}
          >
            Set to Draft
          </button>
          <button
            type="button"
            disabled={loading === "bulk"}
            className="
              rounded-lg bg-red-500 px-3 py-1.5 text-xs text-white
              hover:opacity-90 disabled:opacity-50
            "
            onClick={() => void handleBulkDelete()}
          >
            Delete
          </button>
          <button
            type="button"
            disabled={loading === "bulk"}
            className="
              ml-auto text-xs text-zinc-500
              hover:text-zinc-800 disabled:opacity-50
            "
            onClick={() => setSelected([])}
          >
            Clear selection
          </button>
        </div>
      ) : null}

      {stores.length > 0 ? (
        <div className="mb-3 flex items-center gap-2 px-1">
          <input
            checked={selected.length === stores.length && stores.length > 0}
            className="rounded"
            disabled={loading === "bulk"}
            type="checkbox"
            onChange={toggleAll}
          />
          <span className="text-xs text-zinc-500">Select all</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {stores.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
            <p className="text-sm text-zinc-400">No stores found</p>
          </div>
        ) : (
          stores.map((store) => (
            <div
              key={store.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              {/* ── Top row: checkbox + logo + name (+ pills/metadata/actions inline on desktop) ── */}
              <div className="flex items-start gap-3 md:gap-4">
                <input
                  checked={selected.includes(store.id)}
                  className="mt-1 rounded"
                  disabled={loading === "bulk" || loading === store.id}
                  type="checkbox"
                  onChange={() => toggleSelect(store.id)}
                />
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                  {store.logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      alt=""
                      className="h-full w-full object-cover"
                      src={store.logoUrl}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="font-bold text-zinc-400">{store.name[0]}</span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {/* Name — max 2 lines on mobile so it never crowds the row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="line-clamp-2 font-semibold text-zinc-900 md:line-clamp-none">
                      {store.name}
                    </p>
                    {/* Status pills — desktop only; mobile renders them in the block below */}
                    <span
                      className={`hidden rounded-full px-2 py-0.5 text-[10px] font-bold md:inline-flex ${STATUS_COLORS[store.status] ?? "bg-zinc-100 text-zinc-600"}`}
                    >
                      {store.status.replace(/_/g, " ")}
                    </span>
                    <span
                      className={`hidden rounded-full px-2 py-0.5 text-[10px] md:inline-flex ${ID_STATUS_COLORS[store.owner.idVerificationStatus] ?? "bg-zinc-100 text-zinc-500"}`}
                    >
                      ID: {store.owner.idVerificationStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                  {/* Desktop-only: owner/email + metadata below name */}
                  <p className="mt-0.5 hidden text-xs text-zinc-500 md:block">
                    {store.owner.fullName} · {store.owner.email}
                  </p>
                  <div className="mt-1.5 hidden flex-wrap items-center gap-4 text-xs text-zinc-400 md:flex">
                    <span>/{store.slug}</span>
                    {store.region ? <span>📍 {store.region}</span> : null}
                    <span>📦 {store._count.products} products</span>
                    <span>📅 {formatDate(store.createdAt)}</span>
                  </div>
                </div>

                {/* Desktop-only: actions right column */}
                <div className="hidden shrink-0 flex-wrap items-center gap-2 md:flex">
                  <Link
                    href={`/store/${store.slug}`}
                    target="_blank"
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-50"
                  >
                    View store
                  </Link>
                  <select
                    title="Plan"
                    aria-label="Plan"
                    value={store.subscriptionPlan}
                    disabled={loading === store.id || loading === "bulk"}
                    className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs focus:outline-none"
                    onChange={(e) => handlePlanChange(store.id, e.target.value)}
                  >
                    <option value="STARTER">Starter</option>
                    <option value="GROWTH">Growth</option>
                    <option value="PRO">Pro</option>
                  </select>
                  <button
                    type="button"
                    title="Charge subscription from balance"
                    disabled={loading === store.id || loading === "bulk"}
                    className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                    onClick={() => void handleChargeSubscription(store.id)}
                  >
                    Charge sub (balance)
                  </button>
                  <select
                    value={store.status}
                    disabled={loading === store.id || loading === "bulk"}
                    className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs focus:outline-none"
                    onChange={(e) => handleStatusChange(store.id, e.target.value)}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PENDING_APPROVAL">Pending approval</option>
                    <option value="ACTIVE">Active</option>
                  </select>
                  <button
                    type="button"
                    title="Delete store"
                    disabled={loading === store.id || loading === "bulk"}
                    className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    onClick={() => handleDelete(store.id, store.name)}
                  >
                    <svg
                      aria-hidden
                      fill="none"
                      height="14"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      width="14"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* ── Mobile-only: pills + metadata block + actions row ── */}
              <div className="mt-2 md:hidden">
                {/* Status pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[store.status] ?? "bg-zinc-100 text-zinc-600"}`}
                  >
                    {store.status.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${ID_STATUS_COLORS[store.owner.idVerificationStatus] ?? "bg-zinc-100 text-zinc-500"}`}
                  >
                    ID: {store.owner.idVerificationStatus.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Metadata — clean stacked block */}
                <div className="mt-2 text-xs">
                  <p className="font-medium text-zinc-700">{store.owner.fullName}</p>
                  <p className="text-zinc-400">{store.owner.email}</p>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-zinc-400">
                    <span>/{store.slug}</span>
                    {store.region ? <span>📍 {store.region}</span> : null}
                    <span>📦 {store._count.products} products</span>
                    <span>📅 {formatDate(store.createdAt)}</span>
                  </div>
                </div>

                {/* Actions row — full-width, delete visually separated */}
                <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 pt-3">
                  <Link
                    href={`/store/${store.slug}`}
                    target="_blank"
                    className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-center text-xs text-zinc-600 transition-colors hover:bg-zinc-50"
                  >
                    View store
                  </Link>
                  <select
                    title="Plan"
                    aria-label="Plan"
                    value={store.subscriptionPlan}
                    disabled={loading === store.id || loading === "bulk"}
                    className="flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs focus:outline-none"
                    onChange={(e) => handlePlanChange(store.id, e.target.value)}
                  >
                    <option value="STARTER">Starter</option>
                    <option value="GROWTH">Growth</option>
                    <option value="PRO">Pro</option>
                  </select>
                  <select
                    value={store.status}
                    disabled={loading === store.id || loading === "bulk"}
                    className="flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs focus:outline-none"
                    onChange={(e) => handleStatusChange(store.id, e.target.value)}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PENDING_APPROVAL">Pending approval</option>
                    <option value="ACTIVE">Active</option>
                  </select>
                  <button
                    type="button"
                    title="Delete store"
                    disabled={loading === store.id || loading === "bulk"}
                    className="ml-1 rounded-lg border border-red-100 bg-red-50 p-2.5 text-red-400 transition-colors hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                    onClick={() => handleDelete(store.id, store.name)}
                  >
                    <svg
                      aria-hidden
                      fill="none"
                      height="14"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      width="14"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-zinc-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <button
                type="button"
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-50"
                onClick={() => updateUrl({ page: String(page - 1) })}
              >
                Previous
              </button>
            ) : null}
            {page < totalPages ? (
              <button
                type="button"
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-50"
                onClick={() => updateUrl({ page: String(page + 1) })}
              >
                Next
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
