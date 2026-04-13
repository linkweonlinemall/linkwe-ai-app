"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";
import { saveKycDocumentUpload } from "@/lib/onboarding/save-kyc-upload";
import { normalizeStoreSlug, validateStoreSlug } from "@/lib/store/slug";
import { logPrismaError } from "@/lib/log-prisma-error";

export type BusinessOnboardingState = { error?: string };

function requireVendor(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> | null): string | null {
  if (!user) return "You must be signed in.";
  if (user.role !== "VENDOR") return "This onboarding is for business accounts.";
  return null;
}

export async function saveBusinessOnboardingStep1(
  _prev: BusinessOnboardingState,
  formData: FormData,
): Promise<BusinessOnboardingState> {
  const user = await getCurrentUser();
  const gate = requireVendor(user);
  if (gate) return { error: gate };

  const fullName = String(formData.get("fullName") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();

  if (!fullName) return { error: "Full name is required." };
  if (fullName.length > 120) return { error: "Full name is too long." };
  if (!region) return { error: "Select your region." };

  await prisma.user.update({
    where: { id: user!.id },
    data: {
      fullName,
      region,
      phone: phoneRaw.length > 0 ? phoneRaw : null,
    },
  });

  redirect("/onboarding/business/step-2");
}

export async function saveBusinessOnboardingStep2(
  _prev: BusinessOnboardingState,
  formData: FormData,
): Promise<BusinessOnboardingState> {
  const user = await getCurrentUser();
  const gate = requireVendor(user);
  if (gate) return { error: gate };

  const file = formData.get("document");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Upload a photo or PDF of your ID." };
  }

  const saved = await saveKycDocumentUpload(file);
  if (!saved.ok) return { error: saved.error };

  await prisma.user.update({
    where: { id: user!.id },
    data: {
      idDocumentUrl: saved.publicPath,
      idVerificationStatus: "PENDING",
    },
  });

  redirect("/onboarding/business/step-3");
}

function validateStoreName(name: string): string | null {
  const t = name.trim();
  if (!t) return "Store name is required.";
  if (t.length > 120) return "Store name is too long.";
  return null;
}

function validateTagline(text: string): string | null {
  const t = text.trim();
  if (!t) return "Tagline is required.";
  if (t.length > 200) return "Tagline is too long.";
  return null;
}

export async function saveBusinessOnboardingStep3(
  _prev: BusinessOnboardingState,
  formData: FormData,
): Promise<BusinessOnboardingState> {
  const user = await getCurrentUser();
  const gate = requireVendor(user);
  if (gate) return { error: gate };

  const name = String(formData.get("name") ?? "");
  const slugRaw = String(formData.get("slug") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "");

  const nameErr = validateStoreName(name);
  if (nameErr) return { error: nameErr };

  const slugErr = validateStoreSlug(slugRaw);
  if (slugErr) return { error: slugErr };
  const slug = normalizeStoreSlug(slugRaw);

  if (!categoryId) return { error: "Select a store category." };
  if (!region) return { error: "Select your store region." };

  const tagErr = validateTagline(tagline);
  if (tagErr) return { error: tagErr };

  const logoEntry = formData.get("logo");
  let logoUrl: string | null = null;
  if (logoEntry instanceof File && logoEntry.size > 0) {
    const logoSaved = await saveKycDocumentUpload(logoEntry);
    if (!logoSaved.ok) return { error: logoSaved.error };
    logoUrl = logoSaved.publicPath;
  }

  const existing = await prisma.store.findFirst({
    where: { ownerId: user!.id },
    select: { id: true, logoUrl: true },
  });
  const slugConflict = await prisma.store.findFirst({
    where: existing ? { slug, NOT: { id: existing.id } } : { slug },
    select: { id: true },
  });
  if (slugConflict) {
    return { error: "That store slug is already taken. Pick another." };
  }

  try {
    if (existing) {
      await prisma.store.update({
        where: { id: existing.id },
        data: {
          name: name.trim(),
          slug,
          categoryId,
          region,
          tagline: tagline.trim(),
          logoUrl: logoUrl ?? existing?.logoUrl ?? null,
          onboardingStep: 3,
          status: "DRAFT",
        },
      });
    } else {
      await prisma.store.create({
        data: {
          ownerId: user!.id,
          name: name.trim(),
          slug,
          categoryId,
          region,
          tagline: tagline.trim(),
          logoUrl,
          onboardingStep: 3,
          status: "DRAFT",
        },
      });
    }
  } catch (error) {
    logPrismaError("BUSINESS ONBOARDING STEP 3:", error);
    const message = error instanceof Error ? error.message : "Could not save your store.";
    return { error: message };
  }

  redirect("/dashboard/vendor");
}
