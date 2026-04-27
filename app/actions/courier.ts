"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSession } from "@/lib/auth/session";

export type CourierOnboardingFormState = { error?: string };

export type CourierOnboardingBootstrap = {
  id: string;
  region: string | null;
  phone: string | null;
  vehicleType: string | null;
  courierBio: string | null;
  courierOnboardingStep: number;
};

/** Loads signed-in courier fields for the onboarding client page (no extra routes). */
export async function readCourierOnboardingBootstrap(): Promise<CourierOnboardingBootstrap | null> {
  const session = await getSession();
  if (!session?.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      role: true,
      region: true,
      phone: true,
      vehicleType: true,
      courierBio: true,
      courierOnboardingStep: true,
    },
  });
  if (!user || user.role !== "COURIER") return null;
  return {
    id: user.id,
    region: user.region,
    phone: user.phone,
    vehicleType: user.vehicleType,
    courierBio: user.courierBio,
    courierOnboardingStep: user.courierOnboardingStep,
  };
}

function parseStep(raw: FormDataEntryValue | null): number {
  const n = Number(String(raw ?? ""));
  return n === 1 || n === 2 ? n : 0;
}

function isValidCourierPhone(phone: string): boolean {
  const t = phone.trim();
  if (!t) return false;
  if (!/^\+?[\d\s\-]+$/.test(t)) return false;
  return /\d/.test(t);
}

/**
 * Persists courier onboarding for the signed-in user (userId in form must match session).
 * Step 1: region and vehicleType. Step 2: phone and courierBio.
 */
export async function saveCourierOnboardingStep(
  _prev: CourierOnboardingFormState,
  formData: FormData,
): Promise<CourierOnboardingFormState> {
  const step = parseStep(formData.get("step"));
  const userId = String(formData.get("userId") ?? "").trim();

  const user = await getCurrentUser();
  if (!user || user.id !== userId || user.role !== "COURIER") {
    redirect("/login");
  }

  if (step === 1) {
    const region = String(formData.get("region") ?? "").trim();
    if (!region) {
      return { error: "Please choose an operating region." };
    }
    const vehicleType = String(formData.get("vehicleType") ?? "").trim() || null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        region,
        vehicleType,
        courierOnboardingStep: 1,
      },
    });

    redirect("/dashboard/courier/onboarding?step=2");
  }

  if (step === 2) {
    if (user.courierOnboardingStep < 1) {
      redirect("/dashboard/courier/onboarding?step=1");
    }

    const phone = String(formData.get("phone") ?? "").trim();
    if (!phone || !isValidCourierPhone(phone)) {
      return { error: "Please enter a valid phone number" };
    }
    const courierBio = String(formData.get("courierBio") ?? "").trim() || null;

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          phone,
          courierBio,
          courierOnboardingStep: 2,
        },
      });
    } catch {
      return { error: "That phone number is already registered to another account." };
    }

    redirect("/dashboard/courier");
  }

  redirect("/dashboard/courier/onboarding?step=1");
}
