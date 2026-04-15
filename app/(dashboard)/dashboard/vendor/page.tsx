import Link from "next/link";
import { redirect } from "next/navigation";
import { saveVendorBankDetails } from "@/app/actions/vendor";
import { getSession } from "@/lib/auth/session";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";
import { ListingMainImage } from "@/components/listing-main-image";
import { prisma } from "@/lib/prisma";

const BANK_OPTIONS = [
  "Republic Bank",
  "First Citizens",
  "Scotiabank Trinidad & Tobago",
  "RBC Royal Bank",
  "JMMB Bank",
  "CIBC Caribbean",
  "Bank of Baroda Trinidad & Tobago",
  "EXIMBANK",
  "FCB Merchant Bank",
] as const;

const DASHBOARD_MESSAGES: Record<string, string> = {
  bank_fields_required: "All bank detail fields are required.",
  bank_saved: "Bank details saved successfully.",
};

type Props = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function VendorDashboardPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const store = await getStoreByOwnerId(user.id);
  if (!store) redirect("/onboarding/business/step-3");

  const bankDetails = await prisma.vendorBankDetails.findUnique({
    where: { userId: session.userId },
    select: { bankName: true, accountName: true, accountNumber: true },
  });

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

  const sp = await searchParams;
  const dashboardErrorKey = sp.error;
  const dashboardSuccessKey = sp.success;
  const dashboardErrorMessage =
    dashboardErrorKey && DASHBOARD_MESSAGES[dashboardErrorKey] ? DASHBOARD_MESSAGES[dashboardErrorKey] : null;
  const dashboardSuccessMessage =
    dashboardSuccessKey && DASHBOARD_MESSAGES[dashboardSuccessKey]
      ? DASHBOARD_MESSAGES[dashboardSuccessKey]
      : null;

  const hasBankOnFile =
    !!bankDetails?.bankName &&
    !!bankDetails.accountName &&
    !!bankDetails.accountNumber;

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Vendor dashboard</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">Manage your store and listings.</p>

      {dashboardSuccessMessage ? (
        <p
          className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100"
          role="status"
        >
          {dashboardSuccessMessage}
        </p>
      ) : null}

      {dashboardErrorMessage ? (
        <p
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {dashboardErrorMessage}
        </p>
      ) : null}

      <div className="mt-6">
        <Link
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[#D4450A] px-4 text-sm font-medium text-white hover:bg-[#B83A08] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
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
            <dd className="line-clamp-2 text-zinc-800 dark:text-zinc-200">{store.tagline?.trim() || "—"}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-50 dark:hover:bg-zinc-800"
            href={publicUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            View public store
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-50 dark:hover:bg-zinc-800"
            href="/dashboard/vendor/store/edit"
          >
            Edit store
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

      <section className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Payout details</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Your bank details are used for marketplace payouts. Keep these up to date.
        </p>
        {hasBankOnFile ? (
          <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">✓ Payout details on file</p>
        ) : (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No payout details saved yet.</p>
        )}
        <form action={saveVendorBankDetails} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Bank name
            <select
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              defaultValue={bankDetails?.bankName ?? ""}
              name="bankName"
            >
              <option value="">Select your bank…</option>
              {BANK_OPTIONS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Account name
            <input
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              defaultValue={bankDetails?.accountName ?? ""}
              name="accountName"
              placeholder="Name on the account"
              type="text"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Account number
            <input
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              defaultValue={bankDetails?.accountNumber ?? ""}
              name="accountNumber"
              placeholder="Account number"
              type="text"
            />
          </label>
          <button
            className="inline-flex h-11 w-fit items-center justify-center rounded-lg bg-[#D4450A] px-4 text-sm font-medium text-white hover:bg-[#B83A08]"
            type="submit"
          >
            Save payout details
          </button>
        </form>
      </section>
    </div>
  );
}
