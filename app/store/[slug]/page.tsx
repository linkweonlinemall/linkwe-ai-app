import type { ReactNode } from "react";
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
    <div className="min-h-full bg-zinc-50 px-6 py-16 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <article className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {store.coverPhotoUrl ? (
          <div className="w-full overflow-hidden rounded-xl" style={{ maxHeight: "280px" }}>
            <img
              alt=""
              className="w-full object-cover"
              src={store.coverPhotoUrl}
              style={{ maxHeight: "280px" }}
            />
          </div>
        ) : null}
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">LinkWe store</p>
        {store.logoUrl ? (
          <img
            alt={`${store.name} logo`}
            className="mb-4 h-20 w-20 rounded-xl border border-zinc-200 object-contain dark:border-zinc-700"
            src={store.logoUrl}
          />
        ) : null}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{store.name}</h1>
        {store.tagline ? (
          <p className="mt-4 text-base leading-7 text-zinc-500 dark:text-zinc-400">{store.tagline}</p>
        ) : null}
        {store.description ? (
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{store.description}</p>
        ) : null}
        {store.images && store.images.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {store.images.map((img) => (
              <div key={img.id} className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
                <img alt="" className="h-40 w-full object-cover" src={img.url} />
              </div>
            ))}
          </div>
        ) : null}
        {openingHours ? (
          <section className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-700">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Opening hours</h2>
            <dl className="mt-4 space-y-3">
              {DAYS.map((day) => {
                const sched = openingHours[day];
                if (!sched) return null;
                let right: ReactNode;
                if (sched.closed) {
                  right = "Closed";
                } else if (sched.allDay) {
                  right = "24 hours";
                } else if (sched.slots.length > 0) {
                  right = (
                    <ul className="space-y-1 text-right">
                      {sched.slots.map((s, idx) => (
                        <li key={idx} className="text-sm text-zinc-600 dark:text-zinc-400">
                          {s.from} – {s.to}
                        </li>
                      ))}
                    </ul>
                  );
                } else {
                  right = <span className="text-sm text-zinc-500">—</span>;
                }
                return (
                  <div key={day} className="flex flex-row items-start justify-between gap-4 text-sm">
                    <dt className="font-medium capitalize text-zinc-800 dark:text-zinc-200">{day}</dt>
                    <dd className="min-w-0 text-right text-zinc-600 dark:text-zinc-400">{right}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ) : null}
        {store.tags.length > 0 ? (
          <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Tags</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {store.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {store.amenities.length > 0 ? (
          <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Amenities</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {store.amenities.map((a) => (
                <span key={a} className="text-sm text-zinc-600 dark:text-zinc-400">
                  ✓ {a}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {store.policies ? (
          <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Store policies</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {store.policies}
            </p>
          </div>
        ) : null}
        <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-700">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Owner</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{store.owner.fullName}</p>
          <p className="mt-1 text-xs text-zinc-500">Contact through LinkWe (email hidden).</p>
        </div>

        <section className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-700">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Listings</h2>
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
        </section>
      </article>
    </div>
  );
}
