"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSession } from "@/lib/auth/session";
import { saveKycDocumentUpload } from "@/lib/onboarding/save-kyc-upload";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { saveGalleryUpload } from "@/lib/uploads/save-gallery-upload";
import { validateStoreSlug } from "@/lib/store/slug";

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

/**
 * Updates the signed-in vendor's store from FormData (expects hidden `storeId`).
 * Uses redirects with query params so a Server Component form can show feedback without a client boundary.
 */
export async function updateStore(formData: FormData): Promise<void> {
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
    editRedirect("error=name_required");
  }

  const slugRaw = String(formData.get("slug") ?? "");
  const slug = sanitizeSlug(slugRaw);
  if (!slug) {
    editRedirect("error=slug_required");
  }

  const slugValidation = validateStoreSlug(slug);
  if (slugValidation) {
    editRedirect("error=slug_invalid");
  }

  const tagline = String(formData.get("tagline") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const region = String(formData.get("region") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();

  const logoEntry = formData.get("logo");
  if (logoEntry instanceof File && logoEntry.size > 0) {
    const saved = await saveKycDocumentUpload(logoEntry);
    if (!saved.ok) {
      editRedirect("error=upload_failed");
    }
    logoUrl = saved.publicPath;
  }

  let newCoverPhotoUrl: string | undefined;
  const coverPhotoEntry = formData.get("coverPhoto");
  if (coverPhotoEntry instanceof File && coverPhotoEntry.size > 0) {
    const savedCover = await saveGalleryUpload(coverPhotoEntry);
    if (!savedCover.ok) {
      editRedirect("error=upload_failed");
    }
    newCoverPhotoUrl = savedCover.publicPath;
  }

  if (!region) {
    editRedirect("error=region_required");
  }

  if (!categoryId) {
    editRedirect("error=category_required");
  }

  const slugOwner = await prisma.store.findFirst({
    where: { slug, NOT: { id: storeId } },
    select: { id: true },
  });
  if (slugOwner) {
    editRedirect("error=slug_taken");
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
          if (from && to) {
            slots.push({ from, to });
          }
        }
      }
      openingHours[day] = { closed, allDay, slots };
    }
    parsedOpeningHours = openingHours;
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

  const updateData: Prisma.StoreUpdateInput = {
    name,
    slug,
    tagline,
    description,
    region,
    categoryId,
    logoUrl,
    tags,
    amenities,
    policies,
    address: locationAddress,
    latitude: safeLat,
    longitude: safeLng,
    socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : Prisma.DbNull,
  };
  if (newCoverPhotoUrl !== undefined) {
    updateData.coverPhotoUrl = newCoverPhotoUrl;
  }
  if (parsedOpeningHours !== undefined) {
    updateData.openingHours = parsedOpeningHours;
  }

  await prisma.store.update({
    where: { id: storeId },
    data: updateData,
  });

  revalidatePath("/dashboard/vendor");
  revalidatePath(EDIT_PATH);
  revalidatePath(`/store/${oldSlug}`);
  revalidatePath(`/store/${slug}`);

  redirect("/dashboard/vendor?success=store_saved");
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

export async function addStoreImageClient(formData: FormData): Promise<{ ok: boolean; error?: string }> {
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

  return { ok: true };
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
