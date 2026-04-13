"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";
import { validateStoreSlug as validateListingSlug, normalizeStoreSlug as normalizeListingSlug } from "@/lib/store/slug";
import { validateListingShortDescription, validateListingTitle } from "@/lib/listing/form-validators";
import { deleteManagedLocalListingImage, saveLocalListingImageUpload } from "@/lib/listing/local-listing-upload";
import { parsePriceToMinor } from "@/lib/listing/price";
import { logPrismaError } from "@/lib/log-prisma-error";

export type ListingFormState = { error?: string };

export async function createListingAction(_prev: ListingFormState, formData: FormData): Promise<ListingFormState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") {
    return { error: "You must be signed in as a vendor." };
  }

  const store = await getStoreByOwnerId(user.id);
  if (!store) {
    redirect("/onboarding/business/step-3");
  }

  const title = String(formData.get("title") ?? "");
  const slugRaw = String(formData.get("slug") ?? "");
  const shortDescription = String(formData.get("shortDescription") ?? "");
  const priceRaw = String(formData.get("price") ?? "");
  const imageEntry = formData.get("image");
  const publish = formData.get("publish") === "on";

  const titleErr = validateListingTitle(title);
  if (titleErr) return { error: titleErr };

  const slugErr = validateListingSlug(slugRaw);
  if (slugErr) return { error: slugErr };
  const slug = normalizeListingSlug(slugRaw);

  const descErr = validateListingShortDescription(shortDescription);
  if (descErr) return { error: descErr };

  let imageUrl: string | null = null;
  let newUploadPath: string | null = null;
  if (imageEntry instanceof File && imageEntry.size > 0) {
    const saved = await saveLocalListingImageUpload(imageEntry);
    if (!saved.ok) return { error: saved.error };
    imageUrl = saved.publicPath;
    newUploadPath = saved.publicPath;
  }

  const parsedPrice = parsePriceToMinor(priceRaw);
  if (!parsedPrice.ok) return { error: parsedPrice.error };

  // TODO: restore duplicate slug check via prisma.listing.findUnique({ where: { slug } })
  // after listings.slug exists in the database (Supabase migration).

  try {
    await prisma.listing.create({
      data: {
        storeId: store.id,
        ownerId: user.id,
        title: title.trim(),
        slug,
        imageUrl,
        shortDescription: shortDescription.trim(),
        priceMinor: parsedPrice.minor,
        currency: "USD",
        status: publish ? "PUBLISHED" : "DRAFT",
        publishedAt: publish ? new Date() : null,
      },
    });
  } catch (error) {
    if (newUploadPath) {
      await deleteManagedLocalListingImage(newUploadPath);
    }
    logPrismaError("CREATE LISTING ERROR:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "That slug is already in use." };
    }
    return { error: "Could not create listing. Try again." };
  }

  redirect("/dashboard/vendor");
}
