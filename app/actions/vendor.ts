"use server";

import type { AccountType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function saveVendorBankDetails(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") {
    redirect("/");
  }

  const bankName = String(formData.get("bankName") ?? "").trim();
  const accountName = String(formData.get("accountName") ?? "").trim();
  const accountNumber = String(formData.get("accountNumber") ?? "").trim();
  const accountTypeRaw = String(formData.get("accountType") ?? "").trim();
  const accountType: AccountType | null =
    accountTypeRaw === "CHEQUING" || accountTypeRaw === "SAVINGS" ? accountTypeRaw : null;

  if (!bankName || !accountName || !accountNumber) {
    redirect("/dashboard/vendor?error=bank_fields_required");
  }

  await prisma.vendorBankDetails.upsert({
    where: { userId: session.userId },
    update: { bankName, accountName, accountNumber, accountType },
    create: { userId: session.userId, bankName, accountName, accountNumber, accountType },
  });

  redirect("/dashboard/vendor?success=bank_saved");
}

export async function requestPayout(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
}> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { ok: false, error: "unauthorized" };

  const amountStr = String(formData.get("amountMinor") ?? "").trim();
  const amountMinor = parseInt(amountStr, 10);

  if (!amountMinor || amountMinor <= 0) {
    return { ok: false, error: "Invalid amount" };
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: {
      id: true,
      owner: {
        select: {
          bankDetails: {
            select: { id: true },
          },
        },
      },
      ledgerEntries: {
        select: { amountMinor: true, entryType: true },
      },
      payoutRequests: {
        where: { status: "PENDING" },
        select: { id: true },
      },
    },
  });

  if (!store) return { ok: false, error: "Store not found" };
  if (!store.owner.bankDetails) {
    return { ok: false, error: "Please add your bank details before requesting a payout" };
  }
  if (store.payoutRequests.length > 0) return { ok: false, error: "You already have a pending payout request" };

  const credits = store.ledgerEntries
    .filter((e) => e.entryType === "CREDIT_ORDER_SETTLEMENT")
    .reduce((s, e) => s + e.amountMinor, 0);

  const debits = store.ledgerEntries
    .filter((e) => ["DEBIT_PLATFORM_FEE", "DEBIT_PAYOUT"].includes(e.entryType))
    .reduce((s, e) => s + e.amountMinor, 0);

  const availableBalance = credits - debits;

  if (amountMinor > availableBalance) {
    return { ok: false, error: "Amount exceeds available balance" };
  }

  if (amountMinor < 5000) {
    return { ok: false, error: "Minimum payout amount is TTD 50.00" };
  }

  await prisma.payoutRequest.create({
    data: {
      storeId: store.id,
      beneficiaryId: session.userId,
      amountMinor,
      currency: "TTD",
      status: "PENDING",
    },
  });

  revalidatePath("/dashboard/vendor");
  return { ok: true };
}
