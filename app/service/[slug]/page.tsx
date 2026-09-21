import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getCrossStoreFeatureButtonState } from "@/app/actions/cross-store";
import { getLinkedContent } from "@/app/actions/content-links";
import RequestFeatureButton from "@/components/cross-store/RequestFeatureButton";
import { getProductReviews, getUserProductReview } from "@/app/actions/reviews";
import RelatedContentSection from "@/components/storefront/RelatedContentSection";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import PublicNav from "@/components/layout/PublicNav";
import BookingWidget from "@/components/service/BookingWidget";
import OnDemandRequestWidget from "@/components/service/OnDemandRequestWidget";
import QuoteRequestWidget from "@/components/service/QuoteRequestWidget";
import SubscribeButton from "@/components/service/SubscribeButton";
import ReviewForm from "@/components/ui/ReviewForm";
import ReviewsList from "@/components/ui/ReviewsList";
import StarRating from "@/components/ui/StarRating";
import { prisma } from "@/lib/prisma";
import { isStoreSellable, productFromSellableStoreWhere } from "@/lib/store/sellable-store";
import { canVendorUsePayOnArrival } from "@/lib/services/payment-policy";

import ServiceDetailView from "@/components/service/ServiceDetailView";
import ProductContactActions from "@/components/product/ProductContactActions";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await prisma.product.findFirst({
    where: { slug: slug.trim().toLowerCase(), isPublished: true, isArchived: false, isService: true },
    select: { name: true, shortDescription: true, description: true, images: true, metaTitle: true, metaDescription: true },
  });
  if (!service) return { title: "Service · LinkWe" };
  const image = service.images[0];
  const description = service.metaDescription || service.shortDescription || service.description?.replace(/<[^>]+>/g, "").slice(0, 160) || undefined;
  return {
    title: service.metaTitle || service.name, description,
    openGraph: image ? { images: [{ url: image, alt: service.name }] } : undefined,
    twitter: image ? { card: "summary_large_image", images: [image] } : undefined,
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId } }) : null;
  const continueHref = user ? getRoleDashboardPath(user.role) : null;

  const unreadCount = await getNavUnreadCount();

  const service = await prisma.product.findUnique({
    where: { slug: slug.trim().toLowerCase() },
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
      tags: true,
      isPublished: true,
      isArchived: true,
      durationMinutes: true,
      advanceBookingDays: true,
      cancellationHours: true,
      isAvailable: true,
      address: true,
      latitude: true,
      longitude: true,
      returnPolicy: true,
      isService: true,
      serviceType: true,
      serviceLocation: true,
      serviceDuration: true,
      requiresDeposit: true,
      depositAmount: true,
      requiresApproval: true,
      bookingPaymentMode: true,
      quotePriceType: true,
      isFeatured: true,
      storeId: true,
      responseTime: true,
      minimumQuoteAmount: true,
      siteVisitRequired: true,
      subscriptionInterval: true,
      sessionsIncluded: true,
      subscriptionCancellationDays: true,
      subscriptionTrialPeriod: true,
      subscriptionTrialPrice: true,
      subscriptionCanPause: true,
      subscriptionPauseMaxWeeks: true,
      travelFee: true,
      serviceRadius: true,
      estimatedResponseMins: true,
      virtualPlatform: true,
      virtualMeetingInfo: true,
      maxGroupSize: true,
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          region: true,
          logoUrl: true,
          address: true,
          latitude: true,
          longitude: true,
          policies: true,
          isAvailableNow: true,
          ownerId: true,
          status: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          owner: { select: { idVerificationStatus: true } },
        },
      },
    },
  });

  if (!service || !service.isPublished || service.isArchived || !service.isService) notFound();

  const isOwner = session != null && service.store.ownerId === session.userId;
  const isAdmin = session?.role === "ADMIN";
  if (!isStoreSellable(service.store) && !isOwner && !isAdmin) notFound();

  const bookingData =
    service.serviceType === "BOOKABLE" || service.serviceType === "VIRTUAL"
      ? await prisma.product.findUnique({
          where: { id: service.id },
          select: {
            advanceBookingDays: true,
            bookingPaymentMode: true,
            requiresDeposit: true,
            depositAmount: true,
            requiresApproval: true,
            durationMinutes: true,
            bufferMinutes: true,
            maxPerDay: true,
            useStoreHours: true,
            availableDays: true,
            availableFrom: true,
            availableTo: true,
            isAvailable: true,
            serviceDuration: true,
            store: { select: { openingHours: true } },
            bookingSlots: {
              where: { date: { gte: new Date() } },
              select: {
                id: true,
                productId: true,
                createdAt: true,
                updatedAt: true,
                date: true,
                startTime: true,
                endTime: true,
                currentBookings: true,
                maxBookings: true,
                isAvailable: true,
              },
            },
          },
        })
      : null;

  const [reviewData, userReview, { items: linkedItems }, featureButtonState, recommendations] =
    await Promise.all([
      getProductReviews(service.id),
      getUserProductReview(service.id),
      getLinkedContent("SERVICE", service.id),
      getCrossStoreFeatureButtonState("SERVICE", service.id),
      prisma.product.findMany({
        where: productFromSellableStoreWhere({ isService: true, isPublished: true, isArchived: false, id: { not: service.id }, storeId: service.storeId }),
        orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }], take: 3,
        select: { id: true, name: true, slug: true, images: true, price: true, serviceType: true, quotePriceType: true, subscriptionInterval: true,
          store: { select: { id: true, name: true, slug: true, logoUrl: true, region: true } } },
      }),
    ]);

  const activeSubscription =
    session != null && service.serviceType === "SUBSCRIPTION"
      ? await prisma.customerServiceSubscription.findFirst({
          where: {
            customerId: session.userId,
            productId: service.id,
            status: "ACTIVE",
          },
          select: {
            id: true,
            cancelAtPeriodEnd: true,
            currentPeriodEnd: true,
          },
        })
      : null;

  const alreadySubscribed = activeSubscription != null;

  const effectivePaymentMode = canVendorUsePayOnArrival(service.store.subscriptionPlan, service.store.subscriptionStatus)
    ? service.bookingPaymentMode ?? "CUSTOMER_CHOOSES" : "ONLINE_ONLY";
  const bookingAction = (service.serviceType === "BOOKABLE" || service.serviceType === "VIRTUAL") && bookingData
    ? bookingData.isAvailable ? (
                  <BookingWidget
                    serviceId={service.id}
                    serviceSlug={service.slug}
                    serviceName={service.name}
                    storeId={service.store.id}
                    isLoggedIn={session != null}
                    isOwner={isOwner}
                    price={service.price}
                    serviceDuration={
                      bookingData.durationMinutes || bookingData.serviceDuration || 60
                    }
                    requiresDeposit={bookingData.requiresDeposit ?? false}
                    depositAmount={bookingData.depositAmount ?? null}
                    requiresApproval={bookingData.requiresApproval ?? false}
                    bookingPaymentMode={
                      canVendorUsePayOnArrival(
                        service.store.subscriptionPlan,
                        service.store.subscriptionStatus,
                      )
                        ? bookingData.bookingPaymentMode ?? "CUSTOMER_CHOOSES"
                        : "ONLINE_ONLY"
                    }
                    advanceBookingDays={bookingData.advanceBookingDays ?? 30}
                    availability={{
                      durationMinutes:
                        bookingData.durationMinutes || bookingData.serviceDuration || 60,
                      bufferMinutes: bookingData.bufferMinutes ?? 0,
                      maxPerDay: bookingData.maxPerDay,
                      useStoreHours: bookingData.useStoreHours,
                      availableDays: bookingData.availableDays,
                      availableFrom: bookingData.availableFrom,
                      availableTo: bookingData.availableTo,
                      isAvailable: bookingData.isAvailable,
                    }}
                    storeOpeningHours={bookingData.store.openingHours}
                    existingSlots={bookingData.bookingSlots.map((slot) => ({
                      ...slot,
                      // Slot availability is capacity-derived. This also recovers
                      // stale false flags from cancellations made before the
                      // cancellation transaction reopened the slot explicitly.
                      isAvailable: slot.currentBookings < slot.maxBookings,
                    }))}
                  />
    ) : <div className="rounded-xl bg-stone-100 p-4 text-sm text-stone-600"><strong>No availability</strong><p className="mt-2">This service is not accepting bookings right now. Check back later.</p></div>
    : service.serviceType === "QUOTE" ? (
                  <QuoteRequestWidget
                    serviceId={service.id}
                    storeId={service.store.id}
                    serviceName={service.name}
                    quotePriceType={service.quotePriceType}
                    price={service.price}
                    minimumQuoteAmount={service.minimumQuoteAmount}
                    siteVisitRequired={service.siteVisitRequired}
                    isLoggedIn={session != null}
                    isOwnStore={isOwner}
                    serviceSlug={service.slug}
                  />
    ) : service.serviceType === "SUBSCRIPTION" ? (
                  <SubscribeButton
                    productId={service.id}
                    serviceSlug={service.slug}
                    isLoggedIn={session != null}
                    isOwner={isOwner}
                    alreadySubscribed={alreadySubscribed}
                    subscription={
                      activeSubscription
                        ? {
                            id: activeSubscription.id,
                            cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
                            currentPeriodEnd: activeSubscription.currentPeriodEnd,
                          }
                        : null
                    }
                  />
    ) : service.serviceType === "ON_DEMAND" ? (
                <OnDemandRequestWidget
                  serviceId={service.id}
                  storeId={service.store.id}
                  serviceName={service.name}
                  estimatedResponseMins={service.estimatedResponseMins ?? null}
                  travelFee={service.travelFee ?? null}
                  serviceRadius={service.serviceRadius ?? null}
                  isAvailableNow={service.store.isAvailableNow ?? false}
                />
    ) : <Link href={`/store/${service.store.slug}`} className="block rounded-full bg-[#D4450A] px-5 py-3 text-center text-sm font-semibold text-white">Contact provider</Link>;

  return <ServiceDetailView service={{ ...service, bookingPaymentMode: effectivePaymentMode }}
    nav={<PublicNav appearance="storefront" user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null} dashboardHref={continueHref ?? undefined} unreadCount={unreadCount} />}
    bookingAction={bookingAction}
    contactActions={<ProductContactActions storeId={service.storeId} title={service.name} isOwner={isOwner} />}
    featureAction={<RequestFeatureButton itemType="SERVICE" itemId={service.id} storeName={service.store.name} canRequest={featureButtonState.canRequest} alreadyRequested={featureButtonState.alreadyRequested} />}
    reviewCount={reviewData.count} averageRating={reviewData.average}
    isVerified={service.store.owner.idVerificationStatus === "APPROVED"} isOwner={isOwner}
    reviews={<><h2 className="mb-6 text-2xl font-semibold tracking-tight">Customer reviews{reviewData.count > 0 && ` (${reviewData.count})`}</h2><div className="flex flex-col gap-6"><ReviewsList reviews={reviewData.reviews} count={reviewData.count} average={reviewData.average} />{!userReview ? <ReviewForm type="product" targetId={service.id} targetName={service.name} /> : <div className="rounded-2xl bg-stone-50 p-5"><p className="mb-3 text-sm font-semibold">Your review</p><StarRating value={userReview.rating} readonly size="md" />{userReview.title && <p className="mt-2 font-semibold">{userReview.title}</p>}{userReview.body && <p className="mt-2 text-sm text-stone-600">{userReview.body}</p>}</div>}</div></>}
    linkedContent={linkedItems.length > 0 ? <RelatedContentSection heading="Related items" items={linkedItems} /> : undefined}
    recommendations={recommendations} />;
}
