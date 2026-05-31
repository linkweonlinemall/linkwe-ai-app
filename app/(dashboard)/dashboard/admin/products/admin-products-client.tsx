"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Fragment,
  useCallback,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import type {
  AdminProductRow,
  AdminProductStatus,
} from "@/app/actions/admin-products";
import {
  bulkDeleteProducts,
  bulkUpdateProductStatus,
  deleteProduct,
  updateProductStatus,
} from "@/app/actions/admin-products";

type Props = {
  adminName: string;
  stores: { id: string; name: string }[];
  initial: {
    items: AdminProductRow[];
    total: number;
    page: number;
    totalPages: number;
    pageSize: number;
  };
  query: {
    q: string;
    storeId: string;
    status: string;
    sort: string;
    page: number;
  };
};

function statusBadgeClass(status: AdminProductStatus) {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-800 ring-emerald-700/20";
    case "draft":
      return "bg-zinc-100 text-zinc-700 ring-zinc-700/20";
  }
}

function toQueryString(full: Props["query"]): string {
  const p = new URLSearchParams();
  const qv = full.q.trim();
  if (qv) p.set("q", qv);
  const sid = full.storeId.trim();
  if (sid) p.set("storeId", sid);
  if (full.status && full.status !== "all") p.set("status", full.status);
  if (full.sort && full.sort !== "createdAt_desc") p.set("sort", full.sort);
  if (full.page > 1) p.set("page", String(full.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export default function AdminProductsClient({
  adminName: _adminName,
  stores,
  initial,
  query,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<AdminProductRow | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allIds = useMemo(() => initial.items.map((r) => r.id), [initial.items]);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
      setSelected(new Set());
    });
  }, [router]);

  const onFilterSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = String(fd.get("q") ?? "");
    const storeId = String(fd.get("storeId") ?? "");
    const status = String(fd.get("status") ?? "all");
    const sort = String(fd.get("sort") ?? "createdAt_desc");
    router.push(
      `${pathname}${toQueryString({ ...query, q, storeId, status, sort, page: 1 })}`
    );
  };

  const runBulk = async (status: AdminProductStatus) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setError(null);
    startTransition(async () => {
      await bulkUpdateProductStatus(ids, status);
      refresh();
    });
  };

  const runBulkDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} product(s)? This cannot be undone for items without order history.`)) return;
    setError(null);
    startTransition(async () => {
      const r = await bulkDeleteProducts(ids);
      if (!r.ok && "error" in r) setError(r.error);
      refresh();
    });
  };

  const quickStatus = (id: string, next: AdminProductStatus) => {
    setError(null);
    startTransition(async () => {
      await updateProductStatus(id, next);
      refresh();
    });
  };

  const removeOne = async (id: string) => {
    setError(null);
    startTransition(async () => {
      const r = await deleteProduct(id);
      if (!r.ok) setError(r.error);
      setConfirmDeleteId(null);
      refresh();
    });
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">All products</h1>
            <p className="text-sm text-zinc-500">
              {initial.total} product{initial.total !== 1 ? "s" : ""} • Page{" "}
              {initial.page} of {initial.totalPages}
            </p>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <form
          onSubmit={onFilterSubmit}
          className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <div className="min-w-[12rem] flex-1">
            <label className="block text-xs font-medium text-zinc-600">
              Search name
            </label>
            <input
              name="q"
              type="search"
              defaultValue={query.q}
              placeholder="Product name..."
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="min-w-[10rem]">
            <label className="block text-xs font-medium text-zinc-600">Store</label>
            <select
              name="storeId"
              defaultValue={query.storeId}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">All stores</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[9rem]">
            <label className="block text-xs font-medium text-zinc-600">
              Status
            </label>
            <select
              name="status"
              defaultValue={query.status}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <div className="min-w-[11rem]">
            <label className="block text-xs font-medium text-zinc-600">
              Sort
            </label>
            <select
              name="sort"
              defaultValue={query.sort}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="createdAt_desc">Newest</option>
              <option value="createdAt_asc">Oldest</option>
              <option value="price_desc">Price high</option>
              <option value="price_asc">Price low</option>
              <option value="name_asc">Name A–Z</option>
              <option value="name_desc">Name Z–A</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[#1C1C1A] px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Apply
          </button>
        </form>

        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm">
          <span className="text-xs font-medium text-zinc-600">Bulk:</span>
          <button
            type="button"
            disabled={pending || selected.size === 0}
            onClick={() => void runBulk("active")}
            className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900 disabled:opacity-40"
          >
            Approve (publish)
          </button>
          <button
            type="button"
            disabled={pending || selected.size === 0}
            onClick={() => void runBulk("draft")}
            className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-800 disabled:opacity-40"
          >
            Draft
          </button>
          <button
            type="button"
            disabled={pending || selected.size === 0}
            onClick={() => void runBulkDelete()}
            className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800 disabled:opacity-40"
          >
            Delete
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-medium tracking-wide text-zinc-600 uppercase">
              <tr>
                <th scope="col" className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all on page"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </th>
                <th scope="col" className="px-3 py-3">
                  Product
                </th>
                <th scope="col" className="px-3 py-3">
                  Store
                </th>
                <th scope="col" className="px-3 py-3">
                  Price
                </th>
                <th scope="col" className="px-3 py-3">
                  Status
                </th>
                <th scope="col" className="px-3 py-3">
                  Stock
                </th>
                <th scope="col" className="px-3 py-3">
                  Created
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {initial.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                    No products match your filters.
                  </td>
                </tr>
              ) : (
                initial.items.map((row) => (
                  <Fragment key={row.id}>
                    <tr
                      className={`hover:bg-zinc-50 ${pending ? "opacity-60" : ""}`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggleOne(row.id)}
                          aria-label={`Select ${row.name}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setDetail(row)}
                          className="flex max-w-[18rem] items-center gap-3 text-left"
                        >
                          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-100 ring-1 ring-zinc-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {row.thumbnailUrl ? (
                              <img
                                src={row.thumbnailUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
                                —
                              </span>
                            )}
                          </span>
                          <span className="truncate font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-[#D4450A]">
                            {row.name}
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-2 text-zinc-700">{row.storeName}</td>
                      <td className="px-3 py-2 tabular-nums text-zinc-800">
                        TTD ${row.price.toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-zinc-700">
                        {row.stock === null || row.stock === undefined
                          ? "—"
                          : row.stock}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-zinc-600">
                        {new Date(row.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="flex flex-wrap items-center justify-end gap-1 px-3 py-2">
                        <select
                          aria-label={`Status for ${row.name}`}
                          value={row.status}
                          disabled={pending}
                          onChange={(e) =>
                            quickStatus(
                              row.id,
                              e.target.value as AdminProductStatus
                            )
                          }
                          className="max-w-[7rem] rounded border border-zinc-200 px-1 py-1 text-xs"
                        >
                          <option value="active">active</option>
                          <option value="draft">draft</option>
                        </select>
                        <Link
                          href={`/dashboard/vendor/products/${row.id}/edit`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setConfirmDeleteId(row.id)}
                          className="rounded border border-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-zinc-500">
            Showing {(initial.page - 1) * initial.pageSize + 1}–
            {Math.min(initial.page * initial.pageSize, initial.total)} of{" "}
            {initial.total}
          </p>
          <div className="flex items-center gap-2">
            {initial.page > 1 ? (
              <Link
                href={`${pathname}${toQueryString({ ...query, page: initial.page - 1 })}`}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-400">
                Previous
              </span>
            )}
            {initial.page < initial.totalPages ? (
              <Link
                href={`${pathname}${toQueryString({ ...query, page: initial.page + 1 })}`}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
              >
                Next
              </Link>
            ) : (
              <span className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-400">
                Next
              </span>
            )}
          </div>
        </div>

      {detail ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-zinc-900">
              {detail.name}
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Store</dt>
                <dd className="text-right font-medium text-zinc-900">
                  {detail.storeName}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Slug</dt>
                <dd className="font-mono text-xs text-zinc-800">{detail.slug}</dd>
              </div>
              {detail.sku ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">SKU</dt>
                  <dd>{detail.sku}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Price</dt>
                <dd className="tabular-nums">
                  TTD ${detail.price.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Status</dt>
                <dd>
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(detail.status)}`}
                  >
                    {detail.status}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Stock</dt>
                <dd>
                  {detail.stock === null || detail.stock === undefined
                    ? "—"
                    : detail.stock}
                </dd>
              </div>
            </dl>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm"
              >
                Close
              </button>
              <Link
                href={`/dashboard/vendor/products/${detail.id}/edit`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-[#D4450A] px-4 py-2 text-sm font-medium text-white"
              >
                Open in vendor editor
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDeleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
            <p className="text-sm font-medium text-zinc-900">Delete product?</p>
            <p className="mt-2 text-sm text-zinc-600">
              Products with orders cannot be deleted — you&apos;ll see an error.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border px-3 py-1.5 text-sm"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
                onClick={() => void removeOne(confirmDeleteId)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
