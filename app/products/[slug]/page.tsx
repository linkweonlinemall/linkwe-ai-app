import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ProductCondition } from "@prisma/client";

import PublicNav from "@/components/layout/PublicNav";
import AddToCartButton from "@/components/product/AddToCartButton";
import { ProductGallery } from "@/components/product/ProductGallery";
import { StorefrontMapAndProducts } from "@/components/storefront/StorefrontMapAndProducts";
import { prisma } from "@/lib/prisma";

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

type Props = { params: Promise<{ slug: string }> };

function conditionDisplay(condition: ProductCondition): { label: string; className: string } {
  switch (condition) {
    case "NEW":
      return {
        label: "New",
        className: "border border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "USED":
      return {
        label: "Used",
        className: "border border-amber-200 bg-amber-50 text-amber-700",
      };
    case "REFURBISHED":
      return {
        label: "Refurbished",
        className: "border border-blue-200 bg-blue-50 text-blue-700",
      };
    default:
      return { label: condition, className: "border border-zinc-200 bg-zinc-50 text-zinc-700" };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    return { title: "Product" };
  }

  const product = await prisma.product.findUnique({
    where: { slug: normalized },
    select: {
      name: true,
      metaTitle: true,
      metaDescription: true,
      shortDescription: true,
      isPublished: true,
    },
  });

  if (!product || !product.isPublished) {
    return { title: "Product" };
  }

  return {
    title: product.metaTitle ?? product.name,
    description: product.metaDescription ?? product.shortDescription ?? undefined,
  };
}

export default async function PublicProductPage({ params }: Props) {
  const { slug } = await params;
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    notFound();
  }

  const product = await prisma.product.findUnique({
    where: { slug: normalized },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      shortDescription: true,
      price: true,
      compareAtPrice: true,
      images: true,
      category: true,
      brand: true,
      tags: true,
      condition: true,
      sku: true,
      stock: true,
      allowDelivery: true,
      allowPickup: true,
      deliveryFee: true,
      deliveryRegions: true,
      returnPolicy: true,
      weight: true,
      weightUnit: true,
      length: true,
      width: true,
      height: true,
      latitude: true,
      longitude: true,
      address: true,
      isFeatured: true,
      metaTitle: true,
      metaDescription: true,
      isPublished: true,
      createdAt: true,
      storeId: true,
      store: {
        select: {
          name: true,
          slug: true,
          logoUrl: true,
          region: true,
        },
      },
    },
  });

  if (!product || !product.isPublished) {
    notFound();
  }

  const store = product.store;
  const cond = product.condition ? conditionDisplay(product.condition) : null;

  const centerStock =
    product.stock === null || product.stock > 10
      ? { text: "In stock", color: "text-emerald-600" as const }
      : product.stock >= 1 && product.stock <= 10
        ? { text: `Only ${product.stock} left`, color: "text-amber-600" as const }
        : { text: "Out of stock", color: "text-red-600" as const };

  const buyBoxStockDot =
    product.stock === null || product.stock > 10
      ? "bg-emerald-500"
      : product.stock >= 1 && product.stock <= 10
        ? "bg-amber-500"
        : "bg-red-600";

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-50">
            ← LinkWe
          </Link>
          <span className="text-zinc-300">/</span>
          <Link
            href={`/store/${store.slug}`}
            className="max-w-[min(100%,12rem)] truncate hover:text-zinc-900 dark:hover:text-zinc-50 sm:max-w-none"
          >
            ← {store.name}
          </Link>
        </nav>

        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left — gallery */}
          <div className="lg:col-span-5">
            <ProductGallery images={product.images} name={product.name} />
          </div>

          {/* Center — info */}
          <div className="lg:col-span-4">
            {product.category ? (
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {formatLabel(product.category)}
              </span>
            ) : null}

            <h1 className="mt-1 text-2xl font-bold leading-tight text-zinc-900">{product.name}</h1>

            {product.shortDescription ? (
              <p className="mt-2 text-sm text-zinc-500">{product.shortDescription}</p>
            ) : null}

            <hr className="my-4 border-zinc-200" />

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold" style={{ color: "#D4450A" }}>
                TTD {product.price.toFixed(2)}
              </span>
              {product.compareAtPrice != null && product.compareAtPrice > product.price ? (
                <>
                  <span className="text-sm text-zinc-400 line-through">
                    TTD {product.compareAtPrice.toFixed(2)}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                    {Math.round((1 - product.price / product.compareAtPrice) * 100)}% off
                  </span>
                </>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {product.condition && cond ? (
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-medium ${cond.className}`}
                >
                  {cond.label}
                </span>
              ) : null}
              <span className={`text-sm font-medium ${centerStock.color}`}>{centerStock.text}</span>
            </div>

            <hr className="my-4 border-zinc-200" />

            {product.description ? (
              <div className="mt-4">
                <h2 className="mb-2 text-sm font-semibold text-zinc-900">About this product</h2>
                <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-600">{product.description}</p>
              </div>
            ) : null}

            <div className="mt-6">
              <h2 className="mb-3 text-sm font-semibold text-zinc-900">Product details</h2>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-zinc-100">
                  {product.brand ? (
                    <tr>
                      <td className="w-1/3 py-2 text-zinc-500">Brand</td>
                      <td className="py-2 font-medium text-zinc-900">{product.brand}</td>
                    </tr>
                  ) : null}
                  {product.sku ? (
                    <tr>
                      <td className="w-1/3 py-2 text-zinc-500">SKU</td>
                      <td className="py-2 font-medium text-zinc-900">{product.sku}</td>
                    </tr>
                  ) : null}
                  {product.category ? (
                    <tr>
                      <td className="w-1/3 py-2 text-zinc-500">Category</td>
                      <td className="py-2 font-medium capitalize text-zinc-900">
                        {formatLabel(product.category)}
                      </td>
                    </tr>
                  ) : null}
                  {product.condition && cond ? (
                    <tr>
                      <td className="w-1/3 py-2 text-zinc-500">Condition</td>
                      <td className="py-2 font-medium text-zinc-900">{cond.label}</td>
                    </tr>
                  ) : null}
                  {product.weight != null && product.weightUnit ? (
                    <tr>
                      <td className="w-1/3 py-2 text-zinc-500">Weight</td>
                      <td className="py-2 font-medium text-zinc-900">
                        {product.weight} {product.weightUnit}
                      </td>
                    </tr>
                  ) : null}
                  {product.length != null && product.width != null && product.height != null ? (
                    <tr>
                      <td className="w-1/3 py-2 text-zinc-500">Dimensions</td>
                      <td className="py-2 font-medium text-zinc-900">
                        {product.length} × {product.width} × {product.height} cm
                      </td>
                    </tr>
                  ) : null}
                  {product.returnPolicy ? (
                    <tr>
                      <td className="w-1/3 align-top py-2 text-zinc-500">Return policy</td>
                      <td className="py-2 font-medium text-zinc-900">
                        <span className="block whitespace-pre-wrap font-normal text-zinc-700">
                          {product.returnPolicy}
                        </span>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {product.deliveryRegions.length > 0 ? (
              <div className="mt-6">
                <h2 className="mb-3 text-sm font-semibold text-zinc-900">Delivery regions</h2>
                <div className="flex flex-wrap gap-2">
                  {product.deliveryRegions.map((r) => (
                    <span
                      key={r}
                      className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500"
                    >
                      {formatLabel(r)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Right — sticky buy box */}
          <div className="lg:sticky lg:top-6 lg:col-span-3 flex flex-col gap-4 lg:self-start">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-2xl font-bold" style={{ color: "#D4450A" }}>
                TTD {product.price.toFixed(2)}
              </p>
              {product.compareAtPrice != null && product.compareAtPrice > product.price ? (
                <p className="mt-1 text-sm text-zinc-400 line-through">
                  TTD {product.compareAtPrice.toFixed(2)}
                </p>
              ) : null}

              <div className="mt-4 flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${buyBoxStockDot}`} aria-hidden />
                <span className={`text-sm font-medium ${centerStock.color}`}>{centerStock.text}</span>
              </div>

              <hr className="my-4 border-zinc-200" />

              {product.allowDelivery ? (
                <div className="flex items-start gap-2 text-sm text-zinc-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 shrink-0"
                  >
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                  <div>
                    <p className="font-medium">Delivery available</p>
                    {product.deliveryFee != null ? (
                      <p className="text-xs text-zinc-500">
                        TTD {product.deliveryFee.toFixed(2)} delivery fee
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {product.allowPickup ? (
                <div className={`flex items-start gap-2 text-sm text-zinc-600 ${product.allowDelivery ? "mt-2" : ""}`}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 shrink-0"
                  >
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <p className="font-medium">Local pickup available</p>
                </div>
              ) : null}

              <hr className="my-4 border-zinc-200" />

              <AddToCartButton productId={product.id} stock={product.stock} />

              <button
                type="button"
                disabled
                className="mt-2 flex h-12 w-full cursor-not-allowed rounded-xl border-2 border-[#D4450A] bg-white text-sm font-medium text-[#D4450A] opacity-50"
              >
                Buy now — coming soon
              </button>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Sold by</p>
              <div className="flex items-center gap-3">
                {store.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={store.logoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-zinc-200" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">{store.name}</p>
                  <p className="text-xs text-zinc-500">{store.region}</p>
                </div>
              </div>
              <Link
                href={`/store/${store.slug}`}
                className="mt-3 flex w-full items-center justify-center rounded-xl border border-zinc-200 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Visit store →
              </Link>
            </div>

            {product.latitude != null && product.longitude != null ? (
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <p className="px-4 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Pickup location
                </p>
                <StorefrontMapAndProducts
                  latitude={product.latitude}
                  longitude={product.longitude}
                  address={product.address}
                  products={[]}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
