import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MainOrderStatus, type ProductCondition } from "@prisma/client";
import { Package } from "lucide-react";

import ProductBuyBox from "@/components/product/ProductBuyBox";
import ProductCollapsibleTags from "@/components/product/ProductCollapsibleTags";
import FrequentlyBoughtTogether from "@/components/product/FrequentlyBoughtTogether";
import ProductReviewsSection from "@/components/product/ProductReviewsSection";
import PublicNav from "@/components/layout/PublicNav";
import ExpandableDescription from "@/components/ui/ExpandableDescription";
import { ProductGallery } from "@/components/product/ProductGallery";
import type { VariantAttribute } from "@/components/product/VariantSelector";
import { getProductReviews, getUserProductReview } from "@/app/actions/reviews";
import { getWishlistProductIds } from "@/app/actions/wishlist";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { getSession } from "@/lib/auth/session";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { prisma } from "@/lib/prisma";
import { typography, radius, shadow, spacing, tw } from "@/lib/design-system";

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Order must be paid (or later) for the buyer to write a verified product review. */
const REVIEW_PURCHASE_STATUSES: MainOrderStatus[] = [
  MainOrderStatus.PAID,
  MainOrderStatus.PROCESSING,
  MainOrderStatus.PARTIALLY_IN_HOUSE,
  MainOrderStatus.READY_TO_SHIP,
  MainOrderStatus.PACKING_COMPLETE,
  MainOrderStatus.SHIPPED,
  MainOrderStatus.CUSTOMER_RECEIVED,
  MainOrderStatus.DELIVERED,
  MainOrderStatus.COMPLETED,
];

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

  const unreadCount = await getNavUnreadCount();

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
      hasVariants: true,
      isService: true,
      isDigital: true,
      digitalFileUrl: true,
      fileType: true,
      fileSizeKb: true,
      downloadLimit: true,
      downloadExpiryDays: true,
      previewUrl: true,
      licenceType: true,
      store: { select: { name: true, slug: true, logoUrl: true, region: true } },
    },
  });

  if (!product?.isPublished) notFound();

  const [reviewData, userReview] = await Promise.all([
    getProductReviews(product.id),
    getUserProductReview(product.id),
  ]);

  const hasPurchased = session
    ? !!(await prisma.orderItem.findFirst({
        where: {
          productId: product.id,
          mainOrder: {
            buyerId: session.userId,
            status: { in: REVIEW_PURCHASE_STATUSES },
          },
        },
        select: { id: true },
      }))
    : false;

  const canWriteReview = hasPurchased && !userReview;

  const wishlistIds = await getWishlistProductIds();
  const isWishlisted = wishlistIds.includes(product.id);

  const variants = product.hasVariants
    ? await prisma.productVariant.findMany({
        where: { productId: product.id },
        select: {
          id: true,
          name: true,
          attributes: true,
          price: true,
          stock: true,
          images: true,
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const sameStoreOthers = await prisma.product.findMany({
    where: {
      isPublished: true,
      isService: false,
      isArchived: false,
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
    take: 10,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
  });

  const frequentlyTogether = !product.hasVariants && !product.isDigital ? sameStoreOthers.slice(0, 3) : [];
  const moreFromStoreProducts = sameStoreOthers.slice(3, 7);

  const categoryRelatedProducts = product.category
    ? await prisma.product.findMany({
        where: {
          isPublished: true,
          isService: false,
          category: product.category,
          NOT: { storeId: product.storeId },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          compareAtPrice: true,
          images: true,
          category: true,
          isFeatured: true,
          store: { select: { name: true, slug: true } },
        },
        take: 4,
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      })
    : [];

  const store = product.store;
  const cond = product.condition ? conditionDisplay(product.condition) : null;

  const buyBoxVariants = variants.map((v) => ({
    id: v.id,
    name: v.name,
    attributes: v.attributes as VariantAttribute[],
    price: v.price,
    stock: v.stock,
    images: v.images,
  }));

  return (
    <div className={`min-h-screen pb-28 ${tw.fontSans} antialiased md:pb-16 lg:pb-0 ${tw.bgPage}`}>
      <PublicNav
        user={session ? { name: session.fullName ?? "Account", href: dashboardHref! } : null}
        dashboardHref={dashboardHref ?? undefined}
        unreadCount={unreadCount}
      />

      <div className="w-full px-8 py-6">
        <div className={`mb-4 h-1 w-16 ${radius.pill} ${tw.bgScarlet}`} />
        {/* Breadcrumb */}
        <nav className={`mb-6 flex items-center gap-2 ${typography.bodySmall} text-zinc-400`}>
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_360px] lg:gap-10">
          {/* Gallery — edge-to-edge on mobile */}
          <div className="-mx-8 min-w-0 md:mx-0">
            <ProductGallery images={product.images} name={product.name} />
          </div>

          {/* Product info */}
          <div className="flex min-w-0 flex-col gap-5 px-4 md:px-0">
            <div className="flex flex-wrap items-center gap-2">
              {product.category ? (
                <span className="font-sans text-[13px] font-normal uppercase tracking-wide text-gray-600">
                  {formatLabel(product.category).toUpperCase()}
                </span>
              ) : null}
              {product.isFeatured ? (
                <span className="rounded-md bg-[#D4450A] px-2 py-0.5 font-sans text-[11px] font-semibold uppercase text-white">
                  FEATURED
                </span>
              ) : null}
              {cond ? (
                <span className="rounded-md bg-green-50 px-2 py-0.5 font-sans text-[11px] font-semibold text-green-700">
                  {cond.label}
                </span>
              ) : null}
            </div>

            <h1 className={`${typography.h3} font-sans leading-tight text-zinc-900 sm:text-4xl sm:leading-tight`}>
              {product.name}
            </h1>

            <p className={`${typography.bodySmall} text-zinc-600`}>
              by{" "}
              <Link href={`/store/${store.slug}`} className={`font-semibold ${tw.textScarlet} hover:underline`}>
                {store.name}
              </Link>
            </p>

            {product.shortDescription ? (
              <p
                className={`border-l-2 ${tw.borderScarletMuted30} py-3 pl-4 font-sans text-lg font-medium italic leading-normal text-gray-700`}
              >
                {product.shortDescription}
              </p>
            ) : null}

            {product.tags && product.tags.length > 0 ? (
              <ProductCollapsibleTags tags={product.tags} />
            ) : null}

            {product.description ? (
              <ExpandableDescription title="ABOUT THIS PRODUCT" description={product.description} />
            ) : null}

            {product.previewUrl ? (
              <div className={`${radius.card} border border-zinc-200 bg-white ${spacing.cardPadding} ${shadow.card}`}>
                <h2 className={`mb-3 ${typography.caption} text-zinc-900`}>Preview</h2>
                <a
                  href={product.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 ${radius.card} border-2 ${tw.borderScarletMuted30} ${tw.bgScarletMuted5} px-4 py-3 ${typography.bodySmall} font-semibold ${tw.textScarlet} transition-colors ${tw.hoverBgScarletMuted10}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Download free preview
                </a>
              </div>
            ) : null}

            <div>
              <h2 className={`mb-3 ${typography.caption} text-zinc-900`}>Product Details</h2>
              <div className={`overflow-hidden ${radius.card} border border-zinc-200 bg-white ${shadow.card}`}>
                <table className="w-full font-sans text-sm">
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

            {!product.hasVariants && !product.isDigital && frequentlyTogether.length > 0 ? (
              <div className="mt-6">
                <FrequentlyBoughtTogether
                  currentProduct={{
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    price: product.price,
                    compareAtPrice: product.compareAtPrice,
                    images: product.images,
                  }}
                  items={frequentlyTogether}
                />
              </div>
            ) : null}

            {product.deliveryRegions.length > 0 ? (
              <div>
                <h2 className={`mb-2 ${typography.caption} text-zinc-900`}>Delivery regions</h2>
                <div className="flex flex-wrap gap-2">
                  {product.deliveryRegions.map((r) => (
                    <span
                      key={r}
                      className={`${radius.pill} border border-zinc-200 bg-white px-3 py-1 font-sans text-xs text-zinc-500`}
                    >
                      {formatLabel(r)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Purchase card — full width on tablet, sidebar on desktop */}
          <aside className="min-w-0 md:col-span-2 lg:col-span-1">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-24 lg:z-10">
              <ProductBuyBox
                mobileStickyBar
                productId={product.id}
                productName={product.name}
                basePrice={product.price}
                compareAtPrice={product.compareAtPrice}
                baseStock={product.stock}
                hasVariants={product.hasVariants}
                variants={buyBoxVariants}
                store={{
                  name: store.name,
                  slug: store.slug,
                  logoUrl: store.logoUrl,
                  region: store.region,
                }}
                storeRegionLabel={getRegionLabel(store.region)}
                allowDelivery={product.allowDelivery}
                allowPickup={product.allowPickup}
                deliveryFeeSuffix={
                  product.allowDelivery && product.deliveryFee != null
                    ? ` — TTD ${product.deliveryFee.toFixed(2)}`
                    : null
                }
                isDigital={product.isDigital}
                digitalMeta={
                  product.isDigital
                    ? {
                        fileType: product.fileType,
                        fileSizeKb: product.fileSizeKb,
                        downloadLimit: product.downloadLimit,
                        licenceType: product.licenceType,
                      }
                    : null
                }
                initialWishlisted={isWishlisted}
              />
            </div>
          </aside>
        </div>

        <section className="mt-12 border-t border-zinc-200 pt-12 md:mt-16 md:pt-16">
          <ProductReviewsSection
            productId={product.id}
            productName={product.name}
            count={reviewData.count}
            average={reviewData.average}
            reviews={reviewData.reviews}
            userReview={userReview}
            canWriteReview={canWriteReview}
            fullWidthLayout
          />
        </section>
        {moreFromStoreProducts.length > 0 ? (
          <div className="mt-16">
            <div className="mb-6 flex items-center justify-between">
              <h2 className={`${typography.h4} text-zinc-900`}>More from {store.name}</h2>
              <Link href={`/store/${store.slug}`} className={`${typography.bodySmall} ${tw.textScarlet} hover:underline`}>
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {moreFromStoreProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className={`group overflow-hidden ${radius.card} bg-white ${shadow.card} transition-all hover:shadow-md`}
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
                        <Package className="size-10 text-zinc-300" strokeWidth={1.25} aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    {p.category ? (
                      <p className="mb-0.5 text-[10px] uppercase tracking-wide text-zinc-400">{formatLabel(p.category)}</p>
                    ) : null}
                    <p className="truncate text-sm font-semibold text-zinc-900">{p.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className={`text-sm font-bold ${tw.textScarlet}`}>
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

        {categoryRelatedProducts.length > 0 ? (
          <div className="mt-12">
            <div className="mb-6 flex items-center justify-between">
              <h2 className={`${typography.h4} text-zinc-900`}>
                More in {formatLabel(product.category ?? "")}
              </h2>
              <Link
                href={`/shop?category=${product.category}`}
                className={`${typography.bodySmall} ${tw.textScarlet} hover:underline`}
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {categoryRelatedProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className={`group overflow-hidden ${radius.card} bg-white ${shadow.card} transition-all hover:shadow-md`}
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
                        <Package className="size-10 text-zinc-300" strokeWidth={1.25} aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="mb-0.5 truncate text-[10px] uppercase tracking-wide text-zinc-400">
                      {p.store.name}
                    </p>
                    <p className="truncate text-sm font-semibold text-zinc-900">{p.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className={`text-sm font-bold ${tw.textScarlet}`}>TTD {p.price.toFixed(2)}</p>
                      {p.compareAtPrice && p.compareAtPrice > p.price ? (
                        <p className="text-xs text-zinc-400 line-through">
                          TTD {p.compareAtPrice.toFixed(2)}
                        </p>
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
