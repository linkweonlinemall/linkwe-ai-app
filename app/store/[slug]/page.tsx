import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";

import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { prisma } from "@/lib/prisma";
import PublicNav from "@/components/layout/PublicNav";
import StorefrontTabs from "@/components/storefront/StorefrontTabs";
import { getSavedStoreIds } from "@/app/actions/wishlist";
import { getStoreReviewsNew, getUserStoreReview } from "@/app/actions/reviews";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { colors, radius, shadow, typography, tw } from "@/lib/design-system";

type TimeSlot = { from: string; to: string };
type DaySchedule = { closed: boolean; allDay: boolean; slots: TimeSlot[] };
type WeekSchedule = Record<string, DaySchedule>;

type Props = { params: Promise<{ slug: string }> };

function formatCategoryLabel(categoryId: string): string {
  return categoryId.replace(/_/g, " ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    return { title: "Store — LinkWe", description: "Shop on LinkWe" };
  }

  const store = await prisma.store.findUnique({
    where: { slug: normalized },
    select: { name: true, tagline: true },
  });

  return {
    title: store ? `${store.name} — LinkWe` : "Store — LinkWe",
    description: store?.tagline ?? "Shop on LinkWe",
  };
}

export default async function PublicStorePage({ params }: Props) {
  const session = await getSession();
  const navUser = session
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;
  const continueHref = navUser ? getRoleDashboardPath(navUser.role) : null;

  const unreadCount = await getNavUnreadCount();

  const { slug } = await params;
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    notFound();
  }

  const store = await prisma.store.findUnique({
    where: { slug: normalized },
    select: {
      id: true,
      ownerId: true,
      name: true,
      slug: true,
      tagline: true,
      categoryId: true,
      region: true,
      logoUrl: true,
      description: true,
      coverPhotoUrl: true,
      images: {
        select: { id: true, url: true, position: true },
        orderBy: { position: "asc" },
      },
      openingHours: true,
      tags: true,
      amenities: true,
      policies: true,
      latitude: true,
      longitude: true,
      address: true,
      socialLinks: true,
      owner: {
        select: {
          fullName: true,
        },
      },
    },
  });

  if (!store) {
    notFound();
  }

  const isOwner = session != null && store.ownerId === session.userId;
  const isAdmin = session?.role === "ADMIN";
  const canEditStore = isOwner || isAdmin;

  const savedStoreIds = await getSavedStoreIds();
  const isSaved = savedStoreIds.includes(store.id);

  const [reviewData, userReview] = await Promise.all([
    getStoreReviewsNew(store.id),
    getUserStoreReview(store.id),
  ]);

  const socialLinks = (store.socialLinks as Record<string, string> | null) ?? {};
  const hasSocialLinks = Object.keys(socialLinks).length > 0;

  const openingHours =
    store.openingHours != null && typeof store.openingHours === "object"
      ? (store.openingHours as WeekSchedule)
      : null;

  const listings = await prisma.listing.findMany({
    where: {
      storeId: store.id,
      status: "PUBLISHED",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      priceMinor: true,
      shortDescription: true,
      imageUrl: true,
      createdAt: true,
    },
  });
  void listings;

  const products = await prisma.product.findMany({
    where: {
      storeId: store.id,
      isPublished: true,
      isService: false,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      compareAtPrice: true,
      images: true,
      category: true,
      stock: true,
      hasVariants: true,
    },
  });

  const services = await prisma.product.findMany({
    where: {
      storeId: store.id,
      isPublished: true,
      isService: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: true,
      category: true,
      serviceType: true,
      serviceDuration: true,
      serviceLocation: true,
      isFeatured: true,
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
  });

  const relatedStores = await prisma.store.findMany({
    where: {
      categoryId: store.categoryId,
      slug: { not: store.slug },
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      coverPhotoUrl: true,
      tagline: true,
      region: true,
      categoryId: true,
    },
    take: 6,
    orderBy: { createdAt: "desc" },
  });

  const initials = store.name
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || store.name.charAt(0).toUpperCase();

  return (
    <div className={`min-h-screen pb-mobile-public lg:pb-0 ${tw.fontSans} ${tw.bgPage}`}>
      <PublicNav
        transparent
        user={
          navUser
            ? { name: navUser.fullName ?? "Account", href: continueHref! }
            : null
        }
        dashboardHref={continueHref ?? undefined}
        unreadCount={unreadCount}
      />

      <section className="relative w-full" style={{ height: "clamp(240px, 38vw, 480px)" }}>
        {store.coverPhotoUrl ? (
          <img
            src={store.coverPhotoUrl}
            alt={`${store.name} cover`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${colors.dark} 0%, rgba(212,69,10,0.15) 100%)`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />
        <div
          className="absolute bottom-0 left-0 right-0 h-24"
          style={{ background: `linear-gradient(to top, ${colors.background}, transparent)` }}
        />
      </section>

      <section
        className="relative px-4 pb-1 sm:px-6"
        style={{ maxWidth: 1024, margin: "0 auto", marginTop: -48, background: colors.background }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-1 items-end gap-4 sm:gap-5">
            <div
              className={`relative h-20 w-20 shrink-0 overflow-hidden ${radius.card} ring-4 ${tw.ringPage} sm:h-24 sm:w-24 ${shadow.card}`}
            >
              {store.logoUrl ? (
                <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-2xl font-bold text-white sm:text-3xl"
                  style={{ backgroundColor: colors.scarlet }}
                >
                  {initials}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className={`truncate ${typography.h4} text-zinc-900 sm:text-2xl`}>{store.name}</h1>
              </div>
              {store.tagline ? (
                <p className={`mt-0.5 truncate ${typography.bodySmall} text-zinc-500`}>
                  {store.tagline}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {store.region ? (
                  <span className={`flex items-center gap-1 text-xs text-zinc-500`}>
                    <MapPin className="size-3.5 shrink-0" aria-hidden strokeWidth={2} />
                    {getRegionLabel(store.region)}
                  </span>
                ) : null}
                {store.categoryId ? (
                  <span
                    className={`${radius.pill} border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700`}
                  >
                    {formatCategoryLabel(store.categoryId)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <StorefrontTabs
        store={store}
        storeId={store.id}
        initialSaved={isSaved}
        products={products}
        services={services}
        relatedStores={relatedStores}
        openingHours={openingHours}
        socialLinks={socialLinks}
        hasSocialLinks={hasSocialLinks}
        canEditStore={canEditStore}
        reviewData={reviewData as any} // eslint-disable-line @typescript-eslint/no-explicit-any -- server review bundle
        userReview={userReview}
      />

      <footer className={`mt-8 border-t border-zinc-200 px-4 py-6 text-center ${tw.bgPage}`}>
        <p className="text-xs text-zinc-500">
          <Link href="/" className={`font-semibold ${tw.textScarlet} hover:underline`}>
            LinkWe
          </Link>{" "}
          — Trinidad & Tobago&apos;s Marketplace
        </p>
      </footer>
    </div>
  );
}
