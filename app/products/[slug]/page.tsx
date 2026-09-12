import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MainOrderStatus, type ProductCondition } from "@prisma/client";
import { BadgeCheck, Download, Package, RotateCcw, ShieldCheck, Star, Truck } from "lucide-react";

import ProductBuyBox from "@/components/product/ProductBuyBox";
import ProductContactActions from "@/components/product/ProductContactActions";
import ProductCollapsibleTags from "@/components/product/ProductCollapsibleTags";
import FrequentlyBoughtTogether from "@/components/product/FrequentlyBoughtTogether";
import ProductReviewsSection from "@/components/product/ProductReviewsSection";
import PublicNav from "@/components/layout/PublicNav";
import ExpandableDescription from "@/components/ui/ExpandableDescription";
import { ProductGallery } from "@/components/product/ProductGallery";
import type { VariantAttribute } from "@/components/product/VariantSelector";
import { getCrossStoreFeatureButtonState } from "@/app/actions/cross-store";
import { getLinkedContent } from "@/app/actions/content-links";
import RequestFeatureButton from "@/components/cross-store/RequestFeatureButton";
import { getProductReviews, getUserProductReview } from "@/app/actions/reviews";
import RelatedContentSection from "@/components/storefront/RelatedContentSection";
import { getWishlistProductIds } from "@/app/actions/wishlist";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { getSession } from "@/lib/auth/session";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { prisma } from "@/lib/prisma";
import { formatTTDPrice } from "@/lib/format/price";
import { typography, radius, tw } from "@/lib/design-system";
import { isStoreSellable } from "@/lib/store/sellable-store";

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
      images: true,
      isPublished: true,
    },
  });
  if (!product?.isPublished) return { title: "Product" };
  const image = product.images[0];
  return {
    title: product.metaTitle ?? product.name,
    description: product.metaDescription ?? product.shortDescription ?? undefined,
    openGraph: image ? { images: [{ url: image, alt: product.name }] } : undefined,
    twitter: image ? { card: "summary_large_image", images: [image] } : undefined,
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
      store: {
        select: {
          name: true,
          slug: true,
          logoUrl: true,
          region: true,
          ownerId: true,
          status: true,
          owner: { select: { idVerificationStatus: true } },
        },
      },
    },
  });

  if (!product?.isPublished) notFound();

  const isOwner = session != null && product.store.ownerId === session.userId;
  const isAdmin = session?.role === "ADMIN";
  if (!isStoreSellable(product.store) && !isOwner && !isAdmin) notFound();

  const [reviewData, userReview, { items: linkedItems }, featureButtonState] =
    await Promise.all([
      getProductReviews(product.id),
      getUserProductReview(product.id),
      getLinkedContent("PRODUCT", product.id),
      getCrossStoreFeatureButtonState("PRODUCT", product.id),
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
    <div className={`relative isolate min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8fcff_0%,#fff_42%,#fff9f4_100%)] pb-28 ${tw.fontSans} antialiased md:pb-16 lg:pb-0`}>
      <PublicNav
        user={session ? { name: session.fullName ?? "Account", href: dashboardHref! } : null}
        dashboardHref={dashboardHref ?? undefined}
        unreadCount={unreadCount}
      />

      <div className="pointer-events-none absolute -left-52 top-24 size-[34rem] rounded-full bg-[#1A7FB5]/10 blur-[120px]" aria-hidden />
      <div className="pointer-events-none absolute -right-48 top-[34rem] size-[30rem] rounded-full bg-[#D4450A]/8 blur-[120px]" aria-hidden />

      <div className="relative mx-auto w-full max-w-screen-xl px-4 py-5 sm:px-6 sm:py-8">
        {/* Breadcrumb */}
        <nav className="hide-scrollbar mb-5 flex items-center gap-2 overflow-x-auto whitespace-nowrap rounded-full border border-white/90 bg-white/75 px-4 py-2.5 text-[11px] font-bold text-zinc-400 shadow-[0_8px_30px_rgba(38,73,96,.07)] backdrop-blur sm:mb-8 sm:w-fit">
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

        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 md:gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)_350px] lg:gap-8">
          {/* Immersive product gallery */}
          <div className="min-w-0">
            <ProductGallery images={product.images} name={product.name} />
          </div>

          {/* Product info */}
          <div className="flex min-w-0 flex-col gap-5 rounded-[1.75rem] border border-white/90 bg-white/80 p-5 shadow-[0_22px_65px_rgba(38,73,96,.10)] ring-1 ring-sky-950/[.04] backdrop-blur sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              {product.category ? (
                <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 font-sans text-[10px] font-black uppercase tracking-[.14em] text-[#1A7FB5]">
                  {formatLabel(product.category).toUpperCase()}
                </span>
              ) : null}
              {product.isFeatured ? (
                <span className="rounded-full bg-gradient-to-r from-[#D4450A] to-[#F28A2D] px-3 py-1 font-sans text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                  FEATURED
                </span>
              ) : null}
              {cond ? (
                <span className={`rounded-full border px-3 py-1 font-sans text-[10px] font-black uppercase tracking-wider ${cond.className}`}>
                  {cond.label}
                </span>
              ) : null}
            </div>

            <h1 className="font-sans text-3xl font-black leading-[1.08] tracking-[-.035em] text-zinc-950 sm:text-4xl lg:text-[2.65rem]">
              {product.name}
            </h1>

            {reviewData.count > 0 ? (
              <a href="#reviews" className="flex w-fit items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100">
                <span className="flex items-center gap-1"><Star className="size-3.5 fill-amber-400 text-amber-400" /> {reviewData.average.toFixed(1)}</span>
                <span className="text-amber-700/70">{reviewData.count} review{reviewData.count === 1 ? "" : "s"}</span>
              </a>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <p className={`${typography.bodySmall} text-zinc-600`}>
                by{" "}
                <Link href={`/store/${store.slug}`} className={`font-semibold ${tw.textScarlet} hover:underline`}>
                  {store.name}
                </Link>
              </p>
              <RequestFeatureButton
                itemType="PRODUCT"
                itemId={product.id}
                storeName={store.name}
                canRequest={featureButtonState.canRequest}
                alreadyRequested={featureButtonState.alreadyRequested}
              />
            </div>

            {product.shortDescription ? (
              <p className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-white px-4 py-3.5 font-sans text-base font-semibold leading-7 text-zinc-700 shadow-sm">
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
              <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 shadow-[0_12px_35px_rgba(26,127,181,.09)]">
                <h2 className={`mb-3 ${typography.caption} text-zinc-900`}>Preview</h2>
                <a
                  href={product.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1A7FB5] to-[#2D9AD1] px-4 py-3 text-sm font-bold text-white shadow-[0_10px_25px_rgba(26,127,181,.22)] transition hover:-translate-y-0.5"
                >
                  <Download className="size-4" />
                  Download free preview
                </a>
              </div>
            ) : null}

            <div>
              <h2 className={`mb-3 ${typography.caption} text-zinc-900`}>Product Details</h2>
              <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-[0_12px_35px_rgba(38,73,96,.08)]">
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
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white bg-gradient-to-br from-white via-white to-sky-50/75 p-5 shadow-[0_25px_75px_rgba(26,127,181,.15)] ring-1 ring-sky-950/[.06] sm:p-6 lg:sticky lg:top-24 lg:z-10">
              <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-[#1A7FB5]/10 blur-3xl" aria-hidden />
              <div className="relative">
                <div className="mb-4"><ProductContactActions storeId={product.storeId} title={product.name} isOwner={isOwner} /></div>
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
            </div>
          </aside>
        </div>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Shopping assurances">
          {[
            { Icon: ShieldCheck, title: "Secure checkout", text: "Protected payments through WiPay", color: "from-sky-50 to-white text-[#1A7FB5]" },
            { Icon: BadgeCheck, title: store.owner.idVerificationStatus === "APPROVED" ? "Verified business" : "Local business", text: `Sold directly by ${store.name}`, color: "from-emerald-50 to-white text-emerald-600" },
            { Icon: product.isDigital ? Download : Truck, title: product.isDigital ? "Digital delivery" : product.allowDelivery ? "Delivery available" : "Pickup available", text: product.isDigital ? "Access after confirmed payment" : "Fulfilment options shown at checkout", color: "from-orange-50 to-white text-[#D4450A]" },
            { Icon: RotateCcw, title: "Clear policies", text: product.returnPolicy ? "Return details provided by the seller" : "Message the seller before ordering", color: "from-violet-50 to-white text-violet-600" },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3 rounded-2xl border border-white bg-white/85 p-4 shadow-[0_12px_36px_rgba(38,73,96,.09)] ring-1 ring-sky-950/[.035] backdrop-blur">
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color}`}><item.Icon className="size-5" /></span>
              <div><p className="text-sm font-black text-zinc-900">{item.title}</p><p className="mt-0.5 text-[11px] leading-4 text-zinc-500">{item.text}</p></div>
            </div>
          ))}
        </section>

        <section id="reviews" className="mt-12 rounded-[1.75rem] border border-white bg-white/80 p-5 shadow-[0_22px_65px_rgba(38,73,96,.09)] ring-1 ring-sky-950/[.04] backdrop-blur sm:p-8 md:mt-16">
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
        {linkedItems.length > 0 ? (
          <div className="mt-12 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-white to-sky-50/70 shadow-[0_20px_60px_rgba(38,73,96,.08)] ring-1 ring-sky-950/[.04] sm:p-2">
            <RelatedContentSection heading="Related items" items={linkedItems} />
          </div>
        ) : null}
        {moreFromStoreProducts.length > 0 ? (
          <section className="mt-16">
            <div className="mb-6 flex items-center justify-between">
              <div><p className="mb-2 text-[10px] font-black uppercase tracking-[.18em] text-[#1A7FB5]">Keep discovering</p><h2 className="text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">More from {store.name}</h2></div>
              <Link href={`/store/${store.slug}`} className="shrink-0 rounded-full border border-sky-100 bg-white px-4 py-2 text-xs font-black text-[#1A7FB5] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {moreFromStoreProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className="group overflow-hidden rounded-[1.4rem] border border-white bg-gradient-to-br from-white via-white to-sky-50/70 shadow-[0_15px_42px_rgba(38,73,96,.10)] ring-1 ring-sky-950/[.04] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(26,127,181,.16)]"
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
                  <div className="p-3.5 sm:p-4">
                    {p.category ? (
                      <p className="mb-0.5 text-[10px] uppercase tracking-wide text-zinc-400">{formatLabel(p.category)}</p>
                    ) : null}
                    <p className="truncate text-sm font-semibold text-zinc-900">{p.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className={`text-sm font-bold ${tw.textScarlet}`}>
                        {formatTTDPrice(p.price)}
                      </p>
                      {p.compareAtPrice && p.compareAtPrice > p.price ? (
                        <p className="text-xs text-zinc-400 line-through">TTD {p.compareAtPrice.toFixed(2)}</p>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {categoryRelatedProducts.length > 0 ? (
          <section className="mt-14 pb-6">
            <div className="mb-6 flex items-center justify-between">
              <div><p className="mb-2 text-[10px] font-black uppercase tracking-[.18em] text-[#D4450A]">You may also like</p><h2 className="text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">More in {formatLabel(product.category ?? "")}</h2></div>
              <Link
                href={`/shop?category=${product.category}`}
                className="shrink-0 rounded-full border border-orange-100 bg-white px-4 py-2 text-xs font-black text-[#D4450A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {categoryRelatedProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className="group overflow-hidden rounded-[1.4rem] border border-white bg-gradient-to-br from-white via-white to-orange-50/55 shadow-[0_15px_42px_rgba(38,73,96,.10)] ring-1 ring-sky-950/[.04] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(212,69,10,.14)]"
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
                  <div className="p-3.5 sm:p-4">
                    <p className="mb-0.5 truncate text-[10px] uppercase tracking-wide text-zinc-400">
                      {p.store.name}
                    </p>
                    <p className="truncate text-sm font-semibold text-zinc-900">{p.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className={`text-sm font-bold ${tw.textScarlet}`}>{formatTTDPrice(p.price)}</p>
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
          </section>
        ) : null}
      </div>
    </div>
  );
}
