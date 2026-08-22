"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AccountType } from "@prisma/client";

import { getSession } from "@/lib/auth/session";
import { saveKycDocumentUpload } from "@/lib/onboarding/save-kyc-upload";
import { prisma } from "@/lib/prisma";
import { getVendorReadiness } from "@/lib/vendor/readiness";

export async function uploadIdDocument(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") redirect("/login");

  const file = formData.get("idDocument") as File | null;
  const selfie = formData.get("selfieWithId") as File | null;
  if (!file || file.size === 0) return { ok: false as const, error: "No file provided" };
  if (!selfie || selfie.size === 0) {
    return { ok: false as const, error: "Upload a clear selfie holding the same ID" };
  }
  if (!selfie.type.startsWith("image/")) {
    return { ok: false as const, error: "The selfie must be an image" };
  }

  const saved = await saveKycDocumentUpload(file);
  if (!saved.ok) return { ok: false as const, error: saved.error };
  const savedSelfie = await saveKycDocumentUpload(selfie);
  if (!savedSelfie.ok) return { ok: false as const, error: savedSelfie.error };

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      idDocumentUrl: saved.publicPath,
      selfieWithIdUrl: savedSelfie.publicPath,
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
  const accountNumberSubmitted = String(formData.get("accountNumber") ?? "").trim();
  const accountType = String(formData.get("accountType") ?? "").trim();
  const normalizedAccountType: AccountType | null =
    accountType === "SAVINGS" || accountType === "CHEQUING" ? accountType : null;

  const existingBank = await prisma.vendorBankDetails.findUnique({
    where: { userId: session.userId },
    select: { accountNumber: true },
  });

  /** Empty field on update preserves the saved number — never overwrite with blank. */
  const accountNumber =
    accountNumberSubmitted || existingBank?.accountNumber?.trim() || "";

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
      accountType: normalizedAccountType,
    },
    update: {
      bankName,
      accountName,
      accountNumber,
      accountType: normalizedAccountType,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { idDocumentUrl: true, selfieWithIdUrl: true },
  });
  if (user?.idDocumentUrl && user.selfieWithIdUrl) {
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

  if (approve) {
    const vendor = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        idDocumentUrl: true,
        selfieWithIdUrl: true,
        phone: true,
        bankDetails: { select: { bankName: true, accountName: true, accountNumber: true } },
        storesOwned: {
          select: { logoUrl: true, description: true },
          take: 1,
        },
      },
    });
    if (!vendor) return { ok: false as const, error: "Vendor not found." };
    const readiness = getVendorReadiness({
      idDocumentUrl: vendor.idDocumentUrl,
      selfieWithIdUrl: vendor.selfieWithIdUrl,
      phone: vendor.phone,
      bankDetails: vendor.bankDetails,
      store: vendor.storesOwned[0] ?? null,
    });
    if (!readiness.ready) {
      return {
        ok: false as const,
        error: `Approval blocked. Missing: ${readiness.checks.filter((check) => !check.ok).map((check) => check.label).join(", ")}.`,
      };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      idVerificationStatus: approve ? "APPROVED" : "REJECTED",
      idVerifiedAt: approve ? new Date() : null,
      idVerifiedById: approve ? session.userId : null,
    },
  });

  if (!approve) {
    await prisma.store.updateMany({
      where: { ownerId: userId, status: "ACTIVE" },
      data: { status: "PENDING_APPROVAL" },
    });
  }

  return { ok: true as const };
}

export async function setStoreLive(
  storeId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { idVerificationStatus: true, emailVerified: true },
  });
  if (!user || user.idVerificationStatus !== "APPROVED") {
    return { ok: false as const, reason: "not_verified" };
  }
  if (!user.emailVerified) {
    return { ok: false as const, reason: "email_not_verified" };
  }

  const id = storeId.trim();
  if (!id) return { ok: false as const, reason: "missing_store" };

  const store = await prisma.store.findFirst({
    where: { id, ownerId: session.userId },
    select: { id: true, slug: true, status: true },
  });
  if (!store) return { ok: false as const, reason: "not_owner" };

  if (store.status !== "ACTIVE") {
    await prisma.store.update({
      where: { id: store.id },
      data: { status: "ACTIVE" },
    });
  }

  revalidatePath("/dashboard/vendor");
  revalidatePath("/dashboard/vendor/store/edit");
  if (store.slug) {
    revalidatePath(`/store/${store.slug}`);
  }

  return { ok: true as const };
}
