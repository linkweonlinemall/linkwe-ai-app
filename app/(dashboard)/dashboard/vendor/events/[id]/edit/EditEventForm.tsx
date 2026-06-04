"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  updateEvent,
  deleteEvent,
  uploadEventCoverImage,
  uploadEventGalleryImage,
} from "@/app/actions/events";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { TT_REGIONS } from "@/lib/regions/tt-regions";
import LineupEditor, { type Performer } from "@/components/events/LineupEditor";
import { TRINIDAD_TIMEZONE, ymdInTrinidad } from "@/lib/timezone/trinidad";

export const EVENT_CATEGORIES: { group: string; options: { value: string; label: string }[] }[] = [
  {
    group: "Fetes & Parties",
    options: [
      { value: "all_inclusive_fete", label: "All-inclusive fete" },
      { value: "cooler_fete", label: "Cooler fete" },
      { value: "breakfast_fete", label: "Breakfast fete" },
      { value: "jouvert", label: "J'Ouvert" },
      { value: "beach_party", label: "Beach party" },
      { value: "pool_party", label: "Pool party" },
      { value: "birthday_party", label: "Birthday party" },
      { value: "private_event", label: "Private event" },
    ],
  },
  {
    group: "Concerts & Music",
    options: [
      { value: "soca_carnival", label: "Soca/Carnival" },
      { value: "reggae_dancehall", label: "Reggae/Dancehall" },
      { value: "jazz", label: "Jazz" },
      { value: "gospel", label: "Gospel" },
      { value: "steelpan", label: "Steelpan" },
      { value: "live_band_night", label: "Live band night" },
      { value: "open_mic", label: "Open mic" },
    ],
  },
  {
    group: "Food & Drink",
    options: [
      { value: "food_fair", label: "Food fair" },
      { value: "rum_tasting", label: "Rum tasting" },
      { value: "food_festival", label: "Food festival" },
      { value: "pop_up_dining", label: "Pop-up dining" },
      { value: "cooking_class", label: "Cooking class" },
      { value: "wine_tasting", label: "Wine tasting" },
    ],
  },
  {
    group: "Cultural & Community",
    options: [
      { value: "carnival_mas_band_launch", label: "Carnival/Mas band launch" },
      { value: "cultural_festival", label: "Cultural festival" },
      { value: "art_exhibition", label: "Art exhibition" },
      { value: "fashion_show", label: "Fashion show" },
      { value: "heritage_event", label: "Heritage event" },
      { value: "religious_church_event", label: "Religious/church event" },
    ],
  },
  {
    group: "Sports & Fitness",
    options: [
      { value: "sports_tournament", label: "Sports match/tournament" },
      { value: "marathon", label: "Marathon" },
      { value: "fitness_event", label: "Fitness event" },
      { value: "water_sports", label: "Water sports" },
      { value: "cricket_football_match", label: "Cricket/football match" },
    ],
  },
  {
    group: "Business & Professional",
    options: [
      { value: "networking_event", label: "Networking event" },
      { value: "conference", label: "Conference" },
      { value: "workshop_training", label: "Workshop/training" },
      { value: "awards_ceremony", label: "Awards ceremony" },
      { value: "product_launch", label: "Product launch" },
    ],
  },
  {
    group: "Kids & Family",
    options: [
      { value: "childrens_party", label: "Children's party" },
      { value: "family_fun_day", label: "Family fun day" },
      { value: "school_event", label: "School event" },
      { value: "story_time_workshop", label: "Story time/workshop" },
    ],
  },
  {
    group: "Other",
    options: [
      { value: "fundraiser_charity", label: "Fundraiser/charity" },
      { value: "comedy_show", label: "Comedy show" },
      { value: "theatre_performance", label: "Theatre/performance" },
      { value: "market_fair", label: "Market/fair" },
    ],
  },
];

