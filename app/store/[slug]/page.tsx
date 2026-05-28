import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { prisma } from "@/lib/prisma";
import PublicNav from "@/components/layout/PublicNav";
import StorefrontTabs from "@/components/storefront/StorefrontTabs";
import StorePageHero from "@/components/storefront/StorePageHero";
import StoreStatsBar from "@/components/storefront/StoreStatsBar";
import { getSavedStoreIds } from "@/app/actions/wishlist";
import { getStoreReviewsNew, getUserStoreReview } from "@/app/actions/reviews";
import { tw } from "@/lib/design-system";

type WeekSchedule = Record<
  string,
  { closed: boolean; allDay: boolean; slots: { from: string; to: string }[] }
>;

type Props = { params: Promise<{ slug: string }> };

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
      status: true,
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
          idVerificationStatus: true,
        },
      },
      _count: {
        select: { savedBy: true },
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

  const socialLinks = Object.fromEntries(
    Object.entries(
      store.socialLinks != null &&
        typeof store.socialLinks === "object" &&
        !Array.isArray(store.socialLinks)
        ? (store.socialLinks as Record<string, string>)
        : {},
    ).filter(([, url]) => typeof url === "string" && url.trim().length > 0),
  ) as Record<string, string>;
  const hasSocialLinks = Object.keys(socialLinks).length > 0;

  const openingHours =
    store.openingHours != null && typeof store.openingHours === "object"
      ? (store.openingHours as WeekSchedule)
      : null;

  const products = await prisma.product.findMany({
    where: {
      storeId: store.id,
      isPublished: true,
      isService: false,
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
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
      isFeatured: true,
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

  const initials =
    store.name
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .map((w) => w[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || store.name.charAt(0).toUpperCase();

  const isVerified =
    store.status === "ACTIVE" && store.owner.idVerificationStatus === "APPROVED";

  const averageRating = reviewData?.average ?? 0;
  const reviewCount = reviewData?.count ?? 0;

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

      <div className="relative">
        <StorePageHero
          store={{
            id: store.id,
            name: store.name,
            slug: store.slug,
            tagline: store.tagline,
            logoUrl: store.logoUrl,
            coverPhotoUrl: store.coverPhotoUrl,
            categoryId: store.categoryId,
            region: store.region,
          }}
          initials={initials}
          canEditStore={canEditStore}
          initialFollowing={isSaved}
          averageRating={averageRating}
          reviewCount={reviewCount}
        />
      </div>

      <StoreStatsBar
        productCount={products.length}
        serviceCount={services.length}
        averageRating={averageRating}
        reviewCount={reviewCount}
        isVerified={isVerified}
      />

      <Suspense fallback={<div className="min-h-[40vh] bg-[#F7F5F2]" />}>
        <StorefrontTabs
          store={store}
          storeId={store.id}
          initialSaved={isSaved}
          followerCount={store._count.savedBy}
          products={products}
          services={services}
          relatedStores={relatedStores}
          openingHours={openingHours}
          socialLinks={socialLinks}
          hasSocialLinks={hasSocialLinks}
          canEditStore={canEditStore}
          reviewData={reviewData as {
            reviews: unknown[];
            count: number;
            average: number;
          }}
          userReview={userReview}
          isLoggedIn={session != null}
        />
      </Suspense>

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
