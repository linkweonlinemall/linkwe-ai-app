"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { bulkUpdateListingStatus, deleteListing, updateListingStatus } from "@/app/actions/admin-listings";

type ListingRow = {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  priceMinor: number;
  currency: string;
  imageUrl: string | null;
  createdAt: Date;
  store: { name: string; slug: string };
  owner: { fullName: string };
};

type Props = {
  listings: ListingRow[];
  total: number;
  page: number;
  totalPages: number;
  currentQ: string;
  currentStatus: string;
  currentType: string;
  currentSort: string;
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600",
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  ARCHIVED: "bg-red-50 text-red-600",
  SUSPENDED: "bg-amber-50 text-amber-700",
};

const TYPE_LABELS: Record<string, string> = {
  PRODUCT: "Product",
  VEHICLE: "Vehicle",
  REAL_ESTATE: "Real Estate",
  EVENT: "Event",
  SERVICE: "Service",
  RESTAURANT: "Restaurant",
  PLACE: "Place",
  BOOKABLE: "Bookable",
  DIGITAL: "Digital",
  TICKET: "Ticket",
};

const STATUS_OPTIONS = ["DRAFT", "PUBLISHED", "ARCHIVED", "SUSPENDED"] as const;

export default function AdminListingsClient({
  listings,
  total,
  page,
  totalPages,
  currentQ,
  currentStatus,
  currentType,
  currentSort,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  function updateUrl(next: Record<string, string>) {
    const params = new URLSearchParams({
      q: currentQ,
      status: currentStatus,
      type: currentType,
      sort: currentSort,
      page: String(page),
      ...next,
    });
    router.push(`/dashboard/admin/listings?${params.toString()}`);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelected((prev) => (prev.length === listings.length ? [] : listings.map((l) => l.id)));
  }

  async function handleStatusChange(id: string, status: string) {
    setLoading(id);
    await updateListingStatus(id, status);
    setLoading(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    setLoading(id);
    await deleteListing(id);
    setLoading(null);
    router.refresh();
  }

  async function handleBulkAction(action: string) {
    if (selected.length === 0) return;
    if (action === "delete") {
      if (!confirm(`Delete ${selected.length} listings? This cannot be undone.`)) return;
    }
    setLoading("bulk");
    if (action === "delete") {
      for (const id of selected) {
        await deleteListing(id);
      }
    } else {
      await bulkUpdateListingStatus(selected, action);
    }
    setSelected([]);
    setLoading(null);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <input
          defaultValue={currentQ}
          placeholder="Search listings..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateUrl({ q: (e.target as HTMLInputElement).value, page: "1" });
            }
          }}
          className="min-w-48 flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
        />
        <select
          value={currentStatus}
          onChange={(e) => updateUrl({ status: e.target.value, page: "1" })}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "SUSPENDED" ? "Suspended" : s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <select
          value={currentType}
          onChange={(e) => updateUrl({ type: e.target.value, page: "1" })}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
        >
          <option value="all">All types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={currentSort}
          onChange={(e) => updateUrl({ sort: e.target.value, page: "1" })}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
        >
          <option value="createdAt_desc">Newest first</option>
          <option value="createdAt_asc">Oldest first</option>
          <option value="title_asc">Title A-Z</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      {selected.length > 0 ? (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#D4450A]/20 bg-[#D4450A]/10 p-3">
          <span className="text-sm font-medium text-[#D4450A]">{selected.length} selected</span>
          <button
            type="button"
            onClick={() => handleBulkAction("PUBLISHED")}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs text-white hover:opacity-90"
          >
            Publish
          </button>
          <button
            type="button"
            onClick={() => handleBulkAction("ARCHIVED")}
            className="rounded-lg bg-zinc-500 px-3 py-1.5 text-xs text-white hover:opacity-90"
          >
            Archive
          </button>
          <button
            type="button"
            onClick={() => handleBulkAction("delete")}
            className="rounded-lg bg-red-500 px-3 py-1.5 text-xs text-white hover:opacity-90"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setSelected([])}
            className="ml-auto text-xs text-zinc-500 transition-colors hover:text-zinc-800"
          >
            Clear
          </button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50">
            <tr>
              <th className="w-10 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selected.length === listings.length && listings.length > 0}
                  onChange={toggleAll}
                  aria-label="Select all"
                  className="rounded"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Listing</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Type</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Store</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Price</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Date</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {listings.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-zinc-400">
                  No listings found
                </td>
              </tr>
            ) : (
              listings.map((listing) => (
                <tr
                  key={listing.id}
                  className={`transition-colors hover:bg-zinc-50 ${
                    selected.includes(listing.id) ? "bg-[#D4450A]/5" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(listing.id)}
                      onChange={() => toggleSelect(listing.id)}
                      className="rounded"
                      aria-label={`Select ${listing.title}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                        {listing.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={listing.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <span className="text-lg text-zinc-300">📋</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="max-w-48 truncate font-medium text-zinc-900">{listing.title}</p>
                        <p className="truncate text-xs text-zinc-400">{listing.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                      {TYPE_LABELS[listing.type] ?? listing.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="max-w-32 truncate text-sm text-zinc-700">{listing.store.name}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {listing.currency} {(listing.priceMinor / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[listing.status] ?? "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {listing.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {new Date(listing.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <select
                        value={listing.status}
                        onChange={(e) => handleStatusChange(listing.id, e.target.value)}
                        disabled={loading === listing.id}
                        className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs focus:border-[#D4450A] focus:outline-none"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s === "DRAFT" ? "Draft" : s.charAt(0) + s.slice(1).toLowerCase()}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleDelete(listing.id)}
                        disabled={loading === listing.id}
                        className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        title="Delete"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4h6v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3">
            <p className="text-xs text-zinc-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <button
                  type="button"
                  onClick={() => updateUrl({ page: String(page - 1) })}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-50"
                >
                  Previous
                </button>
              ) : null}
              {page < totalPages ? (
                <button
                  type="button"
                  onClick={() => updateUrl({ page: String(page + 1) })}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-50"
                >
                  Next
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
