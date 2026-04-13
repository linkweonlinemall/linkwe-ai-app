import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingMainImage } from "@/components/listing-main-image";
import { prisma } from "@/lib/prisma";
import { formatMinorAsUsd } from "@/lib/listing/price";

type Props = { params: Promise<{ slug: string }> };

export default async function PublicListingPage({ params }: Props) {
  const { slug } = await params;
  const normalized = slug.trim().toLowerCase();
  if (!normalized) notFound();

  const listing = await prisma.listing.findUnique({
    where: { slug: normalized },
    select: {
      title: true,
      slug: true,
      imageUrl: true,
      shortDescription: true,
      priceMinor: true,
      currency: true,
      status: true,
      store: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!listing || listing.status !== "PUBLISHED") {
    notFound();
  }

  return (
    <div className="min-h-full bg-zinc-50 px-6 py-16 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <article className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <Link className="hover:underline" href={`/store/${listing.store.slug}`}>
            {listing.store.name}
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{listing.title}</h1>
        <div className="mt-6">
          <ListingMainImage
            alt={`${listing.title} main image`}
            aspectClass="aspect-video"
            className="w-full rounded-xl"
            imageUrl={listing.imageUrl}
          />
        </div>
        <p className="mt-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {formatMinorAsUsd(listing.priceMinor)}
        </p>
        {listing.shortDescription ? (
          <p className="mt-6 text-base leading-7 text-zinc-600 dark:text-zinc-300">{listing.shortDescription}</p>
        ) : null}
      </article>
    </div>
  );
}
