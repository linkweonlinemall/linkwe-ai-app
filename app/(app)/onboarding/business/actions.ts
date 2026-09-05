"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { saveKycDocumentUpload } from "@/lib/onboarding/save-kyc-upload";
import {
  clearIntendedPlanCookie,
  getIntendedPlanCookie,
  type IntendedPlan,
  setIntendedPlanCookie,
  setPlanPickerConfirmedCookie,
} from "@/lib/onboarding/intended-plan";
import { normalizeTTPhone } from "@/lib/phone";
import { normalizeStoreSlug, validateStoreSlug } from "@/lib/store/slug";
import { logPrismaError } from "@/lib/log-prisma-error";
import { isValidRegion, normalizeRegion } from "@/lib/regions/tt-regions";
import { startSubscriptionCheckout } from "@/app/actions/vendor";

export type BusinessOnboardingState = { error?: string };

function requireVendor(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> | null): string | null {
  if (!user) return "You must be signed in.";
  if (user.role !== "VENDOR") return "This onboarding is for business accounts.";
  return null;
}

function parsePlanChoice(raw: FormDataEntryValue | null): IntendedPlan | null {
  const v = String(raw ?? "").trim();
  if (v === "STARTER" || v === "GROWTH" || v === "PRO") return v;
  return null;
}

export async function confirmBusinessPlanChoice(
  _prev: BusinessOnboardingState,
  formData: FormData,
): Promise<BusinessOnboardingState> {
  const user = await getCurrentUser();
  const gate = requireVendor(user);
  if (gate) return { error: gate };

  const plan = parsePlanChoice(formData.get("plan"));
  if (!plan) return { error: "Select a plan to continue." };

  await setIntendedPlanCookie(plan);
  await setPlanPickerConfirmedCookie();

  redirect("/onboarding/business/step-1");
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
  const normalizedRegion = normalizeRegion(region);
  if (!isValidRegion(normalizedRegion)) {
    return { error: "Please select a valid region." };
  }

  let phone: string | null = null;
  if (phoneRaw.length > 0) {
    const parsed = normalizeTTPhone(phoneRaw);
    if (!parsed.ok) return { error: parsed.error };
    phone = parsed.normalized;
  }
  if (phone) {
    const phoneTaken = await prisma.user.findFirst({
      where: { phone, NOT: { id: user!.id } },
      select: { id: true },
    });
    if (phoneTaken) {
      return { error: "That phone number is already in use." };
    }
  }

  try {
    await prisma.user.update({
      where: { id: user!.id },
      data: {
        fullName,
        region: normalizedRegion,
        phone,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = error.meta?.target;
      const targets = Array.isArray(target) ? target.map(String) : target != null ? [String(target)] : [];
      if (targets.some((t) => t.toLowerCase().includes("phone"))) {
        return { error: "That phone number is already in use." };
      }
    }
    throw error;
  }

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
  const selfie = formData.get("selfieWithId");
  const hasDocument = file instanceof File && file.size > 0;
  const hasSelfie = selfie instanceof File && selfie.size > 0;

  if (!hasDocument && !hasSelfie) {
    redirect("/onboarding/business/step-3");
  }
  if (!hasDocument || !hasSelfie) {
    return { error: "Upload both files together, or leave both blank and verify your store later." };
  }
  if (!selfie.type.startsWith("image/")) {
    return { error: "The selfie must be a JPEG, PNG, or WebP image." };
  }

  const saved = await saveKycDocumentUpload(file);
  if (!saved.ok) return { error: saved.error };
  const savedSelfie = await saveKycDocumentUpload(selfie);
  if (!savedSelfie.ok) return { error: savedSelfie.error };

  await prisma.user.update({
    where: { id: user!.id },
    data: {
      idDocumentUrl: saved.publicPath,
      selfieWithIdUrl: savedSelfie.publicPath,
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
  const normalizedRegion = normalizeRegion(region);
  if (!isValidRegion(normalizedRegion)) {
    return { error: "Please select a valid store region." };
  }

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
          region: normalizedRegion,
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
          region: normalizedRegion,
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

  const intendedPlan = await getIntendedPlanCookie();
  await clearIntendedPlanCookie();

  if (intendedPlan === "GROWTH" || intendedPlan === "PRO") {
    const checkout = await startSubscriptionCheckout(intendedPlan);
    if (checkout.ok) {
      redirect(checkout.checkoutUrl);
    }
    redirect("/dashboard/vendor?upgrade=failed");
  }

  redirect("/dashboard/vendor");
}
