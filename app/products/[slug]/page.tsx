import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ProductCondition } from "@prisma/client";

import PublicNav from "@/components/layout/PublicNav";
import AddToCartButton from "@/components/product/AddToCartButton";
import { ProductGallery } from "@/components/product/ProductGallery";
import { getSession } from "@/lib/auth/session";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { prisma } from "@/lib/prisma";

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

type Props = { params: Promise<{ slug: string }> };

function conditionDisplay(condition: ProductCondition): {
  label: string;
  className: string;
} {
  switch (condition) {
    case "NEW":
      return { label: "New", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "USED":
      return { label: "Used", className: "bg-amber-50 text-amber-700 border-amber-200" };
    case "REFURBISHED":
      return {
        label: "Refurbished",
        className: "bg-blue-50 text-blue-700 border-blue-200",
      };
    default:
      return { label: condition, className: "bg-zinc-50 text-zinc-700 border-zinc-200" };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug: slug.trim().toLowerCase() },
    select: {
      name: true,
      metaTitle: true,
      metaDescription: true,
      shortDescription: true,
      isPublished: true,
    },
  });
  if (!product?.isPublished) return { title: "Product" };
  return {
    title: product.metaTitle ?? product.name,
    description: product.metaDescription ?? product.shortDescription ?? undefined,
  };
}

