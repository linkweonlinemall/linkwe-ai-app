"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function updateCourierProfile(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "COURIER") {
    return { ok: false, error: "Unauthorized" };
  }
  console.log("courier session userId:", session.userId);
  const vehicleType = String(formData.get("vehicleType") ?? "").trim() || null;
  const courierBio = String(formData.get("courierBio") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  console.log("courier profile update:", { vehicleType, courierBio, phone });

  try {
    await prisma.user.update({
      where: { id: session.userId },
      data: { vehicleType, courierBio, phone },
    });
    console.log("courier profile saved successfully");
  } catch (e) {
    console.error("courier profile save error:", e);
    return { ok: false, error: "Failed to save" };
  }
  revalidatePath("/dashboard/courier");
  return { ok: true };
}
