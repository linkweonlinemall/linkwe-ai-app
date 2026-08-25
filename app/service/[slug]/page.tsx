import Link from "next/link";
import { notFound } from "next/navigation";

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
import ServiceGallery from "@/components/service/ServiceGallery";
import OnDemandRequestWidget from "@/components/service/OnDemandRequestWidget";
import QuoteRequestWidget from "@/components/service/QuoteRequestWidget";
import SubscribeButton from "@/components/service/SubscribeButton";
import ReviewForm from "@/components/ui/ReviewForm";
import ReviewsList from "@/components/ui/ReviewsList";
import StarRating from "@/components/ui/StarRating";
import ExpandableDescription from "@/components/ui/ExpandableDescription";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { getServiceCategoryLabel } from "@/lib/categories";
import { formatSubscriptionIntervalDisplay } from "@/lib/finance/subscription-interval";
import { prisma } from "@/lib/prisma";
import { isStoreSellable } from "@/lib/store/sellable-store";

type Props = { params: Promise<{ slug: string }> };

function serviceTypeDisplay(type: string | null) {
  switch (type) {
    case "BOOKABLE":
      return {
        label: "Bookable",
        description: "Pick a date and time that works for you",
        icon: "📅",
        color: "bg-blue-50 text-blue-700 border-blue-100",
      };
    case "QUOTE":
      return {
        label: "Quote-based",
        description: "Request a quote and the provider will respond",
        icon: "💬",
        color: "bg-amber-50 text-amber-700 border-amber-100",
      };
    case "SUBSCRIPTION":
      return {
        label: "Subscription",
        description: "Recurring service — weekly, fortnightly, or monthly",
        icon: "🔄",
        color: "bg-purple-50 text-purple-700 border-purple-100",
      };
    case "ON_DEMAND":
      return {
        label: "On Demand",
        description: "Request now and the provider will come to you",
        icon: "⚡",
        color: "bg-emerald-50 text-emerald-700 border-emerald-100",
      };
    case "VIRTUAL":
      return {
        label: "Virtual",
        description: "Delivered online via video call or link",
        icon: "💻",
        color: "bg-zinc-100 text-zinc-700 border-zinc-200",
      };
    default:
      return {
        label: "Service",
        description: "Contact the provider for details",
        icon: "🛎️",
        color: "bg-zinc-100 text-zinc-700 border-zinc-200",
      };
  }
}

