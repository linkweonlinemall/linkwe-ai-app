"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowUpRight,
  MapPin,
  Package,
  Store,
  UserRound,
  Settings2,
  Search,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminDeleteStore,
  chargeVendorSubscriptionFromBalance,
  setVendorPlan,
  updateStoreStatus,
  type getAdminStores,
} from "@/app/actions/admin-stores";
import { optionLabel } from "@/lib/admin/record-design";
type StoreRow = Awaited<ReturnType<typeof getAdminStores>>["stores"][number];
type Props = {
  stores: StoreRow[];
  page: number;
  totalPages: number;
  currentQ: string;
  currentStatus: string;
  currentSort: string;
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
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  function navigate(params: Record<string, string>) {
    setSelected([]);
    router.push(
      `/dashboard/admin/stores?${new URLSearchParams({ q: currentQ, status: currentStatus, sort: currentSort, page: "1", ...params })}`,
    );
  }
  async function run(
    ids: string[],
    action: "status" | "plan" | "delete" | "charge",
    value?: string,
  ) {
    const summary =
      action === "status"
        ? `Set ${ids.length} store(s) to ${optionLabel(value!)}? Storefront visibility changes immediately.`
        : action === "plan"
          ? `Change this store to ${optionLabel(value!)}? This changes plan access and fees.`
          : action === "charge"
            ? "Charge the vendor's subscription from their earnings balance? This deducts money if eligible."
            : `Permanently delete ${ids.length} empty store(s)? Stores with catalogue or customer history must be kept as drafts.`;
    if (!window.confirm(summary)) return;
    setBusy(true);
    setErrors([]);
    const failures: string[] = [];
    let completed = 0;
    try {
      for (const id of ids) {
        try {
          const result =
            action === "status"
              ? await updateStoreStatus(id, value!)
              : action === "plan"
                ? await setVendorPlan(id, value!)
                : action === "charge"
                  ? await chargeVendorSubscriptionFromBalance(id)
                  : await adminDeleteStore(id);
          if (!result.ok) {
            failures.push(
              `${stores.find((s) => s.id === id)?.name || id}: ${"error" in result ? result.error : "Unable to complete"}`,
            );
          } else if (
            action === "charge" &&
            "charged" in result &&
            !result.charged
          ) {
            failures.push(
              `Not charged: ${"reason" in result ? result.reason : "Not eligible"}`,
            );
          } else completed++;
        } catch {
          failures.push(
            `${stores.find((s) => s.id === id)?.name || id}: could not complete the action.`,
          );
        }
      }
      if (completed)
        toast.success(
          `${completed} store${completed === 1 ? "" : "s"} updated`,
        );
      setErrors(failures);
      setSelected([]);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <form
        className="admin-filterbar"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          navigate({
            q: String(form.get("q") || ""),
            status: String(form.get("status") || "all"),
            sort: String(form.get("sort") || "newest"),
          });
        }}
      >
        <div className="relative min-w-44 flex-1">
          <Search size={16} className="absolute left-3 top-4 text-zinc-400" />
          <input
            className="admin-input pl-10"
            name="q"
            defaultValue={currentQ}
            placeholder="Store, owner or email…"
            aria-label="Search stores"
          />
        </div>
        <select
          name="status"
          className="admin-input"
          defaultValue={currentStatus}
          aria-label="Store status"
        >
          <option value="all">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_APPROVAL">Pending approval</option>
        </select>
        <select
          name="sort"
          className="admin-input"
          defaultValue={currentSort}
          aria-label="Sort stores"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name_asc">Name A–Z</option>
        </select>
        <button className="admin-button admin-button-primary">
          Apply filters
        </button>
        {(currentQ || currentStatus !== "all") && (
          <Link className="admin-button" href="/dashboard/admin/stores">
            Clear
          </Link>
        )}
      </form>
      {errors.length > 0 && (
        <div role="alert" className="admin-alert">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-h-10 items-center gap-2 text-xs text-[#718890]">
          <input
            type="checkbox"
            checked={
              stores.length > 0 && stores.every((s) => selected.includes(s.id))
            }
            disabled={busy || !stores.length}
            onChange={(e) =>
              setSelected(e.target.checked ? stores.map((s) => s.id) : [])
            }
          />
          Select this page
        </label>
        <span className="admin-muted">
          Page {page} of {Math.max(1, totalPages)}
        </span>
      </div>
      {selected.length > 0 && (
        <div className="admin-context">
          <strong>{selected.length} selected</strong>
          <button
            className="admin-button"
            disabled={busy}
            onClick={() => void run(selected, "status", "ACTIVE")}
          >
            Publish
          </button>
          <button
            className="admin-button"
            disabled={busy}
            onClick={() => void run(selected, "status", "PENDING_APPROVAL")}
          >
            Send for review
          </button>
          <button
            className="admin-button"
            disabled={busy}
            onClick={() => void run(selected, "status", "DRAFT")}
          >
            Set to draft
          </button>
          <button
            className="admin-button"
            disabled={busy}
            onClick={() => void run(selected, "delete")}
          >
            Delete empty stores
          </button>
          <button
            className="ml-auto text-xs underline"
            disabled={busy}
            onClick={() => setSelected([])}
          >
            Clear selection
          </button>
        </div>
      )}
      <div className="grid gap-5 xl:grid-cols-2">
        {stores.map((store) => (
          <article
            className="overflow-hidden rounded-[20px] border border-[#dfe7e7] bg-white shadow-sm"
            key={store.id}
          >
            <div className="relative h-32 bg-[#dfece7]">
              {store.coverPhotoUrl ? (
                <img
                  src={store.coverPhotoUrl}
                  className="h-full w-full object-cover"
                  alt=""
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#caddd5] to-[#eaf1df]">
                  <Store size={38} className="text-[#6a9685]" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
              <label className="absolute left-4 top-4 rounded-lg bg-white/95 p-2">
                <input
                  aria-label={`Select ${store.name}`}
                  className="block h-4 w-4"
                  type="checkbox"
                  disabled={busy}
                  checked={selected.includes(store.id)}
                  onChange={(e) =>
                    setSelected((ids) =>
                      e.target.checked
                        ? [...ids, store.id]
                        : ids.filter((id) => id !== store.id),
                    )
                  }
                />
              </label>
              <span className="admin-badge absolute right-4 top-4 bg-white/95">
                {optionLabel(store.status)}
              </span>
            </div>
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="-mt-10 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-sm">
                  {store.logoUrl ? (
                    <img
                      src={store.logoUrl}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Store size={28} className="text-[#749789]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold leading-snug tracking-[-.6px]">
                    {store.name}
                  </h2>
                  <p className="mt-1 truncate text-[10px] text-[#8a9a9e]">
                    /{store.slug}
                  </p>
                </div>
                <span className="admin-badge admin-badge-orange">
                  {optionLabel(store.subscriptionPlan)}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Link
                  href={`/dashboard/admin/records/user/${store.owner.id}`}
                  className="flex min-w-0 items-start gap-2 text-xs"
                >
                  <UserRound
                    size={16}
                    className="mt-0.5 shrink-0 text-[#86a29d]"
                  />
                  <span className="min-w-0">
                    <strong className="block font-medium">
                      {store.owner.fullName}
                    </strong>
                    <span className="mt-1 block truncate text-[10px] text-[#85979d]">
                      {store.owner.email}
                    </span>
                  </span>
                </Link>
                <div className="space-y-2 text-xs text-[#70878e]">
                  <p className="flex items-center gap-2">
                    <MapPin size={14} />
                    {store.region}
                  </p>
                  <p className="flex items-center gap-2">
                    <Package size={14} />
                    {store._count.products} catalogue items
                  </p>
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <Link
                  href={`/dashboard/admin/records/store/${store.id}`}
                  className="admin-button admin-button-primary flex-1"
                >
                  Manage store
                  <ArrowUpRight size={15} />
                </Link>
                <Link
                  href={`/store/${store.slug}`}
                  target="_blank"
                  className="admin-button"
                >
                  View
                  <ArrowUpRight size={14} />
                </Link>
              </div>
              <details className="mt-3">
                <summary className="flex min-h-10 cursor-pointer items-center gap-2 text-[11px] text-[#7b9197]">
                  <Settings2 size={14} />
                  Publication, plan & advanced actions
                </summary>
                <div className="mt-2 space-y-4 rounded-xl bg-[#f5f8f7] p-4">
                  <div className="admin-form-grid">
                    <label className="admin-field">
                      <span className="admin-field-label">Store status</span>
                      <select
                        className="admin-input"
                        value={store.status}
                        disabled={busy}
                        onChange={(e) =>
                          void run([store.id], "status", e.target.value)
                        }
                      >
                        {["DRAFT", "PENDING_APPROVAL", "ACTIVE"].map(
                          (status) => (
                            <option key={status} value={status}>
                              {optionLabel(status)}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <label className="admin-field">
                      <span className="admin-field-label">
                        Subscription plan
                      </span>
                      <select
                        className="admin-input"
                        value={store.subscriptionPlan}
                        disabled={busy}
                        onChange={(e) =>
                          void run([store.id], "plan", e.target.value)
                        }
                      >
                        {["STARTER", "GROWTH", "PRO"].map((plan) => (
                          <option key={plan} value={plan}>
                            {optionLabel(plan)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className="admin-muted">
                    Identity verification:{" "}
                    {optionLabel(store.owner.idVerificationStatus)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="admin-button"
                      disabled={busy}
                      onClick={() => void run([store.id], "charge")}
                    >
                      <Wallet size={14} />
                      Charge subscription from balance
                    </button>
                    <button
                      className="admin-button text-red-700"
                      disabled={busy}
                      onClick={() => void run([store.id], "delete")}
                    >
                      Delete empty store
                    </button>
                  </div>
                </div>
              </details>
            </div>
          </article>
        ))}
      </div>
      {!stores.length && (
        <div className="admin-empty">
          <Store className="mx-auto mb-3" />
          <strong>No stores match these filters.</strong>
          <p>Try another name, owner or publication status.</p>
        </div>
      )}
      <nav className="mt-6 flex justify-between gap-3" aria-label="Store pages">
        <button
          className="admin-button"
          disabled={page <= 1}
          onClick={() => navigate({ page: String(page - 1) })}
        >
          ← Previous
        </button>
        <button
          className="admin-button"
          disabled={page >= totalPages}
          onClick={() => navigate({ page: String(page + 1) })}
        >
          Next →
        </button>
      </nav>
    </div>
  );
}
