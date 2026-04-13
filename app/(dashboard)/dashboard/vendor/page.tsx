import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";
import { ListingMainImage } from "@/components/listing-main-image";
import { prisma } from "@/lib/prisma";

export default async function VendorDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const store = await getStoreByOwnerId(user.id);
  if (!store) redirect("/onboarding/business/step-3");

  const listings = await prisma.listing.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      imageUrl: true,
      status: true,
      createdAt: true,
    },
  });

  const publicUrl = `/store/${store.slug}`;

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Vendor dashboard</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">Manage your store and listings.</p>

      <div className="mt-6">
        <Link
          className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          href="/dashboard/vendor/listings/new"
        >
          Create listing
        </Link>
      </div>

      <section className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Your store</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-zinc-500">Name</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">{store.name}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Slug</dt>
            <dd className="font-mono text-zinc-900 dark:text-zinc-50">{store.slug}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Tagline</dt>
            <dd className="text-zinc-800 dark:text-zinc-200">{store.tagline?.trim() || "—"}</dd>
          </div>
        </dl>
        <div className="mt-6">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-50 dark:hover:bg-zinc-800"
            href={publicUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            View public store
          </Link>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Your listings</h2>
        {listings.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">No listings yet. Create one above.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-700">
            {listings.map((listing) => (
              <li key={listing.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 gap-4">
                  <ListingMainImage
                    alt={`${listing.title} main image`}
                    aspectClass="aspect-square"
                    className="w-24 shrink-0 rounded-lg"
                    imageUrl={listing.imageUrl}
                  />
                  <div className="min-w-0">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">{listing.title}</p>
                  <p className="mt-0.5 font-mono text-xs text-zinc-500">{listing.slug}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {listing.status} · {listing.createdAt.toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:self-center">
                  <Link
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-900 hover:bg-white dark:border-zinc-600 dark:text-zinc-50 dark:hover:bg-zinc-900"
                    href={`/dashboard/vendor/listings/${listing.id}/edit`}
                  >
                    Edit
                  </Link>
                  <Link
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-900 hover:bg-white dark:border-zinc-600 dark:text-zinc-50 dark:hover:bg-zinc-900"
                    href={`/listing/${listing.slug}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
