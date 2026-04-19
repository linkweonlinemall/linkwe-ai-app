import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { updateStore } from "@/app/actions/store";
import StoreLocationPicker from "@/components/storefront/StoreLocationPicker";
import GalleryUploadWrapper from "./gallery-upload-wrapper";
import { getSession } from "@/lib/auth/session";
import { TRINIDAD_ONBOARDING_REGION_OPTIONS } from "@/lib/onboarding/tt-region-options";
import { prisma } from "@/lib/prisma";

const CATEGORY_OPTIONS = [
  { id: "retail", label: "Retail" },
  { id: "general_retail", label: "General Retail" },
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

type TimeSlot = { from: string; to: string };
type DaySchedule = { closed: boolean; allDay: boolean; slots: TimeSlot[] };
type WeekSchedule = Record<string, DaySchedule>;

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

const DEFAULT_HOURS: WeekSchedule = {
  monday: { closed: false, allDay: false, slots: [{ from: "08:00", to: "17:00" }] },
  tuesday: { closed: false, allDay: false, slots: [{ from: "08:00", to: "17:00" }] },
  wednesday: { closed: false, allDay: false, slots: [{ from: "08:00", to: "17:00" }] },
  thursday: { closed: false, allDay: false, slots: [{ from: "08:00", to: "17:00" }] },
  friday: { closed: false, allDay: false, slots: [{ from: "08:00", to: "17:00" }] },
  saturday: { closed: true, allDay: false, slots: [] },
  sunday: { closed: true, allDay: false, slots: [] },
};

const AMENITY_OPTIONS = [
  "Free WiFi",
  "Parking available",
  "Wheelchair accessible",
  "Air conditioned",
  "Outdoor seating",
  "Indoor seating",
  "Delivery available",
  "Pickup available",
  "Card payments accepted",
  "Cash only",
  "Pet friendly",
  "Family friendly",
] as const;

const ERROR_MESSAGES: Record<string, string> = {
  name_required: "Store name is required",
  slug_required: "Store slug is required",
  slug_taken: "This slug is already taken",
  slug_invalid: "Use a valid slug: lowercase letters, numbers, and single hyphens (3–64 characters).",
  region_required: "Please select an operating region.",
  category_required: "Please select a category.",
  upload_failed: "Upload failed. Check the file type and size, then try again.",
  gallery_full: "The store gallery can hold at most 10 photos. Remove one to add another.",
  no_file: "Choose a photo to upload.",
  unauthorized: "You could not remove that photo.",
};

type Props = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function VendorStoreEditPage({ searchParams }: Props) {
  noStore();
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
      description: true,
      coverPhotoUrl: true,
      openingHours: true,
      tags: true,
      amenities: true,
      policies: true,
      latitude: true,
      longitude: true,
      address: true,
      socialLinks: true,
      images: {
        select: { id: true, url: true, position: true },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!store) {
    redirect("/dashboard/vendor");
  }

  const sp = await searchParams;
  const errorKey = sp.error;
  const errorMessage = errorKey && ERROR_MESSAGES[errorKey] ? ERROR_MESSAGES[errorKey] : null;
  const showStoreSuccess = sp.success === "1";
  const showGallerySuccess = sp.success === "gallery_updated";

  const publicStorePath = `/store/${store.slug}`;

  const hours: WeekSchedule = (store.openingHours as WeekSchedule | null) ?? DEFAULT_HOURS;

  const parsedSocialLinks = (store.socialLinks as Record<string, string> | null) ?? {};

  return (
    <div className="mx-auto max-w-6xl rounded-xl border border-zinc-200 bg-white p-10 dark:border-zinc-800 dark:bg-zinc-900">
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

      {showStoreSuccess ? (
        <p
          className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100"
          role="status"
        >
          Store saved successfully.
        </p>
      ) : null}

      {showGallerySuccess ? (
        <p
          className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100"
          role="status"
        >
          Store gallery updated.
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

      <form
        action={updateStore}
        className="mt-8 flex flex-col gap-6"
        id="vendor-store-edit-form"
      >
        <input name="storeId" type="hidden" value={store.id} />
        <input name="hasHours" type="hidden" value="1" />

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
          About your store
          <textarea
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={store.description ?? ""}
            maxLength={1000}
            name="description"
            placeholder="Tell customers what your store is about."
            rows={4}
          ></textarea>
          <span className="text-xs font-normal text-zinc-500">Max 1000 characters.</span>
        </label>

        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6 mt-2">
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

          <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
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
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6 mt-2">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
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
            </div>
            {store.logoUrl ? (
              <img
                alt=""
                className="h-24 w-24 shrink-0 rounded-lg border border-zinc-200 object-contain dark:border-zinc-700"
                src={store.logoUrl}
              />
            ) : null}
          </div>

          <div className="mt-4 flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Cover photo
                <input
                  accept="image/*"
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:file:bg-zinc-700 dark:file:text-zinc-100"
                  name="coverPhoto"
                  type="file"
                />
                <span className="text-xs font-normal text-zinc-500">
                  This image appears as a banner at the top of your store page. Recommended size: 1200 × 400px. Leave empty to keep the current cover photo.
                </span>
              </label>
            </div>
            {store.coverPhotoUrl ? (
              <img
                alt=""
                className="w-full max-w-[220px] shrink-0 rounded-lg border border-zinc-200 object-cover dark:border-zinc-700"
                src={store.coverPhotoUrl}
                style={{ maxHeight: "160px" }}
              />
            ) : null}
          </div>
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6 mt-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Opening hours</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Set your opening hours for each day. Add multiple slots for split hours like a lunch break.
          </p>
          <div className="mt-4 flex flex-col gap-1">
            {DAYS.map((day) => {
              const d = hours[day] ?? DEFAULT_HOURS[day];
              const closed = d.closed;
              const allDay = d.allDay;
              const slotHidden = closed || allDay;
              return (
                <div
                  key={day}
                  className="flex flex-wrap items-start gap-2 border-b border-zinc-100 py-2 last:border-b-0 dark:border-zinc-800"
                >
                  <span className="w-28 shrink-0 pt-2 text-sm font-medium capitalize text-zinc-900 dark:text-zinc-50">
                    {day}
                  </span>
                  <label className="flex shrink-0 items-center gap-2 pt-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <input defaultChecked={closed} name={`hours_${day}_closed`} type="checkbox" />
                    Closed
                  </label>
                  <label className="flex shrink-0 items-center gap-2 pt-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <input defaultChecked={allDay} name={`hours_${day}_allDay`} type="checkbox" />
                    24 hours
                  </label>
                  <input
                    name={`hours_${day}_slotCount`}
                    type="hidden"
                    value={String(Math.min(d.slots.length + 1, 3))}
                  />
                  <div className={`min-w-0 flex-1 flex-col gap-2 ${slotHidden ? "hidden" : "flex"}`}>
                    {[0, 1, 2].map((i) => {
                      const slot = d.slots[i];
                      return (
                        <div key={i} className="flex flex-wrap items-center gap-2">
                          <input
                            className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                            defaultValue={slot?.from ?? ""}
                            name={`hours_${day}_from_${i}`}
                            type="time"
                          />
                          <span className="text-xs text-zinc-500">to</span>
                          <input
                            className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                            defaultValue={slot?.to ?? ""}
                            name={`hours_${day}_to_${i}`}
                            type="time"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6 mt-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Search tags</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Add keywords that describe your store. Separate tags with commas. Example: handmade, local, organic
          </p>
          <input
            className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={store.tags.join(", ")}
            name="tags"
            placeholder="handmade, local, organic"
            type="text"
          />
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6 mt-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Amenities</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Select the features available at your store.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {AMENITY_OPTIONS.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200"
              >
                <input
                  className="rounded border border-zinc-300 text-zinc-900 dark:border-zinc-600"
                  defaultChecked={store.amenities.includes(option)}
                  name="amenities"
                  type="checkbox"
                  value={option}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6 mt-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Store policies</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Return policy, shipping terms, payment rules, or anything customers should know before buying.
          </p>
          <textarea
            className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            defaultValue={store.policies ?? ""}
            maxLength={2000}
            name="policies"
            placeholder="Example: We accept returns within 14 days of delivery. Items must be unused and in original packaging."
            rows={5}
          ></textarea>
          <span className="mt-1 text-xs text-zinc-500">Max 2000 characters.</span>
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6 mt-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Store location</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Search for your address then drag the pin to fine-tune your exact location.
          </p>
          <div className="mt-4">
            <StoreLocationPicker
              initialAddress={store.address ?? ""}
              initialLat={store.latitude ?? null}
              initialLng={store.longitude ?? null}
            />
          </div>
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6 mt-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Social media</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Add your social media handles so customers can find and follow you.
          </p>
          <div className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Instagram
              <div className="flex items-center overflow-hidden rounded-lg border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950">
                <span className="shrink-0 border-r border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">
                  instagram.com/
                </span>
                <input
                  className="flex-1 bg-white px-3 py-2 text-base text-zinc-900 outline-none dark:bg-zinc-950 dark:text-zinc-50"
                  defaultValue={parsedSocialLinks.instagram ?? ""}
                  name="social_instagram"
                  placeholder="yourhandle"
                  type="text"
                />
              </div>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Facebook
              <div className="flex items-center overflow-hidden rounded-lg border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950">
                <span className="shrink-0 border-r border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">
                  facebook.com/
                </span>
                <input
                  className="flex-1 bg-white px-3 py-2 text-base text-zinc-900 outline-none dark:bg-zinc-950 dark:text-zinc-50"
                  defaultValue={parsedSocialLinks.facebook ?? ""}
                  name="social_facebook"
                  placeholder="yourpage"
                  type="text"
                />
              </div>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              TikTok
              <div className="flex items-center overflow-hidden rounded-lg border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950">
                <span className="shrink-0 border-r border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">
                  tiktok.com/@
                </span>
                <input
                  className="flex-1 bg-white px-3 py-2 text-base text-zinc-900 outline-none dark:bg-zinc-950 dark:text-zinc-50"
                  defaultValue={parsedSocialLinks.tiktok ?? ""}
                  name="social_tiktok"
                  placeholder="yourhandle"
                  type="text"
                />
              </div>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              YouTube
              <div className="flex items-center overflow-hidden rounded-lg border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950">
                <span className="shrink-0 border-r border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">
                  youtube.com/@
                </span>
                <input
                  className="flex-1 bg-white px-3 py-2 text-base text-zinc-900 outline-none dark:bg-zinc-950 dark:text-zinc-50"
                  defaultValue={parsedSocialLinks.youtube ?? ""}
                  name="social_youtube"
                  placeholder="yourchannel"
                  type="text"
                />
              </div>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              X
              <div className="flex items-center overflow-hidden rounded-lg border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950">
                <span className="shrink-0 border-r border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">
                  x.com/
                </span>
                <input
                  className="flex-1 bg-white px-3 py-2 text-base text-zinc-900 outline-none dark:bg-zinc-950 dark:text-zinc-50"
                  defaultValue={parsedSocialLinks.x ?? ""}
                  name="social_x"
                  placeholder="yourhandle"
                  type="text"
                />
              </div>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              LinkedIn
              <div className="flex items-center overflow-hidden rounded-lg border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950">
                <span className="shrink-0 border-r border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">
                  linkedin.com/in/
                </span>
                <input
                  className="flex-1 bg-white px-3 py-2 text-base text-zinc-900 outline-none dark:bg-zinc-950 dark:text-zinc-50"
                  defaultValue={parsedSocialLinks.linkedin ?? ""}
                  name="social_linkedin"
                  placeholder="yourprofile"
                  type="text"
                />
              </div>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              WhatsApp
              <div className="flex items-center overflow-hidden rounded-lg border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950">
                <span className="shrink-0 border-r border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">
                  +1 (868)
                </span>
                <input
                  className="flex-1 bg-white px-3 py-2 text-base text-zinc-900 outline-none dark:bg-zinc-950 dark:text-zinc-50"
                  defaultValue={parsedSocialLinks.whatsapp ?? ""}
                  name="social_whatsapp"
                  placeholder="7001234 — business number"
                  type="text"
                />
              </div>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Website
              <div className="flex items-center overflow-hidden rounded-lg border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950">
                <span className="shrink-0 border-r border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">
                  https://
                </span>
                <input
                  className="flex-1 bg-white px-3 py-2 text-base text-zinc-900 outline-none dark:bg-zinc-950 dark:text-zinc-50"
                  defaultValue={parsedSocialLinks.website ?? ""}
                  name="social_website"
                  placeholder="yourwebsite.com"
                  type="text"
                />
              </div>
            </label>
          </div>
        </div>
      </form>

      <GalleryUploadWrapper images={store.images} slotsAvailable={10 - store.images.length} />

      <div className="mt-8 flex flex-wrap gap-3 pt-2">
        <button
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[#D4450A] px-4 text-sm font-medium text-white hover:bg-[#B83A08] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          form="vendor-store-edit-form"
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
    </div>
  );
}
