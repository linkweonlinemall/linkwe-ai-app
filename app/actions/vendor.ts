"use server";

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

  if (!bankName || !accountName || !accountNumber) {
    redirect("/dashboard/vendor?error=bank_fields_required");
  }

  await prisma.vendorBankDetails.upsert({
    where: { userId: session.userId },
    update: { bankName, accountName, accountNumber },
    create: { userId: session.userId, bankName, accountName, accountNumber },
  });

  redirect("/dashboard/vendor?success=bank_saved");
}