function Toggle({
  value,
  onChange,
  label,
  description,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-zinc-900">{label}</p>
        {description && <p className="text-xs text-zinc-500">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${value ? "bg-[#D4450A]" : "bg-zinc-200"}`}
      >
        <div
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </div>
  );
}

// Cloudinary can return { secure_url } or { url } objects depending on
// the upload path. This helper safely extracts the string URL from any shape.
function getImageUrl(img: unknown): string {
  if (typeof img === "string") return img;
  if (img && typeof img === "object") {
    if ("secure_url" in img && typeof (img as Record<string, unknown>).secure_url === "string")
      return (img as { secure_url: string }).secure_url;
    if ("url" in img && typeof (img as Record<string, unknown>).url === "string")
      return (img as { url: string }).url;
  }
  return "";
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return ymdInTrinidad(d);
}

function toTimeInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TRINIDAD_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

export type EventFormData = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  organiserName: string | null;
  startDate: string;
  endDate: string | null;
  eventType: string;
  isOnline: boolean;
  venueName: string | null;
  address: string | null;
  region: string | null;
  streamUrl: string | null;
  capacity: number | null;
  dressCode: string | null;
  ageRestriction: string | null;
  coverImage: string | null;
  galleryImages: string[];
  refundPolicyType: "FULL" | "PARTIAL" | "NONE";
  refundCutoffHours: number;
  registrationRequired: boolean;
  registrationDeadline: string | null;
  hasSeating: boolean;
  status: string;
  lineup: Performer[] | null;
};

export function EditEventForm({ event }: { event: EventFormData }) {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [eventType, setEventType] = useState<"SINGLE" | "MULTI">(
    event.eventType === "MULTI" ? "MULTI" : "SINGLE"
  );
  const [locationType, setLocationType] = useState<"IN_PERSON" | "ONLINE" | "HYBRID">(() => {
    if (event.isOnline && event.venueName) return "HYBRID";
    if (event.isOnline) return "ONLINE";
    return "IN_PERSON";
  });
  const [registrationRequired, setRegistrationRequired] = useState(event.registrationRequired);
  const [hasSeating, setHasSeating] = useState(event.hasSeating);
  const [description, setDescription] = useState(event.description ?? "");
  const [coverImage, setCoverImage] = useState<string | null>(event.coverImage ?? null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>(() => {
    const raw = event.galleryImages;
    if (!Array.isArray(raw)) return [];
    return (raw as unknown[]).map(getImageUrl).filter((u) => u.startsWith("http"));
  });
  const [galleryUploading, setGalleryUploading] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [lineup, setLineup] = useState<Performer[]>(() => {
    if (!event.lineup) return [];
    if (Array.isArray(event.lineup)) return event.lineup as Performer[];
    return [];
  });

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    setCoverError(null);
    const fd = new FormData();
    fd.append("image", file);
    const result = await uploadEventCoverImage(fd);
    if ("error" in result) setCoverError(result.error);
    else setCoverImage(result.url);
    setCoverUploading(false);
    e.target.value = "";
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setGalleryUploading(true);
    for (const file of files) {
      if (galleryImages.length >= 6) break;
      const fd = new FormData();
      fd.append("image", file);
      const result = await uploadEventGalleryImage(fd);
      if ("url" in result) {
        const urlStr = getImageUrl(result.url);
        if (urlStr) setGalleryImages((prev) => [...prev, urlStr].slice(0, 6));
      }
    }
    setGalleryUploading(false);
    e.target.value = "";
  }

  function handleSave() {
    startTransition(async () => {
      setError(null);
      setSuccess(false);
      const form = document.getElementById("edit-event-form") as HTMLFormElement | null;
      if (!form) return;
      const formData = new FormData(form);
      formData.set("eventType", eventType);
      formData.set("isOnline", (locationType === "ONLINE" || locationType === "HYBRID").toString());
      formData.set("registrationRequired", registrationRequired.toString());
      formData.set("hasSeating", hasSeating.toString());
      formData.set("description", description);
      formData.set("coverImage", coverImage ?? "");
      formData.set("galleryImages", JSON.stringify(galleryImages));
      formData.set("lineup", JSON.stringify(lineup));

      const result = await updateEvent(eventId, formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  function handleDelete() {
    if (
      !confirm(
        "Cancel or delete this event? If tickets have been sold it will be cancelled, otherwise deleted."
      )
    )
      return;
    startTransition(async () => {
      const result = await deleteEvent(eventId);
      if ("error" in result) {
        setError(result.error);
      } else {
        router.push("/dashboard/vendor/events");
      }
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
    <form id="edit-event-form" onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">

      {/* ── Section 1: Basic Details ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="mb-4 text-sm font-bold text-zinc-900">Basic details</p>
        <div className="flex flex-col gap-4">

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Event title <span className="text-[#D4450A]">*</span>
            </label>
            <input
              name="title"
              required
              defaultValue={event.title}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Category <span className="text-[#D4450A]">*</span>
            </label>
            <select
              name="category"
              required
              defaultValue={event.category ?? ""}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
            >
              <option value="">Select a category</option>
              {EVENT_CATEGORIES.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Description</label>
            <RichTextEditor
              name="description"
              placeholder="Tell people what to expect..."
              maxLength={3000}
              defaultValue={event.description ?? ""}
              onChange={(val) => setDescription(val)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Organiser name</label>
            <input
              name="organiserName"
              defaultValue={event.organiserName ?? ""}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Event type</label>
            <div className="flex gap-2">
              {(["SINGLE", "MULTI"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setEventType(type)}
                  className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition-all ${
                    eventType === type
                      ? "border-[#D4450A] bg-[#D4450A]/5 text-[#D4450A]"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                  }`}
                >
                  {type === "SINGLE" ? "Single Day" : "Multi-Day"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Start date <span className="text-[#D4450A]">*</span>
              </label>
              <input
                name="startDate"
                type="date"
                required
                defaultValue={toDateInputValue(event.startDate)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Start time <span className="text-[#D4450A]">*</span>
              </label>
              <input
                name="startTime"
                type="time"
                required
                defaultValue={toTimeInputValue(event.startDate)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {eventType === "MULTI" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">End date</label>
                <input
                  name="endDate"
                  type="date"
                  defaultValue={toDateInputValue(event.endDate)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">End time</label>
                <input
                  name="endTime"
                  type="time"
                  defaultValue={toTimeInputValue(event.endDate)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Age restriction</label>
              <input
                name="ageRestriction"
                defaultValue={event.ageRestriction ?? ""}
                placeholder="e.g. 18+ or All ages"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Dress code</label>
              <input
                name="dressCode"
                defaultValue={event.dressCode ?? ""}
                placeholder="e.g. Smart casual"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 1b: Entertainment & Lineup ── */}
      <LineupEditor value={lineup} onChange={setLineup} />

      {/* ── Section 2: Location ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="mb-3 text-sm font-bold text-zinc-900">Location</p>
        <div className="mb-4 flex gap-2">
          {(["IN_PERSON", "ONLINE", "HYBRID"] as const).map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setLocationType(loc)}
              className={`flex-1 rounded-xl border-2 py-2 text-xs font-semibold transition-all ${
                locationType === loc
                  ? "border-[#D4450A] bg-[#D4450A]/5 text-[#D4450A]"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
              }`}
            >
              {loc === "IN_PERSON" ? "In-person" : loc === "ONLINE" ? "Online" : "Hybrid"}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          {(locationType === "IN_PERSON" || locationType === "HYBRID") && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Venue name</label>
                <input
                  name="venueName"
                  defaultValue={event.venueName ?? ""}
                  placeholder="e.g. Queen's Park Savannah"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Address</label>
                <input
                  name="address"
                  defaultValue={event.address ?? ""}
                  placeholder="Street address"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Region</label>
                <select
                  name="region"
                  defaultValue={event.region ?? ""}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
                >
                  <option value="">Select region</option>
                  {TT_REGIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          {(locationType === "ONLINE" || locationType === "HYBRID") && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Stream URL</label>
              <input
                name="streamUrl"
                type="url"
                defaultValue={event.streamUrl ?? ""}
                placeholder="https://..."
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Section 3: Cover Image ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="mb-2 text-sm font-bold text-zinc-900">Cover image</p>
        {coverImage ? (
          <div className="relative mb-3 w-full max-w-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImage}
              alt="Cover"
              className="h-48 w-full rounded-xl border border-zinc-200 object-cover"
            />
            <button
              type="button"
              onClick={() => setCoverImage(null)}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white hover:bg-red-600"
            >
              ×
            </button>
          </div>
        ) : (
          <>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleCoverUpload}
            />
            <button
              type="button"
              disabled={coverUploading}
              onClick={() => coverInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
            >
              {coverUploading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                  Uploading...
                </>
              ) : (
                "Upload cover image"
              )}
            </button>
          </>
        )}
        {coverError && <p className="mt-2 text-xs text-red-600">{coverError}</p>}
      </div>

      {/* ── Section 4: Gallery ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="mb-2 text-sm font-bold text-zinc-900">Gallery</p>
        {galleryImages.length > 0 && (
          <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {galleryImages.map((url, i) => {
              const src = getImageUrl(url);
              return (
              <div key={`${src || i}-${i}`} className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Gallery image ${i + 1}`}
                  className="h-full w-full rounded-xl border border-zinc-200 object-cover"
                  onError={(e) => {
                    const el = e.currentTarget;
                    el.style.display = "none";
                    const parent = el.parentElement;
                    if (parent && !parent.querySelector(".img-error-fallback")) {
                      const fb = document.createElement("div");
                      fb.className =
                        "img-error-fallback flex h-full w-full items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-100 text-xs text-zinc-400";
                      fb.textContent = "Image unavailable";
                      parent.appendChild(fb);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    setGalleryImages((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
                >
                  ×
                </button>
              </div>
              );
            })}
          </div>
        )}
        {galleryImages.length < 6 && (
          <>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleGalleryUpload}
            />
            <button
              type="button"
              disabled={galleryUploading}
              onClick={() => galleryInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
            >
              {galleryUploading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                  Uploading...
                </>
              ) : (
                `Add photos (${galleryImages.length}/6)`
              )}
            </button>
          </>
        )}
      </div>

      {/* ── Section 5: Settings ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="mb-4 text-sm font-bold text-zinc-900">Settings</p>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Total capacity</label>
            <input
              name="capacity"
              type="number"
              min="1"
              defaultValue={event.capacity ?? ""}
              placeholder="Leave blank for unlimited"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Refund policy</label>
            <select
              name="refundPolicyType"
              defaultValue={event.refundPolicyType}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
            >
              <option value="FULL">Full refund</option>
              <option value="PARTIAL">Partial refund</option>
              <option value="NONE">No refunds</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Hours before event refunds close
            </label>
            <input
              name="refundCutoffHours"
              type="number"
              min="0"
              defaultValue={event.refundCutoffHours}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
            />
          </div>
          <Toggle
            value={registrationRequired}
            onChange={setRegistrationRequired}
            label="Registration required"
            description="Attendees must register before buying tickets"
          />
          {registrationRequired && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Registration deadline
              </label>
              <input
                name="registrationDeadline"
                type="date"
                defaultValue={toDateInputValue(event.registrationDeadline)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
              />
            </div>
          )}
          <Toggle
            value={hasSeating}
            onChange={setHasSeating}
            label="Has assigned seating"
            description="Venue has seat numbers or sections"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          Changes saved successfully.
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="flex-1 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "#D4450A" }}
        >
          {isPending ? "Saving..." : "Save changes"}
        </button>
        <Link
          href={`/dashboard/vendor/events/${eventId}/tickets`}
          className="flex-1 rounded-xl border border-zinc-200 py-3 text-center text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Manage tickets →
        </Link>
      </div>

      {/* ── Danger Zone ── */}
      <div className="rounded-2xl border border-red-100 bg-red-50/50 p-5 pb-8">
        <p className="mb-2 text-sm font-bold text-red-700">Danger zone</p>
        <p className="mb-4 text-xs text-red-600">
          {event.status === "PUBLISHED"
            ? "This event is published. Cancelling will hide it from customers."
            : "Delete this event permanently. This cannot be undone."}
        </p>
        <button
          type="button"
          disabled={isPending}
          onClick={handleDelete}
          className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          {event.status === "PUBLISHED" ? "Cancel event" : "Delete event"}
        </button>
      </div>
    </form>
    </div>
  );
}
