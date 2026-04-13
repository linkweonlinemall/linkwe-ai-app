"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";
import { validateListingShortDescription, validateListingTitle } from "@/lib/listing/form-validators";
import {
  deleteManagedLocalListingImage,
  isManagedLocalListingImage,
  saveLocalListingImageUpload,
} from "@/lib/listing/local-listing-upload";
import { parsePriceToMinor } from "@/lib/listing/price";
import { validateStoreSlug as validateListingSlug, normalizeStoreSlug as normalizeListingSlug } from "@/lib/store/slug";
import { logPrismaError } from "@/lib/log-prisma-error";

export type EditListingFormState = { error?: string };

export async function updateListingAction(_prev: EditListingFormState, formData: FormData): Promise<EditListingFormState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") {
    return { error: "You must be signed in as a vendor." };
  }

  const store = await getStoreByOwnerId(user.id);
  if (!store) {
    redirect("/onboarding/business/step-3");
  }

  const listingId = String(formData.get("listingId") ?? "").trim();
  if (!listingId) {
    return { error: "Missing listing." };
  }

  const existing = await prisma.listing.findFirst({
    where: { id: listingId, storeId: store.id },
    select: { id: true, publishedAt: true, imageUrl: true },
  });
  if (!existing) {
    return { error: "Listing not found." };
  }

  const title = String(formData.get("title") ?? "");
  const slugRaw = String(formData.get("slug") ?? "");
  const shortDescription = String(formData.get("shortDescription") ?? "");
  const priceRaw = String(formData.get("price") ?? "");
  const statusRaw = String(formData.get("status") ?? "");
  const imageEntry = formData.get("image");
  const removeImage = formData.get("removeImage") === "on";

  const titleErr = validateListingTitle(title);
  if (titleErr) return { error: titleErr };

  const slugErr = validateListingSlug(slugRaw);
  if (slugErr) return { error: slugErr };
  const slug = normalizeListingSlug(slugRaw);

  const descErr = validateListingShortDescription(shortDescription);
  if (descErr) return { error: descErr };

  let nextImageUrl: string | null = existing.imageUrl;
  let managedFileToDelete: string | null = null;
  let newUploadPath: string | null = null;

  if (imageEntry instanceof File && imageEntry.size > 0) {
    const saved = await saveLocalListingImageUpload(imageEntry);
    if (!saved.ok) return { error: saved.error };
    nextImageUrl = saved.publicPath;
    newUploadPath = saved.publicPath;
    if (isManagedLocalListingImage(existing.imageUrl)) {
      managedFileToDelete = existing.imageUrl;
    }
  } else if (removeImage) {
    nextImageUrl = null;
    if (isManagedLocalListingImage(existing.imageUrl)) {
      managedFileToDelete = existing.imageUrl;
    }
  }

  const parsedPrice = parsePriceToMinor(priceRaw);
  if (!parsedPrice.ok) return { error: parsedPrice.error };

  if (statusRaw !== "DRAFT" && statusRaw !== "PUBLISHED") {
    return { error: "Status must be Draft or Published." };
  }
  const status = statusRaw as "DRAFT" | "PUBLISHED";

  const slugTaken = await prisma.listing.findFirst({
    where: { slug, NOT: { id: listingId } },
    select: { id: true },
  });
  if (slugTaken) {
    return { error: "That listing slug is already taken. Pick another." };
  }

  const publishedAt = status === "PUBLISHED" ? (existing.publishedAt ?? new Date()) : null;

  try {
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        title: title.trim(),
        slug,
        imageUrl: nextImageUrl,
        shortDescription: shortDescription.trim(),
        priceMinor: parsedPrice.minor,
        status,
        publishedAt,
      },
    });
  } catch (error) {
    if (newUploadPath) {
      await deleteManagedLocalListingImage(newUploadPath);
    }
    logPrismaError("UPDATE LISTING ERROR:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "That slug is already in use." };
    }
    return { error: "Could not update listing. Try again." };
  }

  if (managedFileToDelete) {
    await deleteManagedLocalListingImage(managedFileToDelete);
  }

  redirect("/dashboard/vendor");
}
