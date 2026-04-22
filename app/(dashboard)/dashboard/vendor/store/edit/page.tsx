import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";

import { updateStore } from "@/app/actions/store";
import StoreLocationPicker from "@/components/storefront/StoreLocationPicker";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
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
    <div className="max-w-3xl mx-auto px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <a
            href="/dashboard/vendor"
            className="mb-1 inline-flex items-center gap-1 text-xs hover:underline"
            style={{ color: "var(--blue)" }}
          >
            ← Back to dashboard
          </a>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Edit Store
          </h1>
        </div>
      </div>

      {showStoreSuccess ? (
        <p
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          role="status"
        >
          Store saved successfully.
        </p>
      ) : null}

      {showGallerySuccess ? (
        <p
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          role="status"
        >
          Store gallery updated.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <form action={updateStore} className="flex flex-col" id="vendor-store-edit-form">
        <input name="storeId" type="hidden" value={store.id} />
        <input name="hasHours" type="hidden" value="1" />

        <div
          className="mb-5 rounded-xl bg-white p-5 sm:p-6"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Store Identity
          </h2>
          <div className="flex flex-col gap-4">
            <Input
              required
              className="text-base"
              defaultValue={store.name}
              label="Store name"
              name="name"
              type="text"
            />
            <Input
              required
              className="font-mono text-base"
              defaultValue={store.slug}
              helperText={`Your public store: linkwe.tt/store/${store.slug}`}
              label="Store slug"
              name="slug"
              type="text"
            />
            <Input
              className="text-base"
              defaultValue={store.tagline ?? ""}
              label="Tagline"
              name="tagline"
              placeholder="Short line under your store name"
              type="text"
            />
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <Input
                  accept="image/*"
                  className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900"
                  helperText="Leave empty to keep your current logo. JPEG, PNG, or WebP. Max 8MB."
                  label="Upload new logo"
                  name="logo"
                  type="file"
                />
              </div>
              {store.logoUrl ? (
                <img
                  alt=""
                  className="h-24 w-24 shrink-0 rounded-lg border border-zinc-200 object-contain"
                  src={store.logoUrl}
                />
              ) : null}
            </div>
          </div>
        </div>

        <div
          className="mb-5 rounded-xl bg-white p-5 sm:p-6"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Details
          </h2>
          <div className="flex flex-col gap-4">
            <Select required className="text-base" defaultValue={store.region} label="Operating region" name="region">
              <option value="">Select…</option>
              {TRINIDAD_ONBOARDING_REGION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select required className="text-base" defaultValue={store.categoryId} label="Category" name="categoryId">
              <option value="">Select…</option>
              {!CATEGORY_OPTIONS.some((c) => c.id === store.categoryId) ? (
                <option value={store.categoryId}>Current ({store.categoryId})</option>
              ) : null}
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Textarea
              className="min-h-[120px] text-base"
              defaultValue={store.description ?? ""}
              helperText="Max 1000 characters."
              label="About your store"
              maxLength={1000}
              name="description"
              placeholder="Tell customers what your store is about."
              rows={4}
            />
          </div>
        </div>

        <div
          className="mb-5 rounded-xl bg-white p-5 sm:p-6"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Cover Photo
          </h2>
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <Input
                accept="image/*"
                className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900"
                helperText="This image appears as a banner at the top of your store page. Recommended size: 1200 × 400px. Leave empty to keep the current cover photo."
                label="Cover photo"
                name="coverPhoto"
                type="file"
              />
            </div>
            {store.coverPhotoUrl ? (
              <img
                alt=""
                className="w-full max-w-[220px] shrink-0 rounded-lg border border-zinc-200 object-cover"
                src={store.coverPhotoUrl}
                style={{ maxHeight: "160px" }}
              />
            ) : null}
          </div>
        </div>

        <div
          className="mb-5 rounded-xl bg-white p-5 sm:p-6"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Opening Hours
          </h2>
          <p className="mb-4 text-sm text-zinc-600">
            Set your opening hours for each day. Add multiple slots for split hours like a lunch break.
          </p>
          <div className="flex flex-col gap-1">
            {DAYS.map((day) => {
              const d = hours[day] ?? DEFAULT_HOURS[day];
              const closed = d.closed;
              const allDay = d.allDay;
              const slotHidden = closed || allDay;
              return (
                <div
                  key={day}
                  className="flex flex-wrap items-start gap-2 border-b border-zinc-100 py-2 last:border-b-0"
                >
                  <span className="w-28 shrink-0 pt-2 text-sm font-medium capitalize text-zinc-900">{day}</span>
                  <label className="flex shrink-0 items-center gap-2 pt-2 text-xs text-zinc-600">
                    <input defaultChecked={closed} name={`hours_${day}_closed`} type="checkbox" />
                    Closed
                  </label>
                  <label className="flex shrink-0 items-center gap-2 pt-2 text-xs text-zinc-600">
                    <input defaultChecked={allDay} name={`hours_${day}_allDay`} type="checkbox" />
                    24 hours
                  </label>
                  <input name={`hours_${day}_slotCount`} type="hidden" value={String(Math.min(d.slots.length + 1, 3))} />
                  <div className={`min-w-0 flex-1 flex-col gap-2 ${slotHidden ? "hidden" : "flex"}`}>
                    {[0, 1, 2].map((i) => {
                      const slot = d.slots[i];
                      return (
                        <div key={i} className="flex flex-wrap items-center gap-2">
                          <Input
                            className="max-w-[9.5rem] px-2 py-1.5 text-sm"
                            defaultValue={slot?.from ?? ""}
                            id={`hours-${day}-from-${i}`}
                            name={`hours_${day}_from_${i}`}
                            type="time"
                          />
                          <span className="text-xs text-zinc-500">to</span>
                          <Input
                            className="max-w-[9.5rem] px-2 py-1.5 text-sm"
                            defaultValue={slot?.to ?? ""}
                            id={`hours-${day}-to-${i}`}
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

        <div
          className="mb-5 rounded-xl bg-white p-5 sm:p-6"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Location
          </h2>
          <p className="mb-4 text-sm text-zinc-600">
            Search for your address then drag the pin to fine-tune your exact location.
          </p>
          <StoreLocationPicker
            initialAddress={store.address ?? ""}
            initialLat={store.latitude ?? null}
            initialLng={store.longitude ?? null}
          />
        </div>

        <div
          className="mb-5 rounded-xl bg-white p-5 sm:p-6"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Tags &amp; Policies
          </h2>
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-4 text-sm text-zinc-600">
                Add keywords that describe your store. Separate tags with commas. Example: handmade, local, organic
              </p>
              <Input
                className="text-base"
                defaultValue={store.tags.join(", ")}
                name="tags"
                placeholder="handmade, local, organic"
                type="text"
              />
            </div>
            <div>
              <p className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Amenities
              </p>
              <p className="mb-4 text-sm text-zinc-600">Select the features available at your store.</p>
              <div className="mb-4 grid grid-cols-2 gap-3">
                {AMENITY_OPTIONS.map((option) => (
                  <label key={option} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
                    <input
                      className="rounded border border-zinc-300 text-zinc-900"
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
            <div>
              <p className="mb-4 text-sm text-zinc-600">
                Return policy, shipping terms, payment rules, or anything customers should know before buying.
              </p>
              <Textarea
                className="min-h-[140px] text-base"
                defaultValue={store.policies ?? ""}
                helperText="Max 2000 characters."
                maxLength={2000}
                name="policies"
                placeholder="Example: We accept returns within 14 days of delivery. Items must be unused and in original packaging."
                rows={5}
              />
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Social media
              </h3>
              <p className="mb-4 text-sm text-zinc-600">
                Add your social media handles so customers can find and follow you.
              </p>
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800">
                  Instagram
                  <div className="flex items-center overflow-hidden rounded-lg border border-zinc-300 bg-white">
                    <span className="shrink-0 border-r border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-400">
                      instagram.com/
                    </span>
                    <input
                      className="flex-1 bg-white px-3 py-2 text-base text-zinc-900 outline-none"
                      defaultValue={parsedSocialLinks.instagram ?? ""}
                      name="social_instagram"
                      placeholder="yourhandle"
                      type="text"
                    />
                  </div>
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800">
                  Facebook
                  <div className="flex items-center overflow-hidden rounded-lg border border-zinc-300 bg-white">
                    <span className="shrink-0 border-r border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-400">
                      facebook.com/
                    </span>
                    <input
                      className="flex-1 bg-white px-3 py-2 text-base text-zinc-900 outline-none"
                      defaultValue={parsedSocialLinks.facebook ?? ""}
                      name="social_facebook"
                      placeholder="yourpage"
                      type="text"
                    />
                  </div>
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800">
                  TikTok
                  <div className="flex items-center overflow-hidden rounded-lg border border-zinc-300 bg-white">
                    <span className="shrink-0 border-r border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-400">
                      tiktok.com/@
                    </span>
                    <input
                      className="flex-1 bg-white px-3 py-2 text-base text-zinc-900 outline-none"
                      defaultValue={parsedSocialLinks.tiktok ?? ""}
                      name="social_tiktok"
                      placeholder="yourhandle"
                      type="text"
                    />
                  </div>
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800">
                  YouTube
                  <div className="flex items-center overflow-hidden rounded-lg border border-zinc-300 bg-white">
                    <span className="shrink-0 border-r border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-400">
                      youtube.com/@
                    </span>
                    <input
                      className="flex-1 bg-white px-3 py-2 text-base text-zinc-900 outline-none"
                      defaultValue={parsedSocialLinks.youtube ?? ""}
                      name="social_youtube"
                      placeholder="yourchannel"
                      type="text"
                    />
                  </div>
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800">
                  X
                  <div className="flex items-center overflow-hidden rounded-lg border border-zinc-300 bg-white">
                    <span className="shrink-0 border-r border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-400">
                      x.com/
                    </span>
                    <input
                      className="flex-1 bg-white px-3 py-2 text-base text-zinc-900 outline-none"
                      defaultValue={parsedSocialLinks.x ?? ""}
                      name="social_x"
                      placeholder="yourhandle"
                      type="text"
                    />
                  </div>
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800">
                  LinkedIn
                  <div className="flex items-center overflow-hidden rounded-lg border border-zinc-300 bg-white">
                    <span className="shrink-0 border-r border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-400">
                      linkedin.com/in/
                    </span>
                    <input
                      className="flex-1 bg-white px-3 py-2 text-base text-zinc-900 outline-none"
                      defaultValue={parsedSocialLinks.linkedin ?? ""}
                      name="social_linkedin"
                      placeholder="yourprofile"
                      type="text"
                    />
                  </div>
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800">
                  WhatsApp
                  <div className="flex items-center overflow-hidden rounded-lg border border-zinc-300 bg-white">
                    <span className="shrink-0 border-r border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-400">
                      +1 (868)
                    </span>
                    <input
                      className="flex-1 bg-white px-3 py-2 text-base text-zinc-900 outline-none"
                      defaultValue={parsedSocialLinks.whatsapp ?? ""}
                      name="social_whatsapp"
                      placeholder="7001234 — business number"
                      type="text"
                    />
                  </div>
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800">
                  Website
                  <div className="flex items-center overflow-hidden rounded-lg border border-zinc-300 bg-white">
                    <span className="shrink-0 border-r border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-400">
                      https://
                    </span>
                    <input
                      className="flex-1 bg-white px-3 py-2 text-base text-zinc-900 outline-none"
                      defaultValue={parsedSocialLinks.website ?? ""}
                      name="social_website"
                      placeholder="yourwebsite.com"
                      type="text"
                    />
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </form>

      <GalleryUploadWrapper images={store.images} slotsAvailable={10 - store.images.length} />

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="submit"
          form="vendor-store-edit-form"
          className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--scarlet)" }}
        >
          Save changes
        </button>
        <Link
          className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
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
