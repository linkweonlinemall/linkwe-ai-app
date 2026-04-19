import { notFound } from "next/navigation";

import PublicNav from "@/components/layout/PublicNav";
import StorefrontTabs from "@/components/storefront/StorefrontTabs";
import { prisma } from "@/lib/prisma";

type TimeSlot = { from: string; to: string };
type DaySchedule = { closed: boolean; allDay: boolean; slots: TimeSlot[] };
type WeekSchedule = Record<string, DaySchedule>;

type Props = { params: Promise<{ slug: string }> };

export default async function PublicStorePage({ params }: Props) {
  const { slug } = await params;
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    notFound();
  }

  const store = await prisma.store.findUnique({
    where: { slug: normalized },
    select: {
      id: true,
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

  const products = await prisma.product.findMany({
    where: {
      storeId: store.id,
      isPublished: true,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: true,
      category: true,
    },
  });

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <PublicNav />
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <a
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← LinkWe
        </a>
      </div>
      <div className="relative h-64 w-full overflow-hidden bg-gradient-to-r from-zinc-300 to-zinc-400 sm:h-80">
        {store.coverPhotoUrl ? (
          <img alt="" className="h-full w-full object-cover" src={store.coverPhotoUrl} />
        ) : null}
      </div>

      <div className="mx-auto max-w-5xl px-4">
        <StorefrontTabs
          store={store}
          products={products}
          openingHours={openingHours}
          socialLinks={socialLinks}
          hasSocialLinks={hasSocialLinks}
        />
      </div>
    </div>
  );
}
