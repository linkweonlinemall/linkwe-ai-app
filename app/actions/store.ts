"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSession } from "@/lib/auth/session";
import { saveKycDocumentUpload } from "@/lib/onboarding/save-kyc-upload";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { saveGalleryUpload } from "@/lib/uploads/save-gallery-upload";
import { isValidRegion, normalizeRegion } from "@/lib/regions/tt-regions";
import { validateStoreSlug } from "@/lib/store/slug";
import { normalizeOpeningHoursForDb } from "@/lib/store/opening-hours-utils";
import { parseCheckoutFields } from "@/lib/checkout/custom-fields";

type TimeSlot = { from: string; to: string };
type DaySchedule = { closed: boolean; allDay: boolean; slots: TimeSlot[] };
type WeekSchedule = Record<string, DaySchedule>;

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

const EDIT_PATH = "/dashboard/vendor/store/edit";

function sanitizeSlug(raw: string): string {
  let s = raw.trim().toLowerCase().replace(/\s+/g, "-");
  s = s.replace(/[^a-z0-9-]/g, "");
  s = s.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return s;
}

function editRedirect(query: string): never {
  redirect(`${EDIT_PATH}?${query}`);
}

class StoreProfileError extends Error {}
const PROFILE_ERRORS:Record<string,string>={name_required:"Enter your store name.",slug_required:"Enter a store web address.",slug_invalid:"Use 3–64 lowercase letters, numbers and single hyphens for your web address.",slug_taken:"That store web address is taken. Choose another.",region_required:"Choose your operating region.",region_invalid:"Choose a valid operating region.",category_required:"Choose your store category.",upload_failed:"The image could not be uploaded. Check its size and try again.",profile_too_long:"Keep the name within 120 characters, tagline within 200, description within 1,000 and policies within 2,000."};
PROFILE_ERRORS.hours_invalid = "Each open day needs valid opening and closing times, with closing after opening and no overlapping time slots.";
export async function updateStore(formData:FormData):Promise<void>{try{await applyStoreUpdates(formData);}catch(error){if(error instanceof StoreProfileError)editRedirect(`error=${error.message}`);throw error;}}
export async function saveStoreProfile(_previous:{error?:string},formData:FormData):Promise<{error?:string}>{try{await applyStoreUpdates(formData);return {};}catch(error){if(error instanceof StoreProfileError)return {error:PROFILE_ERRORS[error.message]??"Please check your store details."};throw error;}}

/**
 * Updates the signed-in vendor's store from FormData (expects hidden `storeId`).
 * Uses redirects with query params so a Server Component form can show feedback without a client boundary.
 */
