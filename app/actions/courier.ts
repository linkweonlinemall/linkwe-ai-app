"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

export type CourierOnboardingFormState = { error?: string };

export type CourierOnboardingBootstrap = {
  id: string;
  region: string | null;
  phone: string | null;
  courierOnboardingStep: number;
};

/** Loads signed-in courier fields for the onboarding client page (no extra routes). */
export async function readCourierOnboardingBootstrap(): Promise<CourierOnboardingBootstrap | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "COURIER") return null;
  return {
    id: user.id,
    region: user.region,
    phone: user.phone,
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
 * Step 1: region. Step 2: phone. Vehicle type and bio are not persisted (no User fields).
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

    await prisma.user.update({
      where: { id: user.id },
      data: {
        region,
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

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          phone,
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