export default async function PublicProductPage({ params }: Props) {
  const { slug } = await params;
  const normalized = slug.trim().toLowerCase();
  if (!normalized) notFound();

  const session = await getSession();
  const dashboardHref = session ? getRoleDashboardPath(session.role) : null;

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
      isPublished: true,
      createdAt: true,
      storeId: true,
      store: { select: { name: true, slug: true, logoUrl: true, region: true } },
    },
  });

  if (!product?.isPublished) notFound();

  // Fetch related products from same store
  const relatedProducts = await prisma.product.findMany({
    where: {
      isPublished: true,
      storeId: product.storeId,
      NOT: { slug: normalized },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      compareAtPrice: true,
      images: true,
      category: true,
    },
    take: 4,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
  });

  const store = product.store;
  const cond = product.condition ? conditionDisplay(product.condition) : null;
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : null;

  const stockStatus =
    product.stock === null || product.stock > 10
      ? { text: "In stock", color: "text-emerald-600", dot: "bg-emerald-500" }
      : product.stock >= 1
        ? {
            text: `Only ${product.stock} left`,
            color: "text-amber-600",
            dot: "bg-amber-500",
          }
        : { text: "Out of stock", color: "text-red-600", dot: "bg-red-500" };

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16 sm:pb-0">
      <PublicNav
        user={session ? { name: session.fullName ?? "Account", href: dashboardHref! } : null}
        dashboardHref={dashboardHref ?? undefined}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-400">
          <Link href="/" className="transition-colors hover:text-zinc-700">
            Home
          </Link>
          <span>/</span>
          <Link href="/shop" className="transition-colors hover:text-zinc-700">
            Shop
          </Link>
          <span>/</span>
          <Link
            href={`/store/${store.slug}`}
            className="max-w-32 truncate transition-colors hover:text-zinc-700"
          >
            {store.name}
          </Link>
          <span>/</span>
          <span className="max-w-48 truncate text-zinc-600">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left — gallery */}
          <div className="lg:col-span-5">
            <ProductGallery images={product.images} name={product.name} />
          </div>

          {/* Center — product info */}
          <div className="flex flex-col gap-5 lg:col-span-4">
            {/* Category + badges */}
            <div className="flex flex-wrap items-center gap-2">
              {product.category ? (
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  {formatLabel(product.category)}
                </span>
              ) : null}
              {product.isFeatured ? (
                <span className="rounded-full bg-[#D4450A] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Featured
                </span>
              ) : null}
              {cond ? (
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${cond.className}`}
                >
                  {cond.label}
                </span>
              ) : null}
            </div>

            {/* Name */}
            <div>
              <h1 className="text-2xl font-black leading-tight text-zinc-900 sm:text-3xl">{product.name}</h1>
              {product.brand ? <p className="mt-1 text-sm text-zinc-400">by {product.brand}</p> : null}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black" style={{ color: "#D4450A" }}>
                TTD {product.price.toFixed(2)}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price ? (
                <>
                  <span className="text-base text-zinc-400 line-through">
                    TTD {product.compareAtPrice.toFixed(2)}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
                    {discount}% off
                  </span>
                </>
              ) : null}
            </div>

            {/* Stock status */}
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${stockStatus.dot}`} />
              <span className={`text-sm font-semibold ${stockStatus.color}`}>{stockStatus.text}</span>
            </div>

            {/* Short description */}
            {product.shortDescription ? (
              <p className="border-l-2 border-[#D4450A]/30 pl-3 text-sm leading-relaxed text-zinc-600">
                {product.shortDescription}
              </p>
            ) : null}

            <hr className="border-zinc-200" />

            {/* Description */}
            {product.description ? (
              <div>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-zinc-900">
                  About this product
                </h2>
                <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-600">{product.description}</p>
              </div>
            ) : null}

            {/* Tags */}
            {product.tags && product.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            {/* Product details table */}
            <div>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-900">Product details</h2>
              <div className="overflow-hidden rounded-xl border border-zinc-200">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-zinc-100">
                    {product.brand ? (
                      <tr className="hover:bg-zinc-50">
                        <td className="w-1/3 px-4 py-2.5 font-medium text-zinc-500">Brand</td>
                        <td className="px-4 py-2.5 text-zinc-900">{product.brand}</td>
                      </tr>
                    ) : null}
                    {product.sku ? (
                      <tr className="hover:bg-zinc-50">
                        <td className="w-1/3 px-4 py-2.5 font-medium text-zinc-500">SKU</td>
                        <td className="px-4 py-2.5 text-zinc-900">{product.sku}</td>
                      </tr>
                    ) : null}
                    {product.category ? (
                      <tr className="hover:bg-zinc-50">
                        <td className="w-1/3 px-4 py-2.5 font-medium text-zinc-500">Category</td>
                        <td className="px-4 py-2.5 text-zinc-900">{formatLabel(product.category)}</td>
                      </tr>
                    ) : null}
                    {cond ? (
                      <tr className="hover:bg-zinc-50">
                        <td className="w-1/3 px-4 py-2.5 font-medium text-zinc-500">Condition</td>
                        <td className="px-4 py-2.5 text-zinc-900">{cond.label}</td>
                      </tr>
                    ) : null}
                    {product.weight != null && product.weightUnit ? (
                      <tr className="hover:bg-zinc-50">
                        <td className="w-1/3 px-4 py-2.5 font-medium text-zinc-500">Weight</td>
                        <td className="px-4 py-2.5 text-zinc-900">
                          {product.weight} {product.weightUnit}
                        </td>
                      </tr>
                    ) : null}
                    {product.length != null && product.width != null && product.height != null ? (
                      <tr className="hover:bg-zinc-50">
                        <td className="w-1/3 px-4 py-2.5 font-medium text-zinc-500">Dimensions</td>
                        <td className="px-4 py-2.5 text-zinc-900">
                          {product.length} × {product.width} × {product.height} cm
                        </td>
                      </tr>
                    ) : null}
                    {product.returnPolicy ? (
                      <tr className="hover:bg-zinc-50">
                        <td className="w-1/3 px-4 py-2.5 align-top font-medium text-zinc-500">Returns</td>
                        <td className="px-4 py-2.5 text-zinc-900">{product.returnPolicy}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Delivery regions */}
            {product.deliveryRegions.length > 0 ? (
              <div>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-zinc-900">
                  Delivery regions
                </h2>
                <div className="flex flex-wrap gap-2">
                  {product.deliveryRegions.map((r) => (
                    <span
                      key={r}
                      className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-500"
                    >
                      {formatLabel(r)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Right — buy box */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:col-span-3 lg:self-start">
            {/* Price card */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-1">
                <span className="text-2xl font-black" style={{ color: "#D4450A" }}>
                  TTD {product.price.toFixed(2)}
                </span>
                {product.compareAtPrice && product.compareAtPrice > product.price ? (
                  <p className="text-sm text-zinc-400 line-through">
                    TTD {product.compareAtPrice.toFixed(2)}
                  </p>
                ) : null}
              </div>

              <div className="mb-4 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${stockStatus.dot}`} />
                <span className={`text-sm font-semibold ${stockStatus.color}`}>{stockStatus.text}</span>
              </div>

              <AddToCartButton productId={product.id} stock={product.stock} />

              <hr className="my-4 border-zinc-100" />

              <div className="flex flex-col gap-2.5">
                {product.allowDelivery ? (
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="1" y="3" width="15" height="13" />
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                      <circle cx="5.5" cy="18.5" r="2.5" />
                      <circle cx="18.5" cy="18.5" r="2.5" />
                    </svg>
                    <span>
                      Delivery available
                      {product.deliveryFee != null ? ` — TTD ${product.deliveryFee.toFixed(2)}` : ""}
                    </span>
                  </div>
                ) : null}
                {product.allowPickup ? (
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>Local pickup available</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Secure checkout via Stripe</span>
                </div>
              </div>
            </div>

            {/* Sold by */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-400">Sold by</p>
              <div className="mb-3 flex items-center gap-3">
                {store.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={store.logoUrl}
                    alt=""
                    className="h-11 w-11 rounded-full border border-zinc-100 object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#D4450A]/10">
                    <span className="font-bold text-[#D4450A]">{store.name[0]}</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900">{store.name}</p>
                  <p className="truncate text-xs capitalize text-zinc-400">{store.region}</p>
                </div>
              </div>
              <Link
                href={`/store/${store.slug}`}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Visit store
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Related products */}
        {relatedProducts.length > 0 ? (
          <div className="mt-16">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900">More from {store.name}</h2>
              <Link href={`/store/${store.slug}`} className="text-sm text-[#D4450A] hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {relatedProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-all hover:shadow-md"
                >
                  <div className="aspect-square overflow-hidden bg-zinc-100">
                    {p.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="text-3xl text-zinc-300">📦</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    {p.category ? (
                      <p className="mb-0.5 text-[10px] uppercase tracking-wide text-zinc-400">{formatLabel(p.category)}</p>
                    ) : null}
                    <p className="truncate text-sm font-semibold text-zinc-900">{p.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-sm font-bold" style={{ color: "#D4450A" }}>
                        TTD {p.price.toFixed(2)}
                      </p>
                      {p.compareAtPrice && p.compareAtPrice > p.price ? (
                        <p className="text-xs text-zinc-400 line-through">TTD {p.compareAtPrice.toFixed(2)}</p>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