function locationDisplay(loc: string | null) {
  switch (loc) {
    case "AT_VENDOR":
      return "At provider's location";
    case "AT_CUSTOMER":
      return "At your location";
    case "VIRTUAL":
      return "Online / Virtual";
    case "FLEXIBLE":
      return "Flexible — discuss with provider";
    default:
      return null;
  }
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
          isAvailableNow: true,
          ownerId: true,
          status: true,
          owner: { select: { idVerificationStatus: true } },
        },
      },
    },
  });

  if (!service || !service.isPublished || !service.isService) notFound();

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

  const [reviewData, userReview, { items: linkedItems }, featureButtonState] =
    await Promise.all([
      getProductReviews(service.id),
      getUserProductReview(service.id),
      getLinkedContent("SERVICE", service.id),
      getCrossStoreFeatureButtonState("SERVICE", service.id),
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

  const typeInfo = serviceTypeDisplay(service.serviceType);
  const location = locationDisplay(service.serviceLocation);

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-mobile-public lg:pb-0">
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
        unreadCount={unreadCount}
      />

      <div className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6">
        <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-400">
          <Link href="/" className="hover:text-zinc-700">
            Home
          </Link>
          <span>/</span>
          <Link href="/services" className="hover:text-zinc-700">
            Services
          </Link>
          <span>/</span>
          <Link
            href={`/store/${service.store.slug}?tab=services`}
            className="max-w-32 truncate hover:text-zinc-700"
          >
            {service.store.name}
          </Link>
          <span>/</span>
          <span className="max-w-48 truncate text-zinc-600">{service.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <ServiceGallery images={service.images ?? []} name={service.name} />

            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {service.category ? (
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                    {getServiceCategoryLabel(service.category)}
                  </span>
                ) : null}
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${typeInfo.color}`}>
                  {typeInfo.icon} {typeInfo.label}
                </span>
                {service.isFeatured ? (
                  <span className="rounded-full bg-[#D4450A] px-2.5 py-0.5 text-xs font-bold text-white">
                    Featured
                  </span>
                ) : null}
              </div>
              <h1 className="text-3xl font-black text-zinc-900">{service.name}</h1>
              {reviewData.count > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg
                        key={s}
                        viewBox="0 0 24 24"
                        className={`h-4 w-4 ${s <= Math.round(reviewData.average) ? "fill-[#E8820C]" : "fill-zinc-200"}`}
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-zinc-700">{reviewData.average.toFixed(1)}</span>
                  <span className="text-sm text-zinc-400">
                    ({reviewData.count} review{reviewData.count !== 1 ? "s" : ""})
                  </span>
                </div>
              ) : null}
            </div>

            {service.description ? (
              <ExpandableDescription title="About this service" description={service.description} />
            ) : null}

            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-900">Service details</h2>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3 rounded-xl bg-zinc-50 p-3">
                  <span className="text-xl">{typeInfo.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{typeInfo.label}</p>
                    <p className="text-xs text-zinc-500">{typeInfo.description}</p>
                  </div>
                </div>
                {service.serviceDuration ? (
                  <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
                    <span className="text-xl">⏱️</span>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {service.serviceDuration >= 60
                          ? `${Math.floor(service.serviceDuration / 60)}h${
                              service.serviceDuration % 60 > 0
                                ? ` ${service.serviceDuration % 60}m`
                                : ""
                            }`
                          : `${service.serviceDuration} minutes`}
                      </p>
                      <p className="text-xs text-zinc-500">Session duration</p>
                    </div>
                  </div>
                ) : null}
                {location && service.serviceType !== "VIRTUAL" ? (
                  <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
                    <span className="text-xl">📍</span>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{location}</p>
                      <p className="text-xs text-zinc-500">Service location</p>
                    </div>
                  </div>
                ) : null}
                {service.serviceType === "QUOTE" ? (
                  <>
                    {service.responseTime ? (
                      <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
                        <span className="text-xl">⏱️</span>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">
                            {service.responseTime.replace(/_/g, " ").replace("within", "Within")}
                          </p>
                          <p className="text-xs text-zinc-500">Response time</p>
                        </div>
                      </div>
                    ) : null}
                    {service.quotePriceType === "FREE_QUOTE" && service.minimumQuoteAmount ? (
                      <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
                        <span className="text-xl">💰</span>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">
                            TTD {service.minimumQuoteAmount.toFixed(2)} minimum
                          </p>
                          <p className="text-xs text-zinc-500">Minimum quote amount</p>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
                {service.serviceType === "SUBSCRIPTION" ? (
                  <>
                    {service.subscriptionInterval ? (
                      <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
                        <span className="text-xl">🔄</span>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900 capitalize">
                            {service.subscriptionInterval} billing
                          </p>
                          <p className="text-xs text-zinc-500">Billing interval</p>
                        </div>
                      </div>
                    ) : null}
                    {service.sessionsIncluded ? (
                      <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
                        <span className="text-xl">📋</span>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">
                            {service.sessionsIncluded} sessions per cycle
                          </p>
                          <p className="text-xs text-zinc-500">Included sessions</p>
                        </div>
                      </div>
                    ) : null}
                    {service.subscriptionCancellationDays ? (
                      <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
                        <span className="text-xl">📅</span>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">
                            {service.subscriptionCancellationDays} days notice
                          </p>
                          <p className="text-xs text-zinc-500">Required to cancel</p>
                        </div>
                      </div>
                    ) : null}
                    {service.subscriptionCanPause ? (
                      <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
                        <span className="text-xl">⏸️</span>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">
                            Pause allowed
                            {service.subscriptionPauseMaxWeeks
                              ? ` — up to ${service.subscriptionPauseMaxWeeks} weeks`
                              : ""}
                          </p>
                          <p className="text-xs text-zinc-500">
                            You can pause and resume your subscription
                          </p>
                        </div>
                      </div>
                    ) : null}
                    {service.subscriptionTrialPeriod ? (
                      <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3">
                        <span className="text-xl">🎁</span>
                        <div>
                          <p className="text-sm font-semibold text-emerald-900">
                            {service.subscriptionTrialPeriod}-day trial
                            {service.subscriptionTrialPrice === 0 || !service.subscriptionTrialPrice
                              ? " — free"
                              : ` — TTD ${service.subscriptionTrialPrice.toFixed(2)}`}
                          </p>
                          <p className="text-xs text-emerald-700">
                            Trial period before full subscription begins
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
                {service.serviceType === "ON_DEMAND" ? (
                  <>
                    {service.estimatedResponseMins ? (
                      <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
                        <span className="text-xl">⚡</span>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">
                            {service.estimatedResponseMins >= 60
                              ? `Within ${Math.floor(service.estimatedResponseMins / 60)} hour${Math.floor(service.estimatedResponseMins / 60) > 1 ? "s" : ""}`
                              : `Within ${service.estimatedResponseMins} minutes`}
                          </p>
                          <p className="text-xs text-zinc-500">Estimated response time</p>
                        </div>
                      </div>
                    ) : null}
                    {service.travelFee && service.travelFee > 0 ? (
                      <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
                        <span className="text-xl">🚗</span>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">
                            TTD {service.travelFee.toFixed(2)}
                          </p>
                          <p className="text-xs text-zinc-500">Travel fee</p>
                        </div>
                      </div>
                    ) : null}
                    {service.serviceRadius ? (
                      <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
                        <span className="text-xl">📍</span>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">
                            {service.serviceRadius} km radius
                          </p>
                          <p className="text-xs text-zinc-500">Service area</p>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
                {service.serviceType === "VIRTUAL" ? (
                  <>
                    {service.virtualPlatform
                      ? (() => {
                          const platformConfig: Record<
                            string,
                            { label: string; color: string; icon: string }
                          > = {
                            zoom: {
                              label: "Zoom",
                              color: "bg-blue-50 text-blue-700",
                              icon: "🎥",
                            },
                            google_meet: {
                              label: "Google Meet",
                              color: "bg-green-50 text-green-700",
                              icon: "📹",
                            },
                            whatsapp: {
                              label: "WhatsApp Video",
                              color: "bg-emerald-50 text-emerald-700",
                              icon: "📱",
                            },
                            teams: {
                              label: "Microsoft Teams",
                              color: "bg-purple-50 text-purple-700",
                              icon: "💼",
                            },
                            facetime: {
                              label: "FaceTime",
                              color: "bg-zinc-50 text-zinc-700",
                              icon: "📞",
                            },
                            other: {
                              label: "Online session",
                              color: "bg-zinc-50 text-zinc-700",
                              icon: "💻",
                            },
                          };
                          const platform =
                            platformConfig[service.virtualPlatform ?? ""] ?? {
                              label: service.virtualPlatform ?? "Online session",
                              color: "bg-zinc-50 text-zinc-700",
                              icon: "💻",
                            };
                          return (
                            <div
                              className={`flex items-center gap-3 rounded-xl p-3 ${platform.color}`}
                            >
                              <span className="text-xl">{platform.icon}</span>
                              <div>
                                <p className="text-sm font-semibold">{platform.label}</p>
                                <p className="text-xs opacity-70">Session platform</p>
                              </div>
                            </div>
                          );
                        })()
                      : null}
                    {service.virtualMeetingInfo ? (
                      <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-3">
                        <span className="text-xl">ℹ️</span>
                        <div>
                          <p className="text-sm font-semibold text-blue-900">How it works</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-blue-700">
                            {service.virtualMeetingInfo}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
                      <span className="text-xl">🌐</span>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          Trinidad & Tobago Time (AST)
                        </p>
                        <p className="text-xs text-zinc-500">
                          All session times shown in vendor local time
                        </p>
                      </div>
                    </div>
                    {service.maxGroupSize && service.maxGroupSize > 1 ? (
                      <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
                        <span className="text-xl">👥</span>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">
                            Up to {service.maxGroupSize} participants
                          </p>
                          <p className="text-xs text-zinc-500">Group session</p>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>

            <RelatedContentSection heading="Related items" items={linkedItems} />

            <div className="mt-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold text-zinc-900">
                  Reviews
                  {reviewData.count > 0 ? (
                    <span className="ml-2 text-base font-normal text-zinc-400">
                      ({reviewData.count})
                    </span>
                  ) : null}
                </h2>
              </div>
              <div className="flex flex-col gap-6">
                <ReviewsList
                  reviews={reviewData.reviews as any}
                  count={reviewData.count}
                  average={reviewData.average}
                />
                {!userReview ? (
                  <ReviewForm
                    type="product"
                    targetId={service.id}
                    targetName={service.name}
                  />
                ) : (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                    <p className="mb-3 text-sm font-bold text-zinc-700">Your review</p>
                    <StarRating value={userReview.rating} readonly size="md" />
                    {userReview.body ? (
                      <p className="mt-2 text-sm text-zinc-600">{userReview.body}</p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {service.tags && service.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {service.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 lg:col-span-5 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-4 border-b border-zinc-100 pb-4">
                {service.serviceType === "QUOTE" ? (
                  <div>
                    {service.quotePriceType === "FREE_QUOTE" ? (
                      <p className="text-2xl font-black tracking-tight text-[#D4450A]">
                        Free quote
                      </p>
                    ) : service.quotePriceType === "CALLOUT_FEE" ? (
                      <div>
                        <p className="text-3xl font-black tracking-tight text-[#D4450A]">
                          TTD {service.price.toFixed(2)}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          call-out fee · final price after assessment
                        </p>
                      </div>
                    ) : service.quotePriceType === "STARTING_FROM" ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                          From
                        </p>
                        <p className="text-3xl font-black tracking-tight text-[#D4450A]">
                          TTD {service.price.toFixed(2)}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          starting guide · provider sets final price
                        </p>
                      </div>
                    ) : (
                      <p className="text-3xl font-black tracking-tight text-[#D4450A]">
                        TTD {service.price.toFixed(2)}
                      </p>
                    )}
                  </div>
                ) : service.serviceType === "SUBSCRIPTION" ? (
                  <div>
                    <p className="text-4xl font-black tracking-tight" style={{ color: "#D4450A" }}>
                      TTD {service.price.toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {formatSubscriptionIntervalDisplay(service.subscriptionInterval)}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-4xl font-black tracking-tight" style={{ color: "#D4450A" }}>
                      TTD {service.price.toFixed(2)}
                    </p>
                    {service.serviceDuration ? (
                      <p className="mt-1 text-xs text-zinc-400">
                        per session ·{" "}
                        {service.serviceDuration >= 60
                          ? `${Math.floor(service.serviceDuration / 60)}h${
                              service.serviceDuration % 60 > 0
                                ? ` ${service.serviceDuration % 60}m`
                                : ""
                            }`
                          : `${service.serviceDuration} min`}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              {(service.serviceType === "BOOKABLE" || service.serviceType === "VIRTUAL") && service.requiresDeposit && service.depositAmount ? (
                <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
                  <p className="text-xs font-semibold text-amber-700">
                    TTD {service.depositAmount.toFixed(2)} deposit required to book
                  </p>
                </div>
              ) : null}

              {(service.serviceType === "BOOKABLE" || service.serviceType === "VIRTUAL") &&
              bookingData ? (
                bookingData.isAvailable ? (
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
                    bookingPaymentMode={bookingData.bookingPaymentMode ?? "CUSTOMER_CHOOSES"}
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
                ) : (
                  <div className="mt-4 rounded-xl border border-[#e8e8e8] bg-[#F7F5F2] px-4 py-4 text-center">
                    <p className="text-sm font-semibold text-[#45443f]">No availability</p>
                    <p className="mt-1 text-xs text-[#7c7b77]">
                      This service is not accepting bookings right now. Check back later.
                    </p>
                  </div>
                )
              ) : service.serviceType === "QUOTE" ? (
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-4">
                    <p className="text-sm font-bold text-amber-900">
                      {service.quotePriceType === "FREE_QUOTE"
                        ? "💬 Request a free quote"
                        : service.quotePriceType === "CALLOUT_FEE"
                          ? "🚗 Book a site visit"
                          : "💬 Request a quote"}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-700">
                      {service.quotePriceType === "FREE_QUOTE"
                        ? "Send your details and the provider will get back to you with a custom price."
                        : service.quotePriceType === "CALLOUT_FEE"
                          ? "Book a visit and the provider will assess the job and provide a final quote."
                          : "Describe your requirements and get a custom quote from this provider."}
                    </p>
                  </div>
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
                </div>
              ) : service.serviceType === "SUBSCRIPTION" ? (
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
                    <p className="mb-2 text-sm font-bold text-purple-900">🔄 Subscription</p>
                    <div className="flex flex-col gap-1.5 text-xs text-purple-800">
                      {service.subscriptionInterval ? (
                        <p>
                          <span className="font-semibold">Billing: </span>
                          <span className="capitalize">{service.subscriptionInterval}</span>
                        </p>
                      ) : null}
                      {service.sessionsIncluded ? (
                        <p>
                          <span className="font-semibold">Sessions: </span>
                          {service.sessionsIncluded} per{" "}
                          {service.subscriptionInterval?.replace("ly", "") ?? "cycle"}
                        </p>
                      ) : null}
                      {service.subscriptionCancellationDays !== null &&
                      service.subscriptionCancellationDays !== undefined ? (
                        <p>
                          <span className="font-semibold">Cancel: </span>
                          {service.subscriptionCancellationDays === 0
                            ? "Anytime"
                            : `${service.subscriptionCancellationDays} days notice required`}
                        </p>
                      ) : null}
                      {service.subscriptionCanPause ? (
                        <p>
                          <span className="font-semibold">Pause: </span>
                          {service.subscriptionPauseMaxWeeks
                            ? `Up to ${service.subscriptionPauseMaxWeeks} weeks`
                            : "Allowed anytime"}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {service.subscriptionTrialPeriod ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <p className="text-sm font-bold text-emerald-900">
                        🎁{" "}
                        {service.subscriptionTrialPrice === 0 || !service.subscriptionTrialPrice
                          ? `${service.subscriptionTrialPeriod}-day free trial`
                          : `${service.subscriptionTrialPeriod}-day trial for TTD ${service.subscriptionTrialPrice.toFixed(2)}`}
                      </p>
                      <p className="mt-0.5 text-xs text-emerald-700">
                        Try before you commit to a full subscription
                      </p>
                    </div>
                  ) : null}

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

                  <p className="text-center text-xs text-zinc-400">
                    TTD {service.price.toFixed(2)}{" "}
                    {formatSubscriptionIntervalDisplay(service.subscriptionInterval)}
                  </p>
                </div>
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
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-center">
                  <p className="text-sm font-bold text-zinc-900">Contact provider</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Visit the store to get in touch.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-400">Provided by</p>
              <div className="mb-3 flex items-center gap-3">
                {service.store.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={service.store.logoUrl}
                    alt=""
                    className="h-11 w-11 rounded-full border border-zinc-100 object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#D4450A]/10">
                    <span className="font-bold text-[#D4450A]">{service.store.name[0]}</span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{service.store.name}</p>
                  {service.store.region ? (
                    <p className="text-xs text-zinc-400">{getRegionLabel(service.store.region)}</p>
                  ) : null}
                </div>
              </div>
              <Link
                href={`/store/${service.store.slug}?tab=services`}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                View all services →
              </Link>
              <div className="mt-3 flex justify-center">
                <RequestFeatureButton
                  itemType="SERVICE"
                  itemId={service.id}
                  storeName={service.store.name}
                  canRequest={featureButtonState.canRequest}
                  alreadyRequested={featureButtonState.alreadyRequested}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
