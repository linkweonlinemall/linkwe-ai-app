"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function getCourierFinanceData() {
  const session = await getSession();
  if (!session || session.role !== "COURIER") redirect("/");

  const [ledgerEntries, payoutRequests, bankDetails] = await Promise.all([
    prisma.courierLedgerEntry.findMany({
      where: { courierId: session.userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.courierPayoutRequest.findMany({
      where: { courierId: session.userId },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.courierBankDetails.findUnique({
      where: { courierId: session.userId },
    }),
  ]);

  const totalEarnings = ledgerEntries
    .filter((e) => e.entryType === "PICKUP_EARNING")
    .reduce((s, e) => s + e.amountMinor, 0);

  const totalPaid = ledgerEntries
    .filter((e) => e.entryType === "PAYOUT")
    .reduce((s, e) => s + e.amountMinor, 0);

  const availableBalance = totalEarnings - totalPaid;

  return {
    ledgerEntries,
    payoutRequests,
    bankDetails,
    totalEarnings,
    totalPaid,
    availableBalance,
  };
}

export async function requestCourierPayout(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "COURIER") {
    return { ok: false, error: "unauthorized" };
  }

  const amountStr = String(formData.get("amountMinor") ?? "").trim();
  const amountMinor = parseInt(amountStr, 10);

  if (!amountMinor || amountMinor <= 0) {
    return { ok: false, error: "Invalid amount" };
  }

  if (amountMinor < 5000) {
    return { ok: false, error: "Minimum payout is TTD 50.00" };
  }

  const bankDetails = await prisma.courierBankDetails.findUnique({
    where: { courierId: session.userId },
  });

  if (!bankDetails) {
    return { ok: false, error: "Please add your bank details before requesting a payout" };
  }

  const existingPending = await prisma.courierPayoutRequest.findFirst({
    where: { courierId: session.userId, status: "PENDING" },
  });

  if (existingPending) {
    return { ok: false, error: "You already have a pending payout request" };
  }

  const ledger = await prisma.courierLedgerEntry.findMany({
    where: { courierId: session.userId },
    select: { amountMinor: true, entryType: true },
  });

  const earnings = ledger
    .filter((e) => e.entryType === "PICKUP_EARNING")
    .reduce((s, e) => s + e.amountMinor, 0);
  const paid = ledger
    .filter((e) => e.entryType === "PAYOUT")
    .reduce((s, e) => s + e.amountMinor, 0);
  const available = earnings - paid;

  if (amountMinor > available) {
    return { ok: false, error: "Amount exceeds available balance" };
  }

  await prisma.courierPayoutRequest.create({
    data: {
      courierId: session.userId,
      amountMinor,
      currency: "TTD",
      status: "PENDING",
    },
  });

  revalidatePath("/dashboard/courier");
  return { ok: true };
}
