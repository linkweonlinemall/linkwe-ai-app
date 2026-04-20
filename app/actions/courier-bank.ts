"use server";

import type { AccountType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function saveCourierBankDetails(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "COURIER") {
    redirect("/");
  }

  const bankName = String(formData.get("bankName") ?? "").trim();
  const accountName = String(formData.get("accountName") ?? "").trim();
  const accountNumber = String(formData.get("accountNumber") ?? "").trim();
  const accountTypeRaw = String(formData.get("accountType") ?? "").trim();

  if (!bankName || !accountName || !accountNumber || !accountTypeRaw) {
    redirect("/dashboard/courier/bank");
  }

  const accountType = accountTypeRaw as AccountType;
  if (accountType !== "CHEQUING" && accountType !== "SAVINGS") {
    redirect("/dashboard/courier/bank");
  }

  await prisma.courierBankDetails.upsert({
    where: { courierId: session.userId },
    update: { bankName, accountName, accountNumber, accountType },
    create: {
      courierId: session.userId,
      bankName,
      accountName,
      accountNumber,
      accountType,
    },
  });

  revalidatePath("/dashboard/courier/bank");
  redirect("/dashboard/courier");
}
