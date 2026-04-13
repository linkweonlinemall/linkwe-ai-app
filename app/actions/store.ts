"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { saveKycDocumentUpload } from "@/lib/onboarding/save-kyc-upload";
import { prisma } from "@/lib/prisma";
import { validateStoreSlug } from "@/lib/store/slug";

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

  await prisma.store.update({
    where: { id: storeId },
    data: {
      name,
      slug,
      tagline,
      region,
      categoryId,
      logoUrl,
    },
  });

  revalidatePath("/dashboard/vendor");
  revalidatePath(EDIT_PATH);
  revalidatePath(`/store/${oldSlug}`);
  revalidatePath(`/store/${slug}`);

  editRedirect("success=1");
}
