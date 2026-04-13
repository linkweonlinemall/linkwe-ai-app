import Link from "next/link";
import { redirect } from "next/navigation";
import { updateStore } from "@/app/actions/store";
import { getSession } from "@/lib/auth/session";
import { TRINIDAD_ONBOARDING_REGION_OPTIONS } from "@/lib/onboarding/tt-region-options";
import { prisma } from "@/lib/prisma";

const CATEGORY_OPTIONS = [
  { id: "retail", label: "Retail" },
  { id: "food_beverage", label: "Food & Beverage" },
  { id: "services", label: "Services" },
  { id: "fashion", label: "Fashion" },
  { id: "electronics", label: "Electronics" },
  { id: "health_beauty", label: "Health & Beauty" },
  { id: "home_garden", label: "Home & Garden" },
  { id: "automotive", label: "Automotive" },
  { id: "real_estate", label: "Real Estate" },
  { id: "events", label: "Events" },
  { id: "other", label: "Other" },
] as const;

const ERROR_MESSAGES: Record<string, string> = {
  name_required: "Store name is required",
  slug_required: "Store slug is required",
  slug_taken: "This slug is already taken",
  slug_invalid: "Use a valid slug: lowercase letters, numbers, and single hyphens (3–64 characters).",
  region_required: "Please select an operating region.",
  category_required: "Please select a category.",
  upload_failed: "Logo upload failed. Check the file type and size, then try again.",
};

type Props = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function VendorStoreEditPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") {
    redirect("/");
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      region: true,
      categoryId: true,
      logoUrl: true,
    },
  });

  if (!store) {
    redirect("/dashboard/vendor");
  }

  const sp = await searchParams;
  const errorKey = sp.error;
  const errorMessage = errorKey && ERROR_MESSAGES[errorKey] ? ERROR_MESSAGES[errorKey] : null;
  const showSuccess = sp.success === "1";

  const publicStorePath = `/store/${store.slug}`;

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Store</p>
      <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Edit store</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Update how your shop appears on LinkWe. Changes apply to your public store page.
      </p>

      <p className="mt-4 text-sm">
        <Link
          className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50"
          href="/dashboard/vendor"
        >
          ← Back to vendor dashboard
        </Link>
      </p>

      {showSuccess ? (
        <p
          className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100"
          role="status"
        >
          Store saved successfully.
        </p>
      ) : null}

      {errorMessage ? (
        <p
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <form action={updateStore} className="mt-8 flex flex-col gap-4">
        <input name="storeId" type="hidden" value={store.id} />

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Store name
          <input
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={store.name}
            name="name"
            type="text"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Store slug
          <input
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={store.slug}
            name="slug"
            type="text"
          />
          <span className="text-xs font-normal text-zinc-500">
            Your public store: linkwe.tt/store/{store.slug}
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Tagline
          <input
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={store.tagline ?? ""}
            name="tagline"
            placeholder="Short line under your store name"
            type="text"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Operating region
          <select
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={store.region}
            name="region"
          >
            <option value="">Select…</option>
            {TRINIDAD_ONBOARDING_REGION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Category
          <select
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={store.categoryId}
            name="categoryId"
          >
            <option value="">Select…</option>
            {!CATEGORY_OPTIONS.some((c) => c.id === store.categoryId) ? (
              <option value={store.categoryId}>Current ({store.categoryId})</option>
            ) : null}
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Upload new logo
          <input
            accept="image/*"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:file:bg-zinc-700 dark:file:text-zinc-100"
            name="logo"
            type="file"
          />
          <span className="text-xs font-normal text-zinc-500">
            Leave empty to keep your current logo. JPEG, PNG, or WebP. Max 8MB.
          </span>
        </label>

        {store.logoUrl ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Current logo</p>
            <img
              alt=""
              className="h-24 w-24 rounded-lg border border-zinc-200 object-contain dark:border-zinc-700"
              src={store.logoUrl}
            />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            type="submit"
          >
            Save changes
          </button>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-50 dark:hover:bg-zinc-800"
            href={publicStorePath}
            rel="noopener noreferrer"
            target="_blank"
          >
            View public store
          </Link>
        </div>
      </form>
    </div>
  );
}
