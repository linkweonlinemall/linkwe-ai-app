import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";

function formatCategoryLabel(value: string | null): string | null {
  if (!value) return null;
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function VendorProductsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") {
    redirect("/login");
  }

  const store = await getStoreByOwnerId(user.id);
  if (!store) {
    redirect("/onboarding/business/step-3");
  }

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      images: true,
      isPublished: true,
      category: true,
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
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

      <div className="overflow-hidden rounded-xl bg-white" style={{ border: "1px solid var(--card-border)" }}>
        <div
          className="grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wide"
          style={{
            color: "var(--text-muted)",
            backgroundColor: "#F7F7F6",
            borderBottom: "1px solid var(--card-border-subtle)",
          }}
        >
          <div className="col-span-5">Product</div>
          <div className="col-span-2">Price</div>
          <div className="col-span-2">Stock</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1" />
        </div>

        {products.map((product) => {
          const status = product.isPublished ? "PUBLISHED" : "DRAFT";
          const stockNum = product.stock;
          const inStockDisplay =
            stockNum === null || stockNum === undefined
              ? "Unlimited"
              : `${stockNum} in stock`;
          const stockPositive =
            stockNum === null || stockNum === undefined ? true : stockNum > 0;
          const categoryLabel = formatCategoryLabel(product.category);

          return (
            <div
              key={product.id}
              className="grid grid-cols-12 items-center gap-4 px-5 py-4 transition-colors hover:bg-zinc-50/60"
              style={{ borderBottom: "1px solid var(--card-border-subtle)" }}
            >
              <div className="col-span-5 flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                  {product.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote Cloudinary URLs
                    <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
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
                  <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {product.name}
                  </p>
                  {categoryLabel ? (
                    <p className="mt-0.5 text-xs" style={{ color: "var(--text-faint)" }}>
                      {categoryLabel}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="col-span-2">
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
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
                    backgroundColor: status === "PUBLISHED" ? "#DCFCE7" : "#F4F4F5",
                    color: status === "PUBLISHED" ? "#15803D" : "var(--text-muted)",
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

        {products.length === 0 ? (
          <div className="py-16 text-center">
            <p className="mb-3 text-3xl">📦</p>
            <p className="mb-1 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              No products yet
            </p>
            <p className="mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
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
