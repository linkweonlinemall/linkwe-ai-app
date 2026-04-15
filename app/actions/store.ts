"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSession } from "@/lib/auth/session";
import { saveKycDocumentUpload } from "@/lib/onboarding/save-kyc-upload";
import type { Prisma } from "@prisma/client";
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
    const savedCover = await saveKycDocumentUpload(coverPhotoEntry);
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

  editRedirect("success=1");
}

export async function addStoreImage(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") {
    redirect("/");
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true, slug: true },
  });
  if (!store) {
    redirect("/dashboard/vendor");
  }

  const files = (formData.getAll("galleryImage") as File[]).filter(
    (f) => f instanceof File && f.size > 0,
  );

  if (files.length === 0) {
    redirect("/dashboard/vendor/store/edit?error=no_file");
  }

  const imageCount = await prisma.storeImage.count({
    where: { storeId: store.id },
  });

  const slotsAvailable = 10 - imageCount;
  if (slotsAvailable <= 0) {
    redirect("/dashboard/vendor/store/edit?error=gallery_full");
  }

  const filesToUpload = files.slice(0, slotsAvailable);

  const lastImage = await prisma.storeImage.findFirst({
    where: { storeId: store.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  let nextPosition = (lastImage?.position ?? 0) + 1;

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

  redirect("/dashboard/vendor/store/edit?success=gallery_updated");
}

export async function removeStoreImage(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") {
    redirect("/");
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
    editRedirect("error=unauthorized");
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

  editRedirect("success=gallery_updated");
}
