import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MainOrderStatus } from "@prisma/client";
import ProductDetailView from "@/components/product/ProductDetailView";
import ProductContactActions from "@/components/product/ProductContactActions";
import FrequentlyBoughtTogether from "@/components/product/FrequentlyBoughtTogether";
import ProductReviewsSection from "@/components/product/ProductReviewsSection";
import PublicNav from "@/components/layout/PublicNav";
import { getCrossStoreFeatureButtonState } from "@/app/actions/cross-store";
import { getLinkedContent } from "@/app/actions/content-links";
import RequestFeatureButton from "@/components/cross-store/RequestFeatureButton";
import { getProductReviews, getUserProductReview } from "@/app/actions/reviews";
import RelatedContentSection from "@/components/storefront/RelatedContentSection";
import { getWishlistProductIds } from "@/app/actions/wishlist";
import { getSession } from "@/lib/auth/session";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { prisma } from "@/lib/prisma";
import { isStoreSellable, sellableStoreWhere } from "@/lib/store/sellable-store";
import { parseProductAttributes } from "@/lib/product/display";

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
      isArchived: true,
    },
  });
  if (!product?.isPublished || product.isArchived) return { title: "Product" };
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
      isArchived: true,
      checkoutFields: true,
      createdAt: true,
      storeId: true,
      hasVariants: true,
      isService: true,
      isDigital: true,
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
          address: true, latitude: true, longitude: true, policies: true, checkoutFields: true,
          ownerId: true,
          status: true,
          owner: { select: { idVerificationStatus: true } },
        },
      },
    },
  });

  if (!product?.isPublished || product.isArchived) notFound();

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

  const variants = product.hasVariants
    ? await prisma.productVariant.findMany({
        where: { productId: product.id },
        select: {
          id: true,
          name: true,
          attributes: true,
          sku: true,
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
      hasVariants: true, stock: true, isDigital: true,
    },
    take: 10,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
  });

  const frequentlyTogether = !product.hasVariants && !product.isDigital && product.stock !== 0 ? sameStoreOthers.filter(item => !item.hasVariants && !item.isDigital && item.stock !== 0).slice(0, 3) : [];
  const moreFromStoreProducts = sameStoreOthers.filter(item => !frequentlyTogether.some(paired => paired.id === item.id)).slice(0, 4);

  const categoryRelatedProducts = product.category
    ? await prisma.product.findMany({
        where: {
          isPublished: true,
          isService: false,
          category: product.category,
          isArchived: false,
          store: sellableStoreWhere(),
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
          isFeatured: true, hasVariants: true, stock: true,
          store: { select: { name: true, slug: true, logoUrl: true, region: true } },
        },
        take: 4,
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      })
    : [];

  const buyBoxVariants = variants.map(variant => ({ ...variant, attributes: parseProductAttributes(variant.attributes) }));
  return <ProductDetailView
    product={product}
    variants={buyBoxVariants}
    nav={<PublicNav appearance="storefront" user={session ? { name: session.fullName ?? "Account", href: dashboardHref! } : null} dashboardHref={dashboardHref ?? undefined} unreadCount={unreadCount} />}
    contactActions={<ProductContactActions storeId={product.storeId} title={product.name} isOwner={isOwner} />}
    featureAction={<RequestFeatureButton itemType="PRODUCT" itemId={product.id} storeName={product.store.name} canRequest={featureButtonState.canRequest} alreadyRequested={featureButtonState.alreadyRequested} />}
    reviews={<ProductReviewsSection productId={product.id} productName={product.name} count={reviewData.count} average={reviewData.average} reviews={reviewData.reviews} userReview={userReview} canWriteReview={canWriteReview} fullWidthLayout />}
    together={frequentlyTogether.length > 0 ? <FrequentlyBoughtTogether currentProduct={product} items={frequentlyTogether} /> : undefined}
    linkedContent={linkedItems.length > 0 ? <RelatedContentSection heading="Related items" items={linkedItems} /> : undefined}
    moreFromStore={moreFromStoreProducts}
    related={categoryRelatedProducts}
    wishlistIds={wishlistIds}
    reviewCount={reviewData.count}
    averageRating={reviewData.average}
    isVerified={product.store.owner.idVerificationStatus === "APPROVED"}
  />;
}
