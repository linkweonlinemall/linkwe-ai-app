import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingMainImage } from "@/components/listing-main-image";
import { formatMinorAsUsd } from "@/lib/listing/price";
import { prisma } from "@/lib/prisma";

type TimeSlot = { from: string; to: string };
type DaySchedule = { closed: boolean; allDay: boolean; slots: TimeSlot[] };
type WeekSchedule = Record<string, DaySchedule>;

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

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

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
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
        <div className="relative flex flex-col gap-4 border-b border-zinc-200 bg-white pb-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-end sm:gap-6">
          <div className="-mt-12 h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-zinc-200 shadow-md dark:border-zinc-900">
            {store.logoUrl ? (
              <img alt="" className="h-full w-full object-cover" src={store.logoUrl} />
            ) : (
              <div className="h-full w-full bg-zinc-300 dark:bg-zinc-700" />
            )}
          </div>

          <div className="flex-1 pb-2 pt-2">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{store.name}</h1>
            {store.tagline ? (
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{store.tagline}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {store.categoryId ? (
                <span className="rounded-full bg-zinc-100 px-3 py-0.5 text-xs font-medium capitalize text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  {store.categoryId.replace(/_/g, " ")}
                </span>
              ) : null}
              {store.region ? (
                <span className="rounded-full bg-zinc-100 px-3 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  {store.region.replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex gap-1 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {["About", "Store", "Bookings", "Reviews"].map((tab, index) => (
            <button
              key={tab}
              className={`px-5 py-3 text-sm font-medium transition-colors ${
                index === 0
                  ? "border-b-2 border-[#D4450A] text-[#D4450A]"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            {store.images && store.images.length > 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">Gallery</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {store.images.map((img) => (
                    <div key={img.id} className="overflow-hidden rounded-xl">
                      <img alt="" className="h-36 w-full object-cover" src={img.url} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {store.description ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">About</p>
                <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400">{store.description}</p>
              </div>
            ) : null}

            {store.policies ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Store policies</p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {store.policies}
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-6">
            {openingHours ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">Opening hours</p>
                <ul className="space-y-2">
                  {DAYS.map((day) => {
                    const d = openingHours[day];
                    return (
                      <li key={day} className="flex items-start justify-between text-sm">
                        <span className="w-24 font-medium capitalize text-zinc-700 dark:text-zinc-300">{day}</span>
                        <span className="text-right text-zinc-500 dark:text-zinc-400">
                          {!d || d.closed ? (
                            <span className="text-zinc-400">Closed</span>
                          ) : d.allDay ? (
                            <span>24 hours</span>
                          ) : d.slots.length === 0 ? (
                            <span className="text-zinc-400">Closed</span>
                          ) : (
                            <span className="flex flex-col gap-0.5">
                              {d.slots.map((s, i) => (
                                <span key={i}>
                                  {s.from} – {s.to}
                                </span>
                              ))}
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {store.tags && store.tags.length > 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {store.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {store.amenities && store.amenities.length > 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Amenities</p>
                <div className="flex flex-col gap-2">
                  {store.amenities.map((a) => (
                    <span key={a} className="text-sm text-zinc-600 dark:text-zinc-400">
                      ✓ {a}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Owner</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{store.owner.fullName}</p>
              <p className="mt-1 text-xs text-zinc-500">Contact through LinkWe (email hidden).</p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Listings</p>
          {listings.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">No listings published yet.</p>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-1">
              {listings.map((listing) => (
                <li key={listing.id}>
                  <Link
                    className="group block overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 transition hover:border-zinc-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                    href={`/listing/${listing.slug}`}
                  >
                    <ListingMainImage
                      alt={`${listing.title} main image`}
                      aspectClass="aspect-[4/3]"
                      className="w-full rounded-t-xl"
                      imageUrl={listing.imageUrl}
                    />
                    <div className="p-5 pt-4">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50">{listing.title}</p>
                      <p className="mt-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {formatMinorAsUsd(listing.priceMinor)}
                      </p>
                      {listing.shortDescription?.trim() ? (
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                          {listing.shortDescription.trim()}
                        </p>
                      ) : null}
                      <p className="mt-3 text-xs font-medium text-zinc-500 underline-offset-2 group-hover:underline">
                        View listing →
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
