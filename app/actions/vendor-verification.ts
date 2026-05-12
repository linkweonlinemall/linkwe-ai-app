"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { saveKycDocumentUpload } from "@/lib/onboarding/save-kyc-upload";
import { prisma } from "@/lib/prisma";

export async function uploadIdDocument(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") redirect("/login");

  const file = formData.get("idDocument") as File | null;
  if (!file || file.size === 0) return { ok: false as const, error: "No file provided" };

  const saved = await saveKycDocumentUpload(file);
  if (!saved.ok) return { ok: false as const, error: saved.error };

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      idDocumentUrl: saved.publicPath,
      idVerificationStatus: "PENDING",
    },
  });

  const bankDetails = await prisma.vendorBankDetails.findUnique({
    where: { userId: session.userId },
  });
  if (bankDetails) {
    await prisma.store.updateMany({
      where: { ownerId: session.userId },
      data: { status: "PENDING_APPROVAL" },
    });
  }

  return { ok: true as const };
}

export async function savePayoutDetails(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") redirect("/login");

  const bankName = String(formData.get("bankName") ?? "").trim();
  const accountName = String(formData.get("accountName") ?? "").trim();
  const accountNumber = String(formData.get("accountNumber") ?? "").trim();
  const accountType = String(formData.get("accountType") ?? "").trim();

  if (!bankName || !accountName || !accountNumber) {
    return { ok: false as const, error: "All payout fields are required" };
  }

  await prisma.vendorBankDetails.upsert({
    where: { userId: session.userId },
    create: {
      userId: session.userId,
      bankName,
      accountName,
      accountNumber,
      accountType: (accountType as any) || null,
    },
    update: {
      bankName,
      accountName,
      accountNumber,
      accountType: (accountType as any) || null,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { idDocumentUrl: true },
  });
  if (user?.idDocumentUrl) {
    await prisma.store.updateMany({
      where: { ownerId: session.userId },
      data: { status: "PENDING_APPROVAL" },
    });
  }

  revalidatePath("/dashboard/vendor");
  return { ok: true as const };
}

export async function adminVerifyId(userId: string, approve: boolean) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  await prisma.user.update({
    where: { id: userId },
    data: {
      idVerificationStatus: approve ? "APPROVED" : "REJECTED",
      idVerifiedAt: approve ? new Date() : null,
      idVerifiedById: approve ? session.userId : null,
    },
  });

  await prisma.store.updateMany({
    where: { ownerId: userId },
    data: { status: approve ? "ACTIVE" : "DRAFT" },
  });

  return { ok: true as const };
}