async function applyStoreUpdates(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") {
    redirect("/");
  }

  const storeId = String(formData.get("storeId") ?? "").trim();
  if (!storeId) {
    redirect("/dashboard/vendor");
  }

  const existing = await prisma.store.findFirst({
    where: { id: storeId, ownerId: user.id },
    select: { id: true, slug: true, logoUrl: true },
  });

  if (!existing) {
    redirect("/dashboard/vendor");
  }

  const oldSlug = existing.slug;
  let logoUrl: string | null = existing.logoUrl;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new StoreProfileError("name_required");
  }

  const slugRaw = String(formData.get("slug") ?? "");
  const slug = sanitizeSlug(slugRaw);
  if (!slug) {
    throw new StoreProfileError("slug_required");
  }

  const slugValidation = validateStoreSlug(slug);
  if (slugValidation) {
    throw new StoreProfileError("slug_invalid");
  }

  const tagline = String(formData.get("tagline") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const region = String(formData.get("region") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();

  if(name.length>120 || (tagline?.length??0)>200 || (description?.length??0)>1000 || String(formData.get("policies")??"").length>2000) throw new StoreProfileError("profile_too_long");

  const logoEntry = formData.get("logo");
  if (logoEntry instanceof File && logoEntry.size > 0) {
    const saved = await saveKycDocumentUpload(logoEntry);
    if (!saved.ok) {
      throw new StoreProfileError("upload_failed");
    }
    logoUrl = saved.publicPath;
  }

  let newCoverPhotoUrl: string | undefined;
  const coverPhotoEntry = formData.get("coverPhoto");
  if (coverPhotoEntry instanceof File && coverPhotoEntry.size > 0) {
    const savedCover = await saveGalleryUpload(coverPhotoEntry);
    if (!savedCover.ok) {
      throw new StoreProfileError("upload_failed");
    }
    newCoverPhotoUrl = savedCover.publicPath;
  }

  if (!region) {
    throw new StoreProfileError("region_required");
  }
  const normalizedRegion = normalizeRegion(region);
  if (!isValidRegion(normalizedRegion)) {
    throw new StoreProfileError("region_invalid");
  }

  if (!categoryId) {
    throw new StoreProfileError("category_required");
  }

  const slugOwner = await prisma.store.findFirst({
    where: { slug, NOT: { id: storeId } },
    select: { id: true },
  });
  if (slugOwner) {
    throw new StoreProfileError("slug_taken");
  }

  const hasHours = formData.get("hasHours") === "1";

  let parsedOpeningHours: WeekSchedule | undefined;
  if (hasHours) {
    const openingHours: WeekSchedule = {};
    for (const day of DAYS) {
      const closed = formData.get(`hours_${day}_closed`) === "on";
      const allDay = formData.get(`hours_${day}_allDay`) === "on";
      const slotCountRaw = parseInt(String(formData.get(`hours_${day}_slotCount`) ?? "1"), 10);
      const slotCount = Math.min(Math.max(Number.isFinite(slotCountRaw) ? slotCountRaw : 1, 1), 3);
      const slots: TimeSlot[] = [];
      if (!closed && !allDay) {
        for (let i = 0; i < slotCount; i++) {
          const from = String(formData.get(`hours_${day}_from_${i}`) ?? "").trim();
          const to = String(formData.get(`hours_${day}_to_${i}`) ?? "").trim();
          if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(from) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(to) || from >= to) throw new StoreProfileError("hours_invalid");
          slots.push({ from, to });
        }
        slots.sort((a, b) => a.from.localeCompare(b.from));
        if (slots.some((slot, index) => index > 0 && slot.from < slots[index - 1].to)) throw new StoreProfileError("hours_invalid");
      }
      openingHours[day] = { closed, allDay, slots };
    }
    parsedOpeningHours = normalizeOpeningHoursForDb(openingHours) ?? undefined;
  }

  const tagsRaw = String(formData.get("tags") ?? "").trim();

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const amenities = formData.getAll("amenities").map(String);

  const policies = String(formData.get("policies") ?? "").trim() || null;

  const locationAddress = String(formData.get("locationAddress") ?? "").trim() || null;
  const locationLat = formData.get("locationLat") ? parseFloat(String(formData.get("locationLat"))) : null;
  const locationLng = formData.get("locationLng") ? parseFloat(String(formData.get("locationLng"))) : null;
  const safeLat = locationLat !== null && Number.isFinite(locationLat) ? locationLat : null;
  const safeLng = locationLng !== null && Number.isFinite(locationLng) ? locationLng : null;

  const socialLinks: Record<string, string> = {};
  const socialPlatforms = ["instagram", "facebook", "tiktok", "youtube", "x", "linkedin", "whatsapp", "website"];
  for (const platform of socialPlatforms) {
    const val = String(formData.get(`social_${platform}`) ?? "").trim();
    if (val) socialLinks[platform] = val;
  }

  let checkoutFields: ReturnType<typeof parseCheckoutFields> = [];
  try {
    checkoutFields = parseCheckoutFields(JSON.parse(String(formData.get("checkoutFields") ?? "[]")));
  } catch {
    checkoutFields = [];
  }

  const updateData: Prisma.StoreUpdateInput = {
    name,
    slug,
    tagline,
    description,
    region: normalizedRegion,
    categoryId,
    logoUrl,
    tags,
    amenities,
    policies,
    address: locationAddress,
    latitude: safeLat,
    longitude: safeLng,
    socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : Prisma.DbNull,
    ...(formData.has("checkoutFields") ? {checkoutFields: checkoutFields.length > 0 ? checkoutFields : Prisma.DbNull} : {}),
  };
  if (newCoverPhotoUrl !== undefined) {
    updateData.coverPhotoUrl = newCoverPhotoUrl;
  }
  if (parsedOpeningHours !== undefined) {
    updateData.openingHours = parsedOpeningHours;
  }

  try {
    await prisma.store.update({
      where: { id: storeId },
      data: updateData,
    });
  } catch (error) {
    // The lookup above gives immediate feedback; the database constraint closes
    // the small race where two stores try to claim the same slug together.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new StoreProfileError("slug_taken");
    }
    throw error;
  }

  revalidatePath("/dashboard/vendor");
  revalidatePath(EDIT_PATH);
  revalidatePath(`/store/${oldSlug}`);
  revalidatePath(`/store/${slug}`);

  redirect(`${EDIT_PATH}?success=1`);
}

