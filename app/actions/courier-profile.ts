"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { normalizeTTPhone } from "@/lib/phone";

export async function updateCourierProfile(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "COURIER") {
    return { ok: false, error: "Unauthorized" };
  }
  const vehicleType = String(formData.get("vehicleType") ?? "").trim() || null;
  const courierBio = String(formData.get("courierBio") ?? "").trim() || null;
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  let phone: string | null = null;
  if (phoneRaw.length > 0) {
    const parsed = normalizeTTPhone(phoneRaw);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    phone = parsed.normalized;
  }

  try {
    await prisma.user.update({
      where: { id: session.userId },
      data: { vehicleType, courierBio, phone },
    });
  } catch (e) {
    console.error("courier profile save error:", e);
    return { ok: false, error: "Failed to save" };
  }
  revalidatePath("/dashboard/courier");
  return { ok: true };
}
