"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  bulkAddStock,
  bulkChangeCategory,
  bulkDelete,
  bulkFeature,
  bulkPublish,
  getVendorProductsList,
  type VendorProductListItem,
} from "@/app/actions/product-bulk";

export default function VendorProductsPage() {
  const router = useRouter();
  const stockInputRef = useRef<HTMLInputElement | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const [products, setProducts] = useState<VendorProductListItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showStockInput, setShowStockInput] = useState(false);
  const [categorySelectKey, setCategorySelectKey] = useState(0);

  const loadProducts = useCallback(async () => {
    setLoadError(false);
    const data = await getVendorProductsList();
    setProducts(data);
  }, []);

  useEffect(() => {
    void loadProducts().catch(() => setLoadError(true));
  }, [loadProducts]);

  const allSelected =
    (products?.length ?? 0) > 0 &&
    selectedIds.length > 0 &&
    selectedIds.length === products!.length;
  const someSelected =
    selectedIds.length > 0 && (products == null || selectedIds.length < products.length);

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someSelected && !allSelected;
  }, [allSelected, someSelected]);

  async function handleBulkPublish(publish: boolean) {
    await bulkPublish(selectedIds, publish);
    setSelectedIds([]);
    setCategorySelectKey((k) => k + 1);
    await loadProducts();
    router.refresh();
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.length} products? This cannot be undone.`)) return;
    await bulkDelete(selectedIds);
    setSelectedIds([]);
    setCategorySelectKey((k) => k + 1);
    await loadProducts();
    router.refresh();
  }

  async function handleBulkAddStock(quantity: number) {
    await bulkAddStock(selectedIds, quantity);
    setSelectedIds([]);
    setCategorySelectKey((k) => k + 1);
    await loadProducts();
    router.refresh();
  }

  async function handleBulkFeature(featured: boolean) {
    await bulkFeature(selectedIds, featured);
    setSelectedIds([]);
    setCategorySelectKey((k) => k + 1);
    await loadProducts();
    router.refresh();
  }

  async function handleBulkCategory(category: string) {
    await bulkChangeCategory(selectedIds, category);
    setSelectedIds([]);
    setCategorySelectKey((k) => k + 1);
    await loadProducts();
    router.refresh();
  }

  if (products === null && !loadError) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-6">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Loading…
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-6">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Couldn&apos;t load products. Please refresh the page.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Products
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            Manage your store products
          </p>
        </div>
        <a
          href="/dashboard/vendor/products/new"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--scarlet)" }}
        >
          + Add Product
        </a>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-zinc-800 p-3">
          <span className="mr-2 text-xs text-zinc-400">
            {selectedIds.length} selected
          </span>

          <button
            type="button"
            onClick={() => void handleBulkPublish(true)}
            className="rounded bg-green-700 px-3 py-1.5 text-xs text-white hover:bg-green-600"
          >
            Publish
          </button>

          <button
            type="button"
            onClick={() => void handleBulkPublish(false)}
            className="rounded bg-zinc-600 px-3 py-1.5 text-xs text-white hover:bg-zinc-500"
          >
            Unpublish
          </button>

          <button
            type="button"
            onClick={() => setShowStockInput(true)}
            className="rounded bg-blue-700 px-3 py-1.5 text-xs text-white hover:bg-blue-600"
          >
            Add stock
          </button>

          <button
            type="button"
            onClick={() => void handleBulkFeature(true)}
            className="rounded bg-amber-700 px-3 py-1.5 text-xs text-white hover:bg-amber-600"
          >
            Feature
          </button>

          <button
            type="button"
            onClick={() => void handleBulkFeature(false)}
            className="rounded bg-zinc-600 px-3 py-1.5 text-xs text-white hover:bg-zinc-500"
          >
            Unfeature
          </button>

          <select
            key={categorySelectKey}
            onChange={(e) => {
              const v = e.target.value;
              if (v) void handleBulkCategory(v);
            }}
            className="rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-xs text-white"
            defaultValue=""
          >
            <option value="" disabled>
              Change category
            </option>
            <option value="clothing_apparel">Clothing &amp; Apparel</option>
            <option value="shoes_footwear">Shoes &amp; Footwear</option>
            <option value="jewellery_watches">Jewellery &amp; Watches</option>
            <option value="health_beauty">Health &amp; Beauty</option>
            <option value="food_beverages">Food &amp; Beverages</option>
            <option value="home_furniture">Home &amp; Furniture</option>
            <option value="electronics">Electronics</option>
            <option value="sports_fitness">Sports &amp; Fitness</option>
            <option value="toys_games">Toys &amp; Games</option>
            <option value="books_stationery">Books &amp; Stationery</option>
            <option value="art_crafts">Art &amp; Crafts</option>
            <option value="automotive_parts">Automotive Parts</option>
          </select>

          <button
            type="button"
            onClick={() => void handleBulkDelete()}
            className="ml-auto rounded bg-red-700 px-3 py-1.5 text-xs text-white hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      )}

      {showStockInput && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-zinc-900 p-3">
          <span className="text-xs text-zinc-300">Add quantity:</span>
          <input
            type="number"
            min="1"
            defaultValue="1"
            ref={stockInputRef}
            className="w-20 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-xs text-white"
          />
          <button
            type="button"
            onClick={() => {
              const qty = parseInt(stockInputRef.current?.value ?? "1", 10);
              if (qty > 0) void handleBulkAddStock(qty);
              setShowStockInput(false);
            }}
            className="rounded bg-[#D4450A] px-3 py-1.5 text-xs text-white"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setShowStockInput(false)}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </button>
        </div>
      )}

      <div
        className="overflow-hidden rounded-xl bg-white"
        style={{ border: "1px solid var(--card-border)" }}
      >
        <div
          className="grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wide"
          style={{
            color: "var(--text-muted)",
            backgroundColor: "#F7F7F6",
            borderBottom: "1px solid var(--card-border-subtle)",
          }}
        >
          <div className="col-span-1 flex items-center">
            <input
              ref={selectAllRef}
              type="checkbox"
              className="h-4 w-4"
              checked={allSelected}
              onChange={() => {
                if (!products?.length) return;
                if (allSelected) setSelectedIds([]);
                else setSelectedIds(products.map((p) => p.id));
              }}
              title="Select all"
            />
          </div>
          <div className="col-span-4">Product</div>
          <div className="col-span-2">Price</div>
          <div className="col-span-2">Stock</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1" />
        </div>

        {(products ?? []).map((product) => {
          const status = product.isPublished ? "PUBLISHED" : "DRAFT";
          const stockNum = product.stock;
          const inStockDisplay =
            stockNum === null || stockNum === undefined
              ? "Unlimited"
              : `${stockNum} in stock`;
          const stockPositive =
            stockNum === null || stockNum === undefined ? true : stockNum > 0;
          const rowSelected = selectedIds.includes(product.id);

          return (
            <div
              key={product.id}
              className="grid grid-cols-12 items-center gap-4 px-5 py-4 transition-colors hover:bg-zinc-50/60"
              style={{ borderBottom: "1px solid var(--card-border-subtle)" }}
            >
              <div className="col-span-1">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={rowSelected}
                  onChange={() => {
                    setSelectedIds((prev) =>
                      rowSelected
                        ? prev.filter((id) => id !== product.id)
                        : [...prev, product.id]
                    );
                  }}
                  title="Select"
                />
              </div>
              <div className="col-span-4 flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                  {product.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote Cloudinary URLs
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-xs font-bold"
                      style={{ color: "var(--text-disabled)" }}
                    >
                      {product.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center">
                    <p
                      className="min-w-0 flex-1 truncate text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {product.name}
                    </p>
                    {product.isFeatured && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#D4450A]/20 text-[#D4450A] ml-2">
                        Featured
                      </span>
                    )}
                  </div>
                  {product.category && (
                    <span className="mt-0.5 block text-xs capitalize text-zinc-400">
                      {product.category.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              </div>

              <div className="col-span-2">
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  TTD {product.price.toFixed(2)}
                </span>
              </div>

              <div className="col-span-2">
                <span
                  className="text-sm"
                  style={{
                    color: stockPositive ? "var(--text-secondary)" : "#DC2626",
                  }}
                >
                  {inStockDisplay}
                </span>
              </div>

              <div className="col-span-2">
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor:
                      status === "PUBLISHED" ? "#DCFCE7" : "#F4F4F5",
                    color:
                      status === "PUBLISHED"
                        ? "#15803D"
                        : "var(--text-muted)",
                  }}
                >
                  {status === "PUBLISHED" ? "Published" : "Draft"}
                </span>
              </div>

              <div className="col-span-1 flex justify-end">
                <Link
                  href={`/dashboard/vendor/products/${product.id}/edit`}
                  className="text-xs font-medium hover:underline"
                  style={{ color: "var(--blue)" }}
                >
                  Edit
                </Link>
              </div>
            </div>
          );
        })}

        {products && products.length === 0 ? (
          <div className="py-16 text-center">
            <p className="mb-3 text-3xl">📦</p>
            <p
              className="mb-1 text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              No products yet
            </p>
            <p
              className="mb-4 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              Add your first product to start selling
            </p>
            <Link
              href="/dashboard/vendor/products/new"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--scarlet)" }}
            >
              + Add Product
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