export async function addStoreImage(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") {
    redirect("/dashboard/vendor");
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true, slug: true },
  });
  if (!store) {
    redirect("/dashboard/vendor");
  }

  const galleryFiles = [
    ...(formData.getAll("galleryImages") as File[]),
    ...(formData.getAll("galleryImage") as File[]),
  ].filter((f): f is File => f instanceof File && f.size > 0);

  if (galleryFiles.length === 0) {
    redirect("/dashboard/vendor");
  }

  const files = galleryFiles;

  const imageCount = await prisma.storeImage.count({
    where: { storeId: store.id },
  });

  const slotsAvailable = 10 - imageCount;
  if (slotsAvailable <= 0) {
    redirect("/dashboard/vendor");
  }

  const filesToUpload = files.slice(0, slotsAvailable);

  const lastImage = await prisma.storeImage.findFirst({
    where: { storeId: store.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  let nextPosition = (lastImage?.position ?? 0) + 1;

  try {
    for (const file of filesToUpload) {
      const saved = await saveGalleryUpload(file);
      if (!saved.ok) {
        console.error("Gallery upload failed:", saved.error);
        continue;
      }
      await prisma.storeImage.create({
        data: {
          storeId: store.id,
          url: saved.publicPath,
          position: nextPosition,
        },
      });
      nextPosition += 1;
    }
  } catch {
    redirect("/dashboard/vendor");
  }

  redirect("/dashboard/vendor");
}

export async function removeStoreImage(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") {
    redirect("/dashboard/vendor");
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true, slug: true },
  });
  if (!store) {
    redirect("/dashboard/vendor");
  }

  const imageId = String(formData.get("imageId") ?? "").trim();
  if (!imageId) {
    redirect("/dashboard/vendor");
  }

  const image = await prisma.storeImage.findUnique({
    where: { id: imageId },
    select: { id: true, storeId: true },
  });
  if (!image || image.storeId !== store.id) {
    editRedirect("error=unauthorized");
  }

  await prisma.storeImage.delete({
    where: { id: imageId },
  });

  revalidatePath(EDIT_PATH);
  revalidatePath(`/store/${store.slug}`);
  revalidatePath("/dashboard/vendor");

  redirect("/dashboard/vendor");
}

export async function addStoreImageClient(
  formData: FormData
): Promise<{
  ok: boolean;
  error?: string;
  images?: { id: string; url: string; position: number }[];
}> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { ok: false, error: "unauthorized" };

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true, slug: true },
  });
  if (!store) return { ok: false, error: "no_store" };

  const storeId = store.id;
  const slotsAvailable = 10 - (await prisma.storeImage.count({ where: { storeId } }));
  if (slotsAvailable <= 0) return { ok: false, error: "gallery_full" };

  const galleryFiles = [
    ...(formData.getAll("galleryImages") as File[]),
    ...(formData.getAll("galleryImage") as File[]),
  ].filter((f): f is File => f instanceof File && f.size > 0);

  if (galleryFiles.length === 0) return { ok: false, error: "no_file" };

  const filesToUpload = galleryFiles.slice(0, slotsAvailable);
  const lastImage = await prisma.storeImage.findFirst({
    where: { storeId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  let nextPosition = (lastImage?.position ?? 0) + 1;

  for (const file of filesToUpload) {
    const saved = await saveGalleryUpload(file);
    if (saved.ok) {
      await prisma.storeImage.create({
        data: { storeId, url: saved.publicPath, position: nextPosition },
      });
      nextPosition += 1;
    }
  }

  const updatedImages = await prisma.storeImage.findMany({
    where: { storeId: store.id },
    select: { id: true, url: true, position: true },
    orderBy: { position: "asc" },
  });
  return { ok: true, images: updatedImages };
}

export async function removeStoreImageClient(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { ok: false, error: "unauthorized" };

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) return { ok: false, error: "no_store" };

  const imageId = String(formData.get("imageId") ?? "").trim();
  if (!imageId) return { ok: false, error: "no_image_id" };

  const image = await prisma.storeImage.findUnique({ where: { id: imageId } });
  if (!image || image.storeId !== store.id) return { ok: false, error: "unauthorized" };

  await prisma.storeImage.delete({ where: { id: imageId } });
  return { ok: true };
}

export async function reorderStoreGallery(
  imageIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") {
    return { ok: false, error: "Unauthorized" };
  }
  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) return { ok: false, error: "No store found" };

  const owned = await prisma.storeImage.findMany({
    where: { storeId: store.id, id: { in: imageIds } },
    select: { id: true },
  });
  if (owned.length !== imageIds.length) {
    return { ok: false, error: "Invalid image list" };
  }

  await Promise.all(
    imageIds.map((id, index) =>
      prisma.storeImage.update({
        where: { id },
        data: { position: index },
      })
    )
  );
  return { ok: true };
}

export async function toggleFollowStore(
  storeId: string,
): Promise<
  { following: boolean; followerCount: number } | { error: string }
> {
  const trimmed = storeId?.trim();
  if (!trimmed) {
    return { error: "Store is required" };
  }

  const session = await getSession();
  if (!session) {
    return { error: "Sign in to follow stores" };
  }

  const store = await prisma.store.findUnique({
    where: { id: trimmed },
    select: { id: true, slug: true },
  });
  if (!store) {
    return { error: "Store not found" };
  }

  try {
    const existing = await prisma.savedStore.findUnique({
      where: { userId_storeId: { userId: session.userId, storeId: trimmed } },
    });

    if (existing) {
      await prisma.savedStore.delete({ where: { id: existing.id } });
    } else {
      await prisma.savedStore.create({
        data: { userId: session.userId, storeId: trimmed },
      });
    }

    const followerCount = await prisma.savedStore.count({
      where: { storeId: trimmed },
    });

    revalidatePath(`/store/${store.slug}`);
    revalidatePath("/saved-stores");
    revalidatePath("/timeline");

    return { following: !existing, followerCount };
  } catch {
    return { error: "Could not update follow status" };
  }
}
