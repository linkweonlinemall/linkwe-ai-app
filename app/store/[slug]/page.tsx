import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingMainImage } from "@/components/listing-main-image";
import { formatMinorAsUsd } from "@/lib/listing/price";
import { prisma } from "@/lib/prisma";

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
